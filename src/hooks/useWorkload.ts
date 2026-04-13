import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/** Weekly hours considered "full capacity" for utilization calculations */
export const DEFAULT_WEEKLY_CAPACITY = 40;

/**
 * Fallback estimated hours applied to each task when the task has no
 * explicit estimated_hours value (column added by migration; may be 0
 * on older rows or if the migration has not yet been applied).
 */
const DEFAULT_HOURS_PER_TASK = 2;

export interface WorkloadData {
  employee_id: string;
  display_name: string;
  avatar_url: string | null;
  position: string;
  active_tasks_count: number;
  /** Effective hours = sum of per-task hours (actual if set, else DEFAULT_HOURS_PER_TASK) */
  total_estimated_hours: number;
  /** (total_estimated_hours / DEFAULT_WEEKLY_CAPACITY) * 100, rounded to nearest integer */
  utilization_percentage: number;
}

export function useWorkload(startDate?: string, endDate?: string) {
  const now = new Date();
  const defaultStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const defaultEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const resolvedStart = startDate ?? defaultStart;
  const resolvedEnd = endDate ?? defaultEnd;

  const [data, setData] = useState<WorkloadData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // ── 1. Fetch TEAM MEMBERS only ─────────────────────────────────────
      //    • active = true  → not deactivated / no longer with the company
      //    • type  = 'fulltime' → internal staff only; excludes outsource /
      //      freelance workers (type = 'outsource') such as external contractors
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, name, avatar, position")
        .eq("active", true)
        .eq("type", "fulltime")
        .order("name", { ascending: true });

      if (empError) throw empError;

      // ── 2. Fetch active tasks (not Done) ───────────────────────────────
      //    We deliberately avoid selecting `estimated_hours` here so the
      //    query keeps working even when the migration has not been applied
      //    yet (adding the column is a separate migration step).
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, assigned_to, status, due_date")
        .neq("status", "Done");

      if (tasksError) throw tasksError;

      const activeTasks = tasks ?? [];

      // ── 3. Aggregate per employee ──────────────────────────────────────
      const workload: WorkloadData[] = (employees ?? []).map((emp) => {
        const myTasks = activeTasks.filter((task) => {
          const assignees: string[] = task.assigned_to ?? [];
          if (!assignees.includes(emp.name)) return false;

          // Respect the date window when a due_date is set
          if (task.due_date) {
            return (
              task.due_date >= resolvedStart &&
              task.due_date <= resolvedEnd
            );
          }
          // No due_date → always include (no deadline = always relevant)
          return true;
        });

        const totalHours = myTasks.length * DEFAULT_HOURS_PER_TASK;
        const utilization = Math.round(
          (totalHours / DEFAULT_WEEKLY_CAPACITY) * 100
        );

        return {
          employee_id: emp.id,
          display_name: emp.name,
          avatar_url: emp.avatar,
          position: emp.position ?? "",
          active_tasks_count: myTasks.length,
          total_estimated_hours: totalHours,
          utilization_percentage: utilization,
        };
      });

      // Sort: overloaded first → nearing limit → normal, then alphabetically
      workload.sort((a, b) => {
        if (b.utilization_percentage !== a.utilization_percentage) {
          return b.utilization_percentage - a.utilization_percentage;
        }
        return a.display_name.localeCompare(b.display_name);
      });

      setData(workload);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load workload data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [resolvedStart, resolvedEnd]);

  useEffect(() => {
    fetchWorkload();
  }, [fetchWorkload]);

  return { data, isLoading, error, refetch: fetchWorkload };
}

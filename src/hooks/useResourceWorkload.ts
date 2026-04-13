import { useState, useEffect, useCallback } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface WorkloadData {
  employee_id: string;
  employee_name: string;
  active_tasks_count: number;
  total_estimated_hours: number;
}

/**
 * Fetches resource workload by joining profiles + tasks client-side.
 * This avoids a dependency on the get_resource_workload RPC function
 * and works with the existing table structure.
 */
export function useResourceWorkload(startDate?: string, endDate?: string) {
  const defaultStart = format(new Date(), "yyyy-MM-dd");
  const defaultEnd = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const resolvedStart = startDate ?? defaultStart;
  const resolvedEnd = endDate ?? defaultEnd;

  const [data, setData] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch approved profiles (employees with accounts)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("is_approved", true);

      if (profilesError) throw profilesError;

      // 2. Fetch all active tasks (not Done) — only columns we need
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, assigned_to, status, due_date")
        .neq("status", "Done");

      if (tasksError) throw tasksError;

      const activeTasks = tasks ?? [];

      // 3. Aggregate per employee, matching on display_name inside assigned_to[]
      const workload: WorkloadData[] = (profiles ?? [])
        .map((profile) => {
          const count = activeTasks.filter((task) => {
            const assignees: string[] = task.assigned_to ?? [];
            if (!assignees.includes(profile.display_name)) return false;

            // Filter by date window when due_date is present
            if (task.due_date) {
              return task.due_date >= resolvedStart && task.due_date <= resolvedEnd;
            }
            // Tasks with no due_date are always included
            return true;
          }).length;

          return {
            employee_id: profile.user_id,
            employee_name: profile.display_name,
            active_tasks_count: count,
            total_estimated_hours: 0,
          };
        })
        .sort((a, b) => b.active_tasks_count - a.active_tasks_count);

      setData(workload);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load workload data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resolvedStart, resolvedEnd]);

  useEffect(() => {
    fetchWorkload();
  }, [fetchWorkload]);

  return { data, loading, error, refetch: fetchWorkload };
}

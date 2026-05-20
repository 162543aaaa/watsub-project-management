import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const DEFAULT_WEEKLY_CAPACITY = 40;
// ปรับลด Default ลงกรณีที่ไม่ได้กรอกเวลา เพื่อไม่ให้กราฟบวมเกินจริง
const DEFAULT_HOURS_PER_TASK = 1;
const HOURS_PER_LEAVE_DAY = 8;

type TaskRow = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  "id" | "name" | "assigned_to" | "status" | "due_date" | "estimated_hours" | "priority"
>;

type EmployeeRow = Pick<
  Database["public"]["Tables"]["employees"]["Row"],
  "id" | "name" | "avatar" | "position"
>;

type LeaveRow = Pick<
  Database["public"]["Tables"]["leave_requests"]["Row"],
  "requested_by" | "leave_start" | "leave_end" | "status"
>;

export interface WorkloadData {
  employee_id: string;
  display_name: string;
  avatar_url: string | null;
  position: string;
  active_tasks_count: number;
  total_estimated_hours: number;
  utilization_percentage: number;
  tasks: TaskRow[];
}

function overlapsDateRange(
  leaveStart: string,
  leaveEnd: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  return !(leaveEnd < rangeStart || leaveStart > rangeEnd);
}

function getLeaveDaysInRange(
  leaveStart: string,
  leaveEnd: string,
  rangeStart: string,
  rangeEnd: string,
): number {
  const start = new Date(`${leaveStart}T00:00:00`);
  const end = new Date(`${leaveEnd}T00:00:00`);
  const windowStart = new Date(`${rangeStart}T00:00:00`);
  const windowEnd = new Date(`${rangeEnd}T00:00:00`);

  const actualStart = start > windowStart ? start : windowStart;
  const actualEnd = end < windowEnd ? end : windowEnd;

  const diffMs = actualEnd.getTime() - actualStart.getTime();
  if (diffMs < 0) return 0;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
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
      // 1. Fetch Employees
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, name, avatar, position")
        .order("name", { ascending: true });

      if (empError) throw empError;

      // 2. Fetch Tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, assigned_to, status, due_date, estimated_hours, priority")
        .neq("status", "Done");

      if (tasksError) throw tasksError;

      // 3. Optional prep for Dynamic Capacity:
      //    subtract approved leave hours from weekly capacity if leave rows exist.
      const { data: leaves, error: leavesError } = await supabase
        .from("leave_requests")
        .select("requested_by, leave_start, leave_end, status")
        .eq("status", "Approved")
        .lte("leave_start", resolvedEnd)
        .gte("leave_end", resolvedStart);

      // If leave table/policy is unavailable in some environments, continue safely.
      if (leavesError) {
        console.warn("Leave capacity adjustment skipped:", leavesError.message);
      }

      const activeTasks: TaskRow[] = (tasks ?? []) as TaskRow[];
      const approvedLeaves: LeaveRow[] = (leaves ?? []) as LeaveRow[];

      // Filter active employees client-side to prevent PostgREST schema cache errors
      const activeEmployees = ((employees ?? []) as any[]).filter(emp => emp.is_archived !== true);

      // 4. Aggregate per employee
      const workload: WorkloadData[] = activeEmployees.map((emp) => {
        const myTasks = activeTasks.filter((task) => {
          const assignees: string[] = task.assigned_to ?? [];
          if (!assignees.includes(emp.name)) return false;

          // ถ้ามี Date ให้อยู่ในกรอบเวลาที่เลือก
          if (task.due_date) {
            return task.due_date >= resolvedStart && task.due_date <= resolvedEnd;
          }

          // ถ้าไม่มี Due Date (งาน Backlog) ให้ข้ามไปก่อนเพื่อไม่ให้กระทบ Capacity สัปดาห์นี้
          return false;
        });

        const totalHours = myTasks.reduce((sum, task) => {
          return sum + (task.estimated_hours ?? DEFAULT_HOURS_PER_TASK);
        }, 0);

        const leaveDays = approvedLeaves.reduce((sum, leave) => {
          if (leave.requested_by !== emp.name) return sum;
          if (!overlapsDateRange(leave.leave_start, leave.leave_end, resolvedStart, resolvedEnd)) {
            return sum;
          }

          return sum + getLeaveDaysInRange(leave.leave_start, leave.leave_end, resolvedStart, resolvedEnd);
        }, 0);

        const dynamicCapacity = Math.max(DEFAULT_WEEKLY_CAPACITY - leaveDays * HOURS_PER_LEAVE_DAY, 1);
        const utilization = Math.round((totalHours / dynamicCapacity) * 100);

        return {
          employee_id: emp.id,
          display_name: emp.name,
          avatar_url: emp.avatar,
          position: emp.position ?? "",
          active_tasks_count: myTasks.length,
          total_estimated_hours: totalHours,
          utilization_percentage: utilization,
          tasks: myTasks,
        };
      });

      // Sort
      workload.sort((a, b) => {
        if (b.utilization_percentage !== a.utilization_percentage) {
          return b.utilization_percentage - a.utilization_percentage;
        }
        return a.display_name.localeCompare(b.display_name);
      });

      setData(workload);
    } catch (err: any) {
      console.error("Workload fetch error:", err);
      setError(err?.message || "Failed to load workload data");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedStart, resolvedEnd]);

  useEffect(() => {
    fetchWorkload();
  }, [fetchWorkload]);

  return { data, isLoading, error, refetch: fetchWorkload };
}

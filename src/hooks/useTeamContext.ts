import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TeamContext, EmployeeWorkload } from "@/types/ai";

const TEAM_CONTEXT_KEY = "team-context";

export function useTeamContext() {
  return useQuery({
    queryKey: [TEAM_CONTEXT_KEY],
    queryFn: async (): Promise<TeamContext> => {
      const [{ data: employees, error: empError }, { data: tasks, error: taskError }] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id, name, position, role")
            .order("name"),
          supabase
            .from("tasks")
            .select("id, name, status, priority, assigned_to, due_date")
            .in("status", ["In Progress", "To Do"]),
        ]);

      if (empError) throw empError;
      if (taskError) throw taskError;

      const empList = employees ?? [];
      const taskList = tasks ?? [];

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Build per-employee workload map
      const workloadMap = new Map<string, EmployeeWorkload>();
      for (const emp of empList) {
        workloadMap.set(emp.id, {
          employeeId: emp.id,
          employeeName: emp.name,
          position: emp.position,
          inProgressCount: 0,
          todoCount: 0,
          totalActive: 0,
          tasks: [],
        });
      }

      const overdueTasks: TeamContext["overdueTasks"] = [];
      const urgentTasks: TeamContext["urgentTasks"] = [];
      let unassignedTaskCount = 0;

      for (const task of taskList) {
        const assignees: string[] = Array.isArray(task.assigned_to) ? task.assigned_to : [];

        // Workload aggregation
        if (assignees.length === 0) {
          unassignedTaskCount++;
        } else {
          for (const empId of assignees) {
            const wl = workloadMap.get(empId);
            if (wl) {
              wl.tasks.push({
                id: task.id,
                name: task.name,
                status: task.status,
                priority: task.priority,
                due_date: task.due_date,
              });
              if (task.status === "In Progress") wl.inProgressCount++;
              else wl.todoCount++;
              wl.totalActive++;
            }
          }
        }

        // Due date classification
        if (task.due_date) {
          const due = new Date(task.due_date);
          due.setHours(0, 0, 0, 0);

          const resolvedAssignees = assignees.map((id) => {
            const emp = empList.find((e) => e.id === id);
            return emp ? emp.name : id;
          });

          if (due < now) {
            const daysOverdue = Math.floor(
              (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
            );
            overdueTasks.push({
              id: task.id,
              name: task.name,
              dueDate: task.due_date,
              assignees: resolvedAssignees,
              priority: task.priority,
              daysOverdue,
            });
          } else if (due <= threeDaysFromNow) {
            const daysUntilDue = Math.floor(
              (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            urgentTasks.push({
              id: task.id,
              name: task.name,
              dueDate: task.due_date,
              assignees: resolvedAssignees,
              priority: task.priority,
              daysUntilDue,
            });
          }
        }
      }

      const workloads = Array.from(workloadMap.values());
      const overloadedEmployees = workloads
        .filter((w) => w.inProgressCount > 5)
        .map((w) => w.employeeName);

      return {
        generatedAt: new Date().toISOString(),
        totalEmployees: empList.length,
        workloads,
        overdueTasks,
        urgentTasks,
        summary: {
          overdueCount: overdueTasks.length,
          urgentCount: urgentTasks.length,
          overloadedEmployees,
          unassignedTaskCount,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

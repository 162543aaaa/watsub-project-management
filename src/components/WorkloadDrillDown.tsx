import { useEffect, useState } from "react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { WorkloadData } from "@/hooks/useWorkload";

type EmployeeOption = Pick<
  Database["public"]["Tables"]["employees"]["Row"],
  "id" | "name"
>;

interface WorkloadDrillDownProps {
  isOpen: boolean;
  onClose: () => void;
  employee: WorkloadData | null;
  onTaskReassigned?: () => Promise<void> | void;
}

export default function WorkloadDrillDown({
  isOpen,
  onClose,
  employee,
  onTaskReassigned,
}: WorkloadDrillDownProps) {
  const [teamMembers, setTeamMembers] = useState<EmployeeOption[]>([]);
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<WorkloadData["tasks"]>([]);

  useEffect(() => {
    setTasks(employee?.tasks ?? []);
  }, [employee]);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .eq("active", true)
        .eq("type", "fulltime")
        .or("is_archived.is.null,is_archived.eq.false")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load team members:", error.message);
        return;
      }

      setTeamMembers((data ?? []) as EmployeeOption[]);
    };

    fetchMembers();
  }, []);


  const handleReassign = async (taskId: string, nextAssigneeId: string) => {
    if (!employee) return;

    const nextAssignee = teamMembers.find((member) => member.id === nextAssigneeId);
    if (!nextAssignee) return;

    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const prevAssignees = task.assigned_to ?? [];
    const nextAssignees = prevAssignees.includes(employee.display_name)
      ? prevAssignees.map((name) => (name === employee.display_name ? nextAssignee.name : name))
      : [...prevAssignees, nextAssignee.name];

    setIsUpdatingTaskId(taskId);
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: nextAssignees })
      .eq("id", taskId);

    if (error) {
      console.error("Failed to reassign task:", error.message);
      setIsUpdatingTaskId(null);
      return;
    }

    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    setIsUpdatingTaskId(null);
    await onTaskReassigned?.();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Workload Drill-Down</SheetTitle>
          <SheetDescription>Inspect tasks and rebalance assignments quickly.</SheetDescription>
        </SheetHeader>

        {!employee ? (
          <p className="mt-6 text-sm text-muted-foreground">Select an employee to view workload details.</p>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={employee.display_name} avatar={employee.avatar_url} size="lg" />
                <div>
                  <p className="font-semibold text-foreground">{employee.display_name}</p>
                  <p className="text-xs text-muted-foreground">{employee.position || "Team Member"}</p>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">Utilization: </span>
                <span className="font-bold text-foreground">{employee.utilization_percentage}%</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Tasks in selected period ({tasks.length})</h3>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active tasks in this date range.</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-border p-3 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{task.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: {task.status} · Due: {task.due_date ?? "No due date"} · Est: {task.estimated_hours ?? 0}h
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          disabled={isUpdatingTaskId === task.id}
                          onValueChange={(memberId) => void handleReassign(task.id, memberId)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Reassign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers
                              .filter((member) => member.name !== employee.display_name)
                              .map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="whitespace-nowrap"
                          title="Use dropdown to reassign"
                        >
                          Reassign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

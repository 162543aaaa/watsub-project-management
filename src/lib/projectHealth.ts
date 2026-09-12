import type { Project, Task } from "@/hooks/useProjects";

export type HealthStatus = "on-track" | "at-risk" | "delayed" | "complete";

export interface DeliveryHealth {
  status: HealthStatus;
  completion: number;
  overdueTasks: number;
  highPriorityOverdue: number;
  daysRemaining: number | null;
  reasons: string[];
}

const DAY_MS = 86_400_000;

function dayStart(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function calculateDeliveryHealth(
  tasks: Task[],
  deadline?: string | null,
  now: Date = new Date(),
): DeliveryHealth {
  const today = dayStart(now);
  const done = tasks.filter((task) => task.status === "Done").length;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const overdue = tasks.filter((task) => task.status !== "Done" && task.due_date && dayStart(task.due_date) < today);
  const highPriorityOverdue = overdue.filter((task) => task.priority === "High").length;
  const isComplete = tasks.length > 0 && done === tasks.length;
  const daysRemaining = deadline
    ? Math.ceil((dayStart(deadline) - today) / DAY_MS)
    : null;

  if (isComplete) {
    return { status: "complete", completion: 100, overdueTasks: 0, highPriorityOverdue: 0, daysRemaining, reasons: ["All tasks completed"] };
  }

  if (daysRemaining !== null && daysRemaining < 0) {
    return {
      status: "delayed",
      completion,
      overdueTasks: overdue.length,
      highPriorityOverdue,
      daysRemaining,
      reasons: [`${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} past deadline`],
    };
  }

  const reasons: string[] = [];
  if (overdue.length > 0) reasons.push(`${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`);
  if (highPriorityOverdue > 0) reasons.push(`${highPriorityOverdue} high-priority task${highPriorityOverdue === 1 ? "" : "s"} overdue`);
  if (daysRemaining !== null && daysRemaining <= 7 && completion < 80) {
    reasons.push(`Deadline in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} with ${completion}% completion`);
  }

  return {
    status: reasons.length > 0 ? "at-risk" : "on-track",
    completion,
    overdueTasks: overdue.length,
    highPriorityOverdue,
    daysRemaining,
    reasons: reasons.length > 0 ? reasons : [deadline ? "No current risk signals" : "No deadline set and no overdue tasks"],
  };
}

export function calculateProjectHealth(project: Pick<Project, "tasks" | "deadline">, now?: Date): DeliveryHealth {
  return calculateDeliveryHealth(project.tasks, project.deadline, now);
}

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  delayed: "Delayed",
  complete: "Complete",
};

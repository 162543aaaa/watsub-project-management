import type { Task } from "@/hooks/useProjects";

/**
 * Returns tasks with status === "Done" removed when showDone is false.
 * When showDone is true the input array is returned as-is.
 * Display-only — never mutates the underlying list.
 */
export function filterDoneTasks<T extends Pick<Task, "status">>(
  tasks: T[],
  showDone: boolean,
): T[] {
  if (showDone) return tasks;
  return tasks.filter((t) => t.status !== "Done");
}
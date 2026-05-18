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

/**
 * Hide Done tasks older than `days` from display only. Tasks without a
 * date are kept. Set `days` to 0 or null to disable. Display-only.
 */
export function filterDoneByAge<
  T extends Pick<Task, "status"> & { due_date?: string; created_at?: string },
>(tasks: T[], days: number | null): T[] {
  if (!days || days <= 0) return tasks;
  const cutoff = Date.now() - days * 86400_000;
  return tasks.filter((t) => {
    if (t.status !== "Done") return true;
    const ref = t.due_date || t.created_at;
    if (!ref) return true;
    const ts = new Date(ref).getTime();
    if (Number.isNaN(ts)) return true;
    return ts >= cutoff;
  });
}
import { describe, it, expect } from "vitest";
import { bucketMyTasks, type EnrichedTask } from "@/lib/myWorkAggregation";

const NOW = new Date("2026-05-18T12:00:00Z");

function make(p: Partial<EnrichedTask>): EnrichedTask {
  return {
    id: p.id || Math.random().toString(),
    name: p.name || "task",
    status: p.status || "To Do",
    priority: p.priority || "Medium",
    assigned_to: p.assigned_to || [],
    task_type: p.task_type || "standalone",
    _source: p._source || "standalone",
    ...p,
  } as EnrichedTask;
}

describe("bucketMyTasks", () => {
  it("buckets by due date relative to now", () => {
    const tasks = [
      make({ id: "a", due_date: "2026-05-10", status: "To Do" }),       // overdue
      make({ id: "b", due_date: "2026-05-18", status: "To Do" }),       // today
      make({ id: "c", due_date: "2026-05-22", status: "To Do" }),       // due soon
      make({ id: "d", status: "In Progress", link: "http://x" }),       // inProgress
      make({ id: "e", status: "Done", due_date: "2026-05-15" }),        // recently completed
      make({ id: "f", status: "In Progress" }),                          // waiting evidence
    ];
    const r = bucketMyTasks(tasks, NOW);
    expect(r.overdue.map(t => t.id)).toEqual(["a"]);
    expect(r.today.map(t => t.id)).toEqual(["b"]);
    expect(r.dueSoon.map(t => t.id)).toEqual(["c"]);
    expect(r.inProgress.map(t => t.id)).toEqual(["d", "f"]);
    expect(r.recentlyCompleted.map(t => t.id)).toEqual(["e"]);
    expect(r.waitingEvidence.map(t => t.id)).toEqual(["f"]);
  });

  it("excludes Done tasks from active buckets", () => {
    const r = bucketMyTasks([make({ id: "z", status: "Done", due_date: "2026-05-10" })], NOW);
    expect(r.overdue).toHaveLength(0);
    expect(r.recentlyCompleted).toHaveLength(1);
  });
});

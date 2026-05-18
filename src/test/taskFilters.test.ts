import { describe, it, expect } from "vitest";
import { filterDoneTasks, filterDoneByAge } from "@/lib/taskFilters";

const tasks = [
  { id: "1", status: "To Do" as const },
  { id: "2", status: "In Progress" as const },
  { id: "3", status: "Done" as const },
  { id: "4", status: "Done" as const },
];

describe("filterDoneTasks", () => {
  it("returns all tasks when showDone is true", () => {
    expect(filterDoneTasks(tasks, true)).toHaveLength(4);
  });

  it("removes Done tasks when showDone is false", () => {
    const result = filterDoneTasks(tasks, false);
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status !== "Done")).toBe(true);
  });

  it("does not mutate the input array", () => {
    const input = [...tasks];
    filterDoneTasks(input, false);
    expect(input).toHaveLength(4);
  });

  it("handles an empty array", () => {
    expect(filterDoneTasks([], false)).toEqual([]);
    expect(filterDoneTasks([], true)).toEqual([]);
  });
});

describe("filterDoneByAge", () => {
  const old = new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10);
  const recent = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);
  const items = [
    { id: "1", status: "To Do" as const, due_date: old },
    { id: "2", status: "Done" as const, due_date: old },
    { id: "3", status: "Done" as const, due_date: recent },
  ];
  it("keeps everything when days is 0/null", () => {
    expect(filterDoneByAge(items, 0)).toHaveLength(3);
    expect(filterDoneByAge(items, null)).toHaveLength(3);
  });
  it("hides old Done tasks but keeps active old tasks and recent Done", () => {
    const r = filterDoneByAge(items, 14);
    expect(r.map((t) => t.id)).toEqual(["1", "3"]);
  });
});
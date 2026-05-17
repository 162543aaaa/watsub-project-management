import { describe, it, expect } from "vitest";
import { filterDoneTasks } from "@/lib/taskFilters";

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
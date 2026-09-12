import { describe, expect, it } from "vitest";
import { changedActivityFields, describeActivity } from "@/lib/activityDescription";

describe("activityDescription", () => {
  it("supports legacy INSERT actions", () => {
    expect(describeActivity({
      action: "INSERT",
      old_values: null,
      new_values: { name: "Launch" },
      display_name: "Tarmisi",
    }, "project")).toBe("Tarmisi created this project");
  });

  it("describes status transitions", () => {
    expect(describeActivity({
      action: "status_changed:To Do→In Progress",
      old_values: { status: "To Do" },
      new_values: { status: "In Progress" },
      display_name: "Hafiz",
    }, "task")).toContain("To Do");
  });

  it("ignores audit metadata when finding changes", () => {
    const fields = changedActivityFields({
      action: "updated",
      old_values: { name: "A", updated_at: "old", sort_order: 1 },
      new_values: { name: "B", updated_at: "new", sort_order: 2 },
    });
    expect(fields).toEqual(["name"]);
  });

  it("describes multiple changed fields", () => {
    const text = describeActivity({
      action: "UPDATE",
      old_values: { assigned_to: ["A"], due_date: "2026-09-12" },
      new_values: { assigned_to: ["A", "B"], due_date: "2026-09-14" },
      display_name: "System",
    }, "task");
    expect(text).toContain("assignees");
    expect(text).toContain("due date");
  });
});

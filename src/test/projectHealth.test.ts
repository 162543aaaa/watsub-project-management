import { describe, expect, it } from "vitest";
import { calculateDeliveryHealth } from "@/lib/projectHealth";
import type { Task } from "@/hooks/useProjects";

const task = (overrides: Partial<Task>): Task => ({
  id: crypto.randomUUID(),
  name: "Task",
  status: "To Do",
  priority: "Medium",
  assigned_to: [],
  task_type: "project",
  ...overrides,
});

describe("calculateDeliveryHealth", () => {
  const now = new Date("2026-09-12T12:00:00+07:00");

  it("marks a finished delivery complete", () => {
    const result = calculateDeliveryHealth([task({ status: "Done" })], "2026-09-10", now);
    expect(result.status).toBe("complete");
    expect(result.completion).toBe(100);
  });

  it("marks unfinished work after deadline delayed", () => {
    const result = calculateDeliveryHealth([task({ status: "In Progress" })], "2026-09-10", now);
    expect(result.status).toBe("delayed");
    expect(result.daysRemaining).toBeLessThan(0);
  });

  it("marks overdue work at risk before project deadline", () => {
    const result = calculateDeliveryHealth(
      [task({ due_date: "2026-09-11", priority: "High" })],
      "2026-09-30",
      now,
    );
    expect(result.status).toBe("at-risk");
    expect(result.overdueTasks).toBe(1);
    expect(result.highPriorityOverdue).toBe(1);
  });

  it("marks low completion near deadline at risk", () => {
    const result = calculateDeliveryHealth(
      [task({ status: "Done" }), task({}), task({}), task({})],
      "2026-09-17",
      now,
    );
    expect(result.status).toBe("at-risk");
    expect(result.completion).toBe(25);
  });

  it("marks healthy work on track", () => {
    const result = calculateDeliveryHealth(
      [task({ status: "Done" }), task({ status: "In Progress", due_date: "2026-09-20" })],
      "2026-09-30",
      now,
    );
    expect(result.status).toBe("on-track");
  });
});

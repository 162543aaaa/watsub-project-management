import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR_VISIBILITY, filterVisibleCalendarItems, hasHiddenCalendarTypes } from "@/lib/calendarVisibility";

const items = [
  { id: "t", type: "task" as const },
  { id: "p", type: "project" as const },
  { id: "m", type: "meeting" as const },
  { id: "o", type: "onsite" as const },
  { id: "l", type: "leave" as const },
  { id: "h", type: "holiday" as const },
];

describe("calendar visibility", () => {
  it("shows every event type by default", () => {
    expect(filterVisibleCalendarItems(items, DEFAULT_CALENDAR_VISIBILITY)).toHaveLength(6);
    expect(hasHiddenCalendarTypes(DEFAULT_CALENDAR_VISIBILITY)).toBe(false);
  });

  it("can hide one type independently", () => {
    const visibility = { ...DEFAULT_CALENDAR_VISIBILITY, meeting: false };
    expect(filterVisibleCalendarItems(items, visibility).map((item) => item.type)).not.toContain("meeting");
    expect(filterVisibleCalendarItems(items, visibility)).toHaveLength(5);
    expect(hasHiddenCalendarTypes(visibility)).toBe(true);
  });
});

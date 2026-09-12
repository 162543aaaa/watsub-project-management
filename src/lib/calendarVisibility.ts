export type CalendarVisibilityType = "task" | "project" | "meeting" | "onsite" | "holiday" | "leave";

export const DEFAULT_CALENDAR_VISIBILITY: Record<CalendarVisibilityType, boolean> = {
  task: true,
  project: true,
  meeting: true,
  onsite: true,
  holiday: true,
  leave: true,
};

export function filterVisibleCalendarItems<T extends { type: CalendarVisibilityType }>(
  items: T[],
  visibility: Record<CalendarVisibilityType, boolean>,
): T[] {
  return items.filter((item) => visibility[item.type]);
}

export function hasHiddenCalendarTypes(visibility: Record<CalendarVisibilityType, boolean>): boolean {
  return Object.values(visibility).some((value) => !value);
}

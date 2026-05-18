import { describe, expect, it } from "vitest";
import { isPageAllowed, normalizeAllowedPages } from "@/lib/pageAccess";

describe("pageAccess", () => {
  it("normalizes and deduplicates allowed pages", () => {
    expect(normalizeAllowedPages([" /tasks ", "", "tasks", " /tasks"]))
      .toEqual(["/tasks"]);
  });

  it("allows wildcard", () => {
    expect(isPageAllowed("/dashboard", ["*"])).toBe(true);
  });

  it("matches exact and nested path only for the same configured page", () => {
    expect(isPageAllowed("/kpi/report", ["/kpi/report"])).toBe(true);
    expect(isPageAllowed("/kpi/report/abc", ["/kpi/report"])).toBe(true);
    expect(isPageAllowed("/kpi/dashboard", ["/kpi/report"])).toBe(false);
  });
});

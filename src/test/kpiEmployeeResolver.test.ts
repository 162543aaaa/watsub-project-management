import { describe, expect, it } from "vitest";
import { resolveKpiEmployee } from "@/lib/kpiEmployeeResolver";

const employees = [
  { id: "email-match", name: "Roster Name", email: "roster@example.com", position: "", role: "employee" },
  { id: "name-match", name: "Legacy Member", email: "legacy-roster@example.com", position: "", role: "employee" },
];

describe("resolveKpiEmployee", () => {
  it("prefers a case-insensitive email match", () => {
    expect(resolveKpiEmployee({ email: " ROSTER@example.com " }, employees)?.id).toBe("email-match");
  });

  it("matches a legacy KPI account by its profile display name when emails differ", () => {
    expect(resolveKpiEmployee({ email: "different-login@example.com", profileDisplayName: " legacy member " }, employees)?.id).toBe("name-match");
  });

  it("does not resolve an account without a matching employee identity", () => {
    expect(resolveKpiEmployee({ email: "unknown@example.com", profileDisplayName: "Unknown" }, employees)).toBeNull();
  });

  it("does not use an ambiguous display name", () => {
    expect(resolveKpiEmployee(
      { profileDisplayName: "Duplicate" },
      [...employees, { id: "duplicate-1", name: "Duplicate", email: "one@example.com", position: "", role: "employee" }, { id: "duplicate-2", name: "Duplicate", email: "two@example.com", position: "", role: "employee" }],
    )).toBeNull();
  });
});

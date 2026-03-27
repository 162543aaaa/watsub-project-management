import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEAM_ROSTER } from "@/config/teamRoster";

const repoFile = (...parts: string[]) =>
  readFileSync(join(process.cwd(), ...parts), "utf8");

describe("team roster consistency (closing pass)", () => {
  it("has unique names/emails in canonical roster", () => {
    const names = TEAM_ROSTER.map((m) => m.name.toLowerCase());
    const emails = TEAM_ROSTER.map((m) => m.email.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("seedDatabase uses canonical roster import", () => {
    const content = repoFile("src", "lib", "seedDatabase.ts");
    expect(content).toContain('import { TEAM_ROSTER } from "@/config/teamRoster";');
    expect(content).toContain('.insert(TEAM_ROSTER)');
  });

  it("mockData derives employees from canonical roster", () => {
    const content = repoFile("src", "data", "mockData.ts");
    expect(content).toContain('import { TEAM_ROSTER } from "@/config/teamRoster";');
    expect(content).toContain('export const employees: Employee[] = TEAM_ROSTER.map');
  });

  it("full KPI roster migration contains all canonical names", () => {
    const migration = repoFile("supabase", "migrations", "20260327014500_seed_full_kpi_team.sql");
    for (const member of TEAM_ROSTER) {
      expect(migration).toContain(member.name);
    }
  });
});

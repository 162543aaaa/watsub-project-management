// Per-role KPI form configs: 3 roles × 3 reviewer types = 9 forms

export type RoleKey = "ta" | "hafeez" | "sumayna";
export type ReviewerType = "self" | "peer" | "supervisor";

// Section weights per role (job_performance / competency / teamwork / leadership)
export const ROLE_WEIGHTS: Record<RoleKey, Record<string, number>> = {
  ta:      { job_performance: 20, competency: 20, teamwork: 20, leadership: 40 },
  hafeez:  { job_performance: 40, competency: 35, teamwork: 15, leadership: 10 },
  sumayna: { job_performance: 35, competency: 30, teamwork: 25, leadership: 10 },
};

// Reviewer contribution weights
export const REVIEWER_WEIGHTS = { auto: 0.30, self: 0.10, peer: 0.20, supervisor: 0.40 };

/** Map employee name (case-insensitive) to a RoleKey */
export function resolveRoleKey(name: string): RoleKey | null {
  const n = name.toLowerCase().trim();
  if (n === "ta" || n.startsWith("ta ") || n.endsWith(" ta")) return "ta";
  if (n.includes("hafeez")) return "hafeez";
  if (n.includes("sumayna")) return "sumayna";
  return null;
}

/** Which sections a reviewer can rate for a given evaluatee role */
export function getVisibleSections(roleKey: RoleKey | null, reviewer: ReviewerType): string[] {
  // Peers don't rate leadership for "ta" role (leadership is self/supervisor only)
  if (reviewer === "peer" && roleKey === "ta") {
    return ["job_performance", "competency", "teamwork"];
  }
  return ["job_performance", "competency", "teamwork", "leadership"];
}

/** Whether auto stats should be visible */
export function showAutoStats(reviewer: ReviewerType): boolean {
  return reviewer === "self" || reviewer === "supervisor";
}

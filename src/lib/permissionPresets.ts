/**
 * Layered permission presets. Maps a preset key to the list of pages
 * stored in profiles.allowed_pages. The preset is derived from the
 * stored array (no DB column needed), and admins can still tick pages
 * manually after applying a preset.
 */
export type PermissionPreset =
  | "admin_full"
  | "manager"
  | "core_team"
  | "finance"
  | "viewer"
  | "intern"
  | "custom";

export interface PresetDefinition {
  key: PermissionPreset;
  label: string;
  description: string;
  pages: string[];
}

export const PRESETS: PresetDefinition[] = [
  {
    key: "admin_full",
    label: "Admin / Full Access",
    description: "Every page",
    pages: ["*"],
  },
  {
    key: "manager",
    label: "Manager",
    description: "Full operational access incl. dashboards & reports",
    pages: [
      "/", "/tasks", "/projects", "/customers", "/calendar", "/my-work",
      "/team", "/workload", "/organization", "/wiki", "/meetings",
      "/onsite-work", "/leave", "/okrs", "/reports", "/budget",
      "/notifications", "/manager", "/kpi/overview", "/kpi/evaluate",
      "/kpi/report",
    ],
  },
  {
    key: "core_team",
    label: "Core Team",
    description: "Day-to-day team access",
    pages: [
      "/", "/tasks", "/projects", "/customers", "/calendar", "/my-work",
      "/wiki", "/meetings", "/onsite-work", "/leave", "/notifications",
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Budget, reports, customers",
    pages: [
      "/", "/budget", "/reports", "/customers", "/projects",
      "/my-work", "/notifications",
    ],
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Read-only overview pages",
    pages: ["/", "/projects", "/customers", "/wiki", "/calendar"],
  },
  {
    key: "intern",
    label: "Intern",
    description: "Limited access for interns",
    pages: ["/my-work", "/tasks", "/calendar", "/notifications"],
  },
];

function eqSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

/** Infer which preset (if any) matches the given allowed_pages list. */
export function detectPreset(allowedPages: string[]): PermissionPreset {
  if (allowedPages.includes("*")) return "admin_full";
  for (const p of PRESETS) {
    if (p.key === "admin_full") continue;
    if (eqSet(p.pages, allowedPages)) return p.key;
  }
  return "custom";
}

export function presetLabel(key: PermissionPreset): string {
  if (key === "custom") return "Custom";
  return PRESETS.find((p) => p.key === key)?.label ?? "Custom";
}
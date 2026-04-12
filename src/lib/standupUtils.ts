import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandupTask {
  id: string;
  name: string;
  priority?: string;
}

export interface StandupData {
  employeeName: string;
  completedYesterday: StandupTask[];
  dueToday: StandupTask[];
  overdue: Array<StandupTask & { daysOverdue: number }>;
  generatedAt: string;
}

export interface StandupResult {
  summary: string;
  data: StandupData;
}

// ---------------------------------------------------------------------------
// generateDailyStandup
//
// Queries Supabase for:
//   - Tasks updated to "Done" in the last 24 hours for the given employee
//   - Tasks whose due_date is today and are not yet Done
//   - Tasks that are overdue (due_date < today, status !== Done)
//
// Returns a formatted markdown summary string plus the raw data.
// ---------------------------------------------------------------------------

export async function generateDailyStandup(
  employeeName: string,
): Promise<StandupResult> {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

  // Yesterday midnight — 24 h window for "completed yesterday"
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Tasks completed in the last 24 hours ──────────────────────────────
  const completedRes = await supabase
    .from("tasks")
    .select("id, name, priority")
    .eq("status", "Done")
    .contains("assigned_to", [employeeName])
    .gte("updated_at", twentyFourHoursAgo);

  // ── 2. Tasks due today (not done) ────────────────────────────────────────
  const dueTodayRes = await supabase
    .from("tasks")
    .select("id, name, priority")
    .neq("status", "Done")
    .contains("assigned_to", [employeeName])
    .eq("due_date", todayStr);

  // ── 3. Overdue tasks ─────────────────────────────────────────────────────
  const overdueRes = await supabase
    .from("tasks")
    .select("id, name, priority, due_date")
    .neq("status", "Done")
    .contains("assigned_to", [employeeName])
    .lt("due_date", todayStr)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(10);

  // ── Map results ──────────────────────────────────────────────────────────
  const completedYesterday: StandupTask[] = (completedRes.data ?? []).map(
    (t) => ({ id: t.id, name: t.name, priority: t.priority ?? "Medium" }),
  );

  const dueToday: StandupTask[] = (dueTodayRes.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    priority: t.priority ?? "Medium",
  }));

  const overdue = (overdueRes.data ?? []).map((t) => {
    const dueDateMs = new Date(t.due_date as string).getTime();
    const todayMs = new Date(todayStr).getTime();
    const daysOverdue = Math.max(
      1,
      Math.floor((todayMs - dueDateMs) / (1000 * 60 * 60 * 24)),
    );
    return {
      id: t.id,
      name: t.name,
      priority: t.priority ?? "Medium",
      daysOverdue,
    };
  });

  // ── Format summary ───────────────────────────────────────────────────────
  const summary = formatStandupSummary(employeeName, {
    employeeName,
    completedYesterday,
    dueToday,
    overdue,
    generatedAt: now.toISOString(),
  });

  return {
    summary,
    data: {
      employeeName,
      completedYesterday,
      dueToday,
      overdue,
      generatedAt: now.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// formatStandupSummary — pure function, easy to unit-test
// ---------------------------------------------------------------------------

function priorityIcon(priority?: string): string {
  if (priority === "High") return "🔴";
  if (priority === "Medium") return "🟡";
  return "🟢";
}

export function formatStandupSummary(
  employeeName: string,
  data: Omit<StandupData, "generatedAt"> & { generatedAt?: string },
): string {
  const lines: string[] = [`**Daily Digest — ${employeeName}**`, ""];

  // Completed yesterday
  lines.push("✅ **Completed (last 24 h):**");
  if (data.completedYesterday.length === 0) {
    lines.push("  • None");
  } else {
    data.completedYesterday.forEach((t) =>
      lines.push(`  • ${t.name}`),
    );
  }

  lines.push("");

  // Due today
  lines.push("📋 **Due Today:**");
  if (data.dueToday.length === 0) {
    lines.push("  • Nothing scheduled for today");
  } else {
    data.dueToday.forEach((t) =>
      lines.push(`  • ${priorityIcon(t.priority)} ${t.name}`),
    );
  }

  // Overdue (only show if there are any)
  if (data.overdue.length > 0) {
    lines.push("");
    lines.push("⚠️ **Overdue:**");
    data.overdue.slice(0, 5).forEach((t) =>
      lines.push(
        `  • ${t.name}  _(${t.daysOverdue}d overdue)_`,
      ),
    );
    if (data.overdue.length > 5) {
      lines.push(`  • …and ${data.overdue.length - 5} more`);
    }
  }

  return lines.join("\n");
}

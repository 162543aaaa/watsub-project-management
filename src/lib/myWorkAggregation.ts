import type { Task } from "@/hooks/useProjects";

export interface EnrichedTask extends Task {
  _source: "standalone" | "project" | "customer";
  _sourceName?: string;
  _sourceId?: string;
}

export interface MyWorkSections {
  today: EnrichedTask[];
  overdue: EnrichedTask[];
  dueSoon: EnrichedTask[];
  inProgress: EnrichedTask[];
  waitingEvidence: EnrichedTask[];
  recentlyCompleted: EnrichedTask[];
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

/**
 * Bucket the current user's tasks into UI sections.
 * Pure & deterministic — accepts an optional `now` for tests.
 */
export function bucketMyTasks(
  tasks: EnrichedTask[],
  now: Date = new Date(),
): MyWorkSections {
  const today = startOfDay(now);
  const in7 = today + 7 * 86400_000;
  const ago14 = today - 14 * 86400_000;

  const sections: MyWorkSections = {
    today: [],
    overdue: [],
    dueSoon: [],
    inProgress: [],
    waitingEvidence: [],
    recentlyCompleted: [],
  };

  for (const t of tasks) {
    const due = t.due_date ? startOfDay(new Date(t.due_date)) : null;

    if (t.status === "Done") {
      // Recently completed (last 14 days) — fall back to due_date or created_at
      const ref = t.due_date || t.created_at;
      if (ref) {
        const ts = startOfDay(new Date(ref));
        if (ts >= ago14 && ts <= today) sections.recentlyCompleted.push(t);
      }
      continue;
    }

    // Waiting evidence: In Progress with missing link AND short/empty comments
    if (
      t.status === "In Progress" &&
      !t.link &&
      (!t.comments || t.comments.trim().length < 20)
    ) {
      sections.waitingEvidence.push(t);
    }

    if (due !== null) {
      if (due < today) {
        sections.overdue.push(t);
        continue;
      }
      if (due === today) {
        sections.today.push(t);
        continue;
      }
      if (due <= in7) {
        sections.dueSoon.push(t);
        continue;
      }
    }

    if (t.status === "In Progress") {
      sections.inProgress.push(t);
    }
  }

  // Sort each section by due_date asc, undated last
  const byDue = (a: EnrichedTask, b: EnrichedTask) => {
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return ad - bd;
  };
  for (const k of Object.keys(sections) as (keyof MyWorkSections)[]) {
    sections[k].sort(byDue);
  }
  return sections;
}
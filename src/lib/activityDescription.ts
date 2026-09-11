export interface ActivityLogLike {
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  display_name?: string;
}

const IGNORED_FIELDS = new Set(["id", "created_at", "updated_at", "sort_order", "embedding", "metadata"]);
const FIELD_LABELS: Record<string, string> = {
  name: "name",
  status: "status",
  priority: "priority",
  due_date: "due date",
  start_date: "start date",
  deadline: "deadline",
  assigned_to: "assignees",
  comments: "note",
  link: "link",
  category: "category",
  pillar: "pillar",
  month: "month",
  year: "year",
};

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function changedActivityFields(log: ActivityLogLike): string[] {
  const oldValues = log.old_values ?? {};
  const newValues = log.new_values ?? {};
  return [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])]
    .filter((key) => !IGNORED_FIELDS.has(key))
    .filter((key) => !sameValue(oldValues[key], newValues[key]));
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "not set";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
  if ((key === "due_date" || key === "start_date" || key === "deadline") && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  return String(value);
}

export function describeActivity(log: ActivityLogLike, entityType: "task" | "project"): string {
  const actor = log.display_name ?? "Someone";
  const normalized = log.action.toLowerCase();
  if (normalized === "created" || normalized === "insert") return `${actor} created this ${entityType}`;
  if (normalized === "deleted" || normalized === "delete") return `${actor} deleted this ${entityType}`;
  if (normalized.startsWith("status_changed:")) {
    const [from, to] = log.action.replace(/^status_changed:/i, "").split("→");
    return `${actor} changed status from "${from}" to "${to}"`;
  }

  const fields = changedActivityFields(log);
  if (fields.length === 0) return `${actor} updated this ${entityType}`;
  if (fields.length > 1) return `${actor} updated ${fields.map((key) => FIELD_LABELS[key] ?? key).join(", ")}`;

  const key = fields[0];
  if (key === "comments") return `${actor} updated the note`;
  const label = FIELD_LABELS[key] ?? key;
  const before = formatValue(key, log.old_values?.[key]);
  const after = formatValue(key, log.new_values?.[key]);
  return `${actor} changed ${label} from "${before}" to "${after}"`;
}

import type { Task } from "@/hooks/useProjects";

export interface TemplateTaskDef {
  name: string;
  priority: Task["priority"];
  /** Days after start date when this task is due. */
  dueOffsetDays: number;
  status?: Task["status"];
  category?: string;
  notes?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  tasks: TemplateTaskDef[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "video_shoot",
    name: "Video Shoot",
    description: "Pre-production through wrap for a video shoot",
    tasks: [
      { name: "Pre-production meeting", priority: "High", dueOffsetDays: 0 },
      { name: "Storyboard / shot list", priority: "High", dueOffsetDays: 2 },
      { name: "Location & gear prep", priority: "Medium", dueOffsetDays: 4 },
      { name: "Shoot day", priority: "High", dueOffsetDays: 7 },
      { name: "Wrap & footage backup", priority: "Medium", dueOffsetDays: 8 },
    ],
  },
  {
    id: "editing",
    name: "Editing",
    description: "Rough cut → final delivery",
    tasks: [
      { name: "Ingest & sync footage", priority: "Medium", dueOffsetDays: 1 },
      { name: "Rough cut", priority: "High", dueOffsetDays: 4 },
      { name: "Color grade", priority: "Medium", dueOffsetDays: 6 },
      { name: "Sound mix", priority: "Medium", dueOffsetDays: 7 },
      { name: "Final review & export", priority: "High", dueOffsetDays: 9 },
    ],
  },
  {
    id: "client_delivery",
    name: "Client Content Delivery",
    description: "Standard client review / revision / final",
    tasks: [
      { name: "Internal review", priority: "Medium", dueOffsetDays: 0 },
      { name: "Send to client for review", priority: "High", dueOffsetDays: 1 },
      { name: "Apply client revisions", priority: "High", dueOffsetDays: 4 },
      { name: "Final delivery", priority: "High", dueOffsetDays: 6 },
    ],
  },
  {
    id: "social_media",
    name: "Social Media Content",
    description: "Plan, produce and schedule social posts",
    tasks: [
      { name: "Content brief", priority: "Medium", dueOffsetDays: 0 },
      { name: "Copy + caption", priority: "Medium", dueOffsetDays: 2 },
      { name: "Asset production", priority: "High", dueOffsetDays: 4 },
      { name: "Schedule posts", priority: "Medium", dueOffsetDays: 5 },
      { name: "Engagement & report", priority: "Low", dueOffsetDays: 10 },
    ],
  },
  {
    id: "event_coverage",
    name: "Event Coverage",
    description: "End-to-end event coverage",
    tasks: [
      { name: "Run-of-show / brief", priority: "High", dueOffsetDays: -3 },
      { name: "Crew & gear assign", priority: "Medium", dueOffsetDays: -2 },
      { name: "Event day coverage", priority: "High", dueOffsetDays: 0 },
      { name: "Same-day highlights", priority: "High", dueOffsetDays: 1 },
      { name: "Recap edit", priority: "Medium", dueOffsetDays: 5 },
    ],
  },
];

export function getTemplate(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.id === id);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Materialize template tasks into task payloads ready for insert.
 * Provide either a project_id or customer_id (matches task_type).
 */
export function expandTemplate(
  template: TaskTemplate,
  opts: { startDate: string; projectId?: string; customerId?: string; assignedTo?: string[] },
): Array<Omit<Task, "id" | "created_at">> {
  const taskType: Task["task_type"] = opts.projectId
    ? "project"
    : opts.customerId
      ? "customer"
      : "standalone";
  return template.tasks.map((t) => ({
    name: t.name,
    status: t.status ?? "To Do",
    priority: t.priority,
    assigned_to: opts.assignedTo ?? [],
    start_date: opts.startDate,
    due_date: addDays(opts.startDate, t.dueOffsetDays),
    comments: t.notes ?? "",
    link: "",
    task_type: taskType,
    project_id: opts.projectId,
    customer_id: opts.customerId,
    category: t.category ?? "none",
  }));
}
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Save } from "lucide-react";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import { Task } from "@/hooks/useProjects";

interface Employee {
  name: string;
  avatar?: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  employees: Employee[];
  onSave: (task: Task, updates: Partial<Task>) => void;
}

export default function TaskDetailModal({ isOpen, onClose, task, employees, onSave }: TaskDetailModalProps) {
  const [form, setForm] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when task changes
  const [prevTask, setPrevTask] = useState<Task | null>(null);
  if (task !== prevTask) {
    setPrevTask(task);
    setForm(task ? {
      name: task.name,
      status: task.status,
      priority: task.priority,
      category: task.category ?? "none",
      assigned_to: [...(task.assigned_to ?? [])],
      start_date: task.start_date ?? "",
      due_date: task.due_date ?? "",
      link: task.link ?? "",
      comments: task.comments ?? "",
    } : {});
  }

  if (!isOpen || !task) return null;

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave(task, form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-2xl bg-card rounded-2xl border border-border flex flex-col animate-scale-in"
        style={{ maxHeight: "90vh", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5 shrink-0 border-b border-border/40">
          <div className="flex-1 pr-3 min-w-0">
            <h3 className="font-bold text-foreground text-base leading-snug truncate">{task.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-2 pt-5">
          <div className="space-y-4">
            {/* Task Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Task Name</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                value={form.name ?? task?.name ?? ""}
                onChange={e => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.status ?? task.status}
                  onChange={e => setForm({ ...form, status: e.target.value as Task["status"] })}
                >
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Priority</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.priority ?? task.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value as Task["priority"] })}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.category ?? task?.category ?? "none"}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option value="none">— ไม่ระบุ —</option>
                <option value="meeting">🗓 Meetings</option>
                <option value="onsite">📍 On-site Work</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Assigned To</label>
              <MultiSelectAssignee
                selected={form.assigned_to ?? task.assigned_to ?? []}
                onChange={val => setForm({ ...form, assigned_to: val })}
                employees={employees}
              />
            </div>

            {/* Start Date & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.start_date ?? task.start_date ?? ""}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.due_date ?? task.due_date ?? ""}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* Link */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Link</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.link ?? task.link ?? ""}
                onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                value={form.comments ?? task.comments ?? ""}
                onChange={e => setForm({ ...form, comments: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม..."
              />
            </div>
          </div>
          <div className="pb-2" />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isSaving}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Sparkles, Loader2 } from "lucide-react";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import { toast } from "@/hooks/use-toast";
import { Task } from "@/hooks/useProjects";
import { polishText, breakdownTask } from "@/lib/aiActions";

interface Employee {
  name: string;
  avatar?: string;
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Partial<Task> | null;
  employees: Employee[];
  onSave: (data: Partial<Task>) => void;
  onBreakdown?: (subTasks: string[]) => void;
}

export default function EditTaskModal({ isOpen, onClose, task, employees, onSave, onBreakdown }: EditTaskModalProps) {
  const [form, setForm] = useState<Partial<Task>>(
    task ?? { name: "", status: "To Do", priority: "Medium", assigned_to: [], due_date: "", start_date: "", link: "", comments: "", category: "none" }
  );
  const [polishing, setPolishing] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const [subTaskPreview, setSubTaskPreview] = useState<string[] | null>(null);

  // Reset form when task prop changes (modal re-opened with different task)
  const [prevTask, setPrevTask] = useState(task);
  if (task !== prevTask) {
    setPrevTask(task);
    setForm(task ?? { name: "", status: "To Do", priority: "Medium", assigned_to: [], due_date: "", start_date: "", link: "", comments: "", category: "none" });
    setSubTaskPreview(null);
  }

  if (!isOpen) return null;

  const handlePolishNote = async () => {
    const text = form.comments?.trim();
    if (!text) {
      toast({ title: "กรุณากรอก Note ก่อน", variant: "destructive" });
      return;
    }
    setPolishing(true);
    try {
      const polished = await polishText(text);
      setForm(f => ({ ...f, comments: polished }));
      toast({ title: "✨ ปรับโทนเสร็จแล้ว!" });
    } catch (e) {
      toast({ title: "ไม่สามารถปรับโทนได้", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setPolishing(false);
    }
  };

  const handleBreakdown = async () => {
    const title = form.name?.trim();
    if (!title || title.length < 3) {
      toast({ title: "กรุณากรอกชื่องานก่อน", variant: "destructive" });
      return;
    }
    setBreakingDown(true);
    setSubTaskPreview(null);
    try {
      const subTasks = await breakdownTask(title);
      if (!subTasks.length) throw new Error("No sub-tasks returned");
      setSubTaskPreview(subTasks);
    } catch (e) {
      toast({ title: "ไม่สามารถ Breakdown ได้", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setBreakingDown(false);
    }
  };

  const handleAddAllSubTasks = () => {
    if (!subTaskPreview || !onBreakdown) return;
    onBreakdown(subTaskPreview);
    setSubTaskPreview(null);
  };

  const save = () => {
    if (!form.name?.trim()) {
      toast({ title: "กรุณากรอกชื่องาน", variant: "destructive" });
      return;
    }
    // Feature 4: Quality gatekeeper — block marking Done without description OR link
    if (form.status === "Done" && !form.link && (!form.comments || form.comments.trim().length < 20)) {
      toast({
        title: "กรุณาเพิ่มรายละเอียดหรือ Link ก่อนปิดงาน",
        description: "Please add a note (≥20 chars) or a link before completing this task.",
        variant: "destructive",
      });
      return;
    }
    onSave(form);
    onClose();
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
        <div className="flex items-center justify-between p-6 pb-5 shrink-0">
          <h3 className="text-lg font-bold">{form.id ? "Edit Task" : "New Task"}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">
          <div className="space-y-4">
            {/* Task Name + AI Breakdown button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task Name</label>
                {onBreakdown && (
                  <button
                    type="button"
                    onClick={handleBreakdown}
                    disabled={breakingDown || !form.name?.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40 hover:bg-violet-500/10 text-violet-500"
                    title="AI Breakdown — แตกงานออกเป็น Sub-tasks"
                  >
                    {breakingDown
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />}
                    AI Breakdown
                  </button>
                )}
              </div>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                value={form.name || ""}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Enter task name..."
                autoFocus
              />
            </div>

            {/* Sub-task preview panel */}
            {subTaskPreview && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-500">✨ Sub-tasks ที่แนะนำ ({subTaskPreview.length})</p>
                <ul className="space-y-1">
                  {subTaskPreview.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="text-violet-400 font-bold mt-0.5">{i + 1}.</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAddAllSubTasks}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-semibold hover:bg-violet-600 transition-colors"
                  >
                    Add All as Sub-tasks
                  </button>
                  <button
                    onClick={() => setSubTaskPreview(null)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.status}
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
                  value={form.priority}
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
                value={form.category || "none"}
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
                selected={form.assigned_to || []}
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
                  value={form.start_date || ""}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.due_date || ""}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* Link */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Link</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.link || ""}
                onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Note + Polish button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note</label>
                <button
                  type="button"
                  onClick={handlePolishNote}
                  disabled={polishing || !form.comments?.trim()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40 hover:bg-amber-500/10 text-amber-500"
                  title="✨ Polish — ปรับให้เป็น Professional Tone"
                >
                  {polishing
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />}
                  Polish
                </button>
              </div>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                value={form.comments || ""}
                onChange={e => setForm({ ...form, comments: e.target.value })}
                placeholder="Optional note..."
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
          <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {form.id ? "Save" : "Add Task"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

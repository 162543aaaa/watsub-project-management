import { CheckIcon, ClockIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import TaskActivityLog from "@/components/TaskActivityLog";
import { toast } from "@/hooks/use-toast";
import { Task } from "@/hooks/useProjects";

interface Employee {
  name: string;
  avatar?: string;
}

interface ParentOption {
  id: string;
  name: string;
  month?: number;
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Partial<Task> | null;
  employees: Employee[];
  onSave: (data: Partial<Task>) => Promise<void> | void;
  projects?: ParentOption[];
  customers?: ParentOption[];
}

type Tab = "details" | "activity";

export default function EditTaskModal({ isOpen, onClose, task, employees, onSave, projects = [], customers = [] }: EditTaskModalProps) {
  const [form, setForm] = useState<Partial<Task>>(
    task ?? { name: "", status: "To Do", priority: "Medium", assigned_to: [], due_date: "", start_date: "", link: "", comments: "", category: "none" }
  );
  const [activeTab, setActiveTab] = useState<Tab>("details");

  // Reset form when task prop changes (modal re-opened with different task)
  const [prevTask, setPrevTask] = useState(task);
  if (task !== prevTask) {
    setPrevTask(task);
    setForm(task ?? { name: "", status: "To Do", priority: "Medium", assigned_to: [], due_date: "", start_date: "", link: "", comments: "", category: "none" });
    setActiveTab("details");
  }

  // Parent selector state derived from form
  const parentType: "none" | "project" | "customer" =
    form.task_type === "project" ? "project" : form.task_type === "customer" ? "customer" : "none";
  const parentId = parentType === "project" ? form.project_id : parentType === "customer" ? form.customer_id : "";

  const parentList: ParentOption[] = parentType === "project" ? projects : parentType === "customer" ? customers : [];
  const availableMonths = useMemo(() => {
    const s = new Set<number>();
    parentList.forEach(p => { if (p.month) s.add(p.month); });
    return [...s].sort((a, b) => a - b);
  }, [parentList]);

  const [parentMonth, setParentMonth] = useState<number | "all">(() => {
    const current = parentList.find(p => p.id === parentId);
    return current?.month ?? "all";
  });
  const [prevParentType, setPrevParentType] = useState(parentType);
  if (parentType !== prevParentType) {
    setPrevParentType(parentType);
    const current = parentList.find(p => p.id === parentId);
    setParentMonth(current?.month ?? "all");
  }

  const filteredParents = useMemo(
    () => parentMonth === "all" ? parentList : parentList.filter(p => p.month === parentMonth),
    [parentList, parentMonth]
  );

  const setParentType = (t: "none" | "project" | "customer") => {
    if (t === "none") {
      setForm({ ...form, task_type: "standalone", project_id: null as unknown as string | undefined, customer_id: null as unknown as string | undefined });
    } else if (t === "project") {
      setForm({ ...form, task_type: "project", customer_id: null as unknown as string | undefined, project_id: form.project_id ?? undefined });
    } else {
      setForm({ ...form, task_type: "customer", project_id: null as unknown as string | undefined, customer_id: form.customer_id ?? undefined });
    }
  };

  const setParentId = (id: string) => {
    if (parentType === "project") setForm({ ...form, project_id: id || (null as unknown as string | undefined) });
    else if (parentType === "customer") setForm({ ...form, customer_id: id || (null as unknown as string | undefined) });
  };

  if (!isOpen) return null;

  const save = async () => {
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
    await onSave(form);
    onClose();
  };

  const isExistingTask = Boolean(form.id);

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
        <div className="flex items-center justify-between p-6 pb-0 shrink-0">
          <h3 className="text-lg font-bold">{isExistingTask ? "Edit Task" : "New Task"}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs — only show for existing tasks */}
        {isExistingTask && (
          <div className="flex gap-1 px-6 pt-4 shrink-0">
            <button
              onClick={() => setActiveTab("details")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={activeTab === "details"
                ? { background: "hsl(191 91% 37% / 0.15)", color: "hsl(191 91% 55%)" }
                : { color: "hsl(215 20% 55%)" }}
            >
              <PencilIcon className="w-3.5 h-3.5" /> Details
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={activeTab === "activity"
                ? { background: "hsl(191 91% 37% / 0.15)", color: "hsl(191 91% 55%)" }
                : { color: "hsl(215 20% 55%)" }}
            >
              <ClockIcon className="w-3.5 h-3.5" /> Activity
            </button>
            <div className="flex-1 border-b border-border self-end mb-0 pb-0" />
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await save();
          }}
          className="contents"
        >
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-2 pt-4">
          {activeTab === "details" ? (
            <div className="space-y-4">
              {/* Task Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task Name</label>
                </div>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  value={form.name || ""}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter task name..."
                  autoFocus
                />
              </div>

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

              {/* Attach to Project / Customer */}
              <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/30">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                  ผูกงานเข้ากับ / Attach to
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["none", "project", "customer"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setParentType(t)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        parentType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      {t === "none" ? "Standalone" : t === "project" ? "🚀 Project" : "💼 Customer"}
                    </button>
                  ))}
                </div>
                {parentType !== "none" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Month</label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none"
                        value={parentMonth}
                        onChange={e => setParentMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                      >
                        <option value="all">ทุกเดือน</option>
                        {availableMonths.map(m => (
                          <option key={m} value={m}>เดือน {m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                        {parentType === "project" ? "Project" : "Customer"}
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none"
                        value={parentId || ""}
                        onChange={e => setParentId(e.target.value)}
                      >
                        <option value="">— เลือก —</option>
                        {filteredParents.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.month ? ` · เดือน ${p.month}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
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

              {/* Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note</label>
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
          ) : (
            <TaskActivityLog taskId={form.id!} />
          )}
          <div className="pb-2" />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          {activeTab === "details" && (
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2">
              <CheckIcon className="w-4 h-4" /> {isExistingTask ? "CheckIcon" : "Add Task"}
            </button>
          )}
        </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";

type TaskStatus = "To Do" | "In Progress" | "Done";
type TaskPriority = "Low" | "Medium" | "High";
const COLUMNS: TaskStatus[] = ["To Do", "In Progress", "Done"];

function getColStyle(col: TaskStatus) {
  if (col === "Done") return { bg: "hsl(142 71% 45% / 0.06)", border: "hsl(142 71% 45% / 0.2)" };
  if (col === "In Progress") return { bg: "hsl(191 91% 37% / 0.06)", border: "hsl(191 91% 37% / 0.2)" };
  return { bg: "hsl(220 14% 96%)", border: "hsl(220 13% 88%)" };
}

function PriorityBadge({ priority }: { priority: string }) {
  if (!priority) return null;
  return (
    <span className={priority === "High" ? "badge-high" : priority === "Medium" ? "badge-medium" : "badge-low"}>
      {priority}
    </span>
  );
}

function TaskModal({ task, employees, onSave, onClose }: {
  task: Partial<Task> | null;
  employees: { name: string }[];
  onSave: (t: Partial<Task>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Task>>(task || {
    name: "", status: "To Do", priority: "Medium", assigned_to: [], due_date: "", comments: ""
  });

  const save = () => {
    if (!form.name?.trim()) { toast({ title: "กรุณากรอกชื่องาน", variant: "destructive" }); return; }
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in shadow-lg" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{form.id ? "Edit Task" : "New Task"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Task Name</label>
            <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter task name..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}>
                {COLUMNS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Priority</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Assigned To</label>
            <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              onChange={e => { const v = e.target.value; if (v && !form.assigned_to?.includes(v)) setForm({ ...form, assigned_to: [...(form.assigned_to || []), v] }); }}>
              <option value="">Select team member...</option>
              {employees.map((e, i) => <option key={i} value={e.name}>{e.name}</option>)}
            </select>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.assigned_to?.map(a => (
                <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {a.split(" ")[0]}
                  <button onClick={() => setForm({ ...form, assigned_to: form.assigned_to!.filter(x => x !== a) })}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Due Date</label>
            <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
            <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
              value={form.comments || ""} onChange={e => setForm({ ...form, comments: e.target.value })} placeholder="Additional notes..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const { employees } = useEmployees();
  const [modal, setModal] = useState<{ open: boolean; task: Partial<Task> | null }>({ open: false, task: null });

  const handleSave = async (form: Partial<Task>) => {
    if (form.id) {
      await updateTask(form.id, { name: form.name, status: form.status, priority: form.priority, assigned_to: form.assigned_to, due_date: form.due_date, comments: form.comments });
    } else {
      await addTask({ name: form.name!, status: form.status || "To Do", priority: form.priority || "Medium", assigned_to: form.assigned_to || [], due_date: form.due_date || "", comments: form.comments || "", task_type: "standalone" });
    }
  };

  const colTasks = (col: TaskStatus) => tasks.filter(t => t.status === col);

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage tasks with Kanban board</p>
        </div>
        <button onClick={() => setModal({ open: true, task: null })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col, ci) => {
          const style = getColStyle(col);
          const colT = colTasks(col);
          return (
            <div key={col} className={`kanban-col animate-stagger-${ci + 1}`}
              style={{ background: style.bg, borderColor: style.border }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col === "Done" ? "bg-green-500" : col === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                  <span className="text-sm font-semibold text-foreground">{col}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colT.length}</span>
                </div>
                <button onClick={() => setModal({ open: true, task: { status: col } })}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {colT.map(task => (
                  <div key={task.id} className="bg-card rounded-xl p-3.5 border border-border/60 group card-hover">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground leading-snug flex-1">{task.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ open: true, task: { ...task, assigned_to: task.assigned_to || [] } })}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => deleteTask(task.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          📅 {new Date(task.due_date).toLocaleDateString("en", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {task.assigned_to.slice(0, 3).map((a, i) => (
                          <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold -ml-1 first:ml-0 border border-card ${["bg-gradient-to-br from-cyan-400 to-teal-500", "bg-gradient-to-br from-violet-400 to-purple-500", "bg-gradient-to-br from-rose-400 to-pink-500"][i % 3]}`}>
                            {a.charAt(0)}
                          </div>
                        ))}
                        {task.assigned_to.length > 3 && <span className="text-xs text-muted-foreground ml-1">+{task.assigned_to.length - 3}</span>}
                      </div>
                    )}
                    {task.comments && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{task.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal.open && (
        <TaskModal
          task={modal.task}
          employees={employees}
          onSave={handleSave}
          onClose={() => setModal({ open: false, task: null })}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Save, ExternalLink, Search } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import type { Task } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";

type TaskStatus = "To Do" | "In Progress" | "Done";
type TaskPriority = "Low" | "Medium" | "High";
const COLUMNS: TaskStatus[] = ["To Do", "In Progress", "Done"];

interface AllTask extends Task {
  _source?: "standalone" | "project" | "customer";
  _sourceName?: string;
}

function getColStyle(col: TaskStatus) {
  if (col === "Done") return { bg: "hsl(142 71% 45% / 0.06)", border: "hsl(142 71% 45% / 0.2)" };
  if (col === "In Progress") return { bg: "hsl(191 91% 37% / 0.06)", border: "hsl(191 91% 37% / 0.2)" };
  return { bg: "hsl(220 14% 96%)", border: "hsl(220 13% 88%)" };
}

function PriorityBadge({ priority }: { priority?: string }) {
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
  const { tasks, loading: loadingTasks, addTask, updateTask, deleteTask } = useTasks();
  const { projects, loading: loadingProjects, updateTask: updateProjectTask, deleteTask: deleteProjectTask } = useProjects();
  const { customers, loading: loadingCustomers, updateTask: updateCustomerTask, deleteTask: deleteCustomerTask } = useCustomers();
  const { employees } = useEmployees();
  const [modal, setModal] = useState<{ open: boolean; task: Partial<Task> | null }>({ open: false, task: null });
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");

  // Build allTasks from all sources
  const allTasks = useMemo<AllTask[]>(() => {
    const standalone = tasks.map(t => ({ ...t, _source: "standalone" as const, _sourceName: undefined }));
    const projectTasks: AllTask[] = projects.flatMap(p =>
      p.tasks.map(t => ({ ...t, _source: "project" as const, _sourceName: p.name }))
    );
    const customerTasks: AllTask[] = customers.flatMap(c =>
      c.tasks.map(t => ({ ...t, _source: "customer" as const, _sourceName: c.name }))
    );
    return [...standalone, ...projectTasks, ...customerTasks];
  }, [tasks, projects, customers]);

  const filtered = useMemo(() => {
    let result = allTasks;
    if (priorityFilter !== "all") result = result.filter(t => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.assigned_to?.some(a => a.toLowerCase().includes(q)) ||
        t._sourceName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allTasks, search, priorityFilter]);

  const loading = loadingTasks || loadingProjects || loadingCustomers;

  const handleSave = async (form: Partial<Task>) => {
    if (form.id) {
      await updateTask(form.id, { name: form.name, status: form.status, priority: form.priority, assigned_to: form.assigned_to, due_date: form.due_date, comments: form.comments });
    } else {
      await addTask({ name: form.name!, status: form.status || "To Do", priority: form.priority || "Medium", assigned_to: form.assigned_to || [], due_date: form.due_date || "", comments: form.comments || "", task_type: "standalone" });
    }
  };

  const handleDeleteTask = async (task: AllTask) => {
    if (task._source === "project" && task.project_id) {
      await deleteProjectTask(task.id, task.project_id);
    } else if (task._source === "customer" && task.customer_id) {
      await deleteCustomerTask(task.id, task.customer_id);
    } else {
      await deleteTask(task.id);
    }
  };

  const handleStatusToggle = async (task: AllTask) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };
    const newStatus = nextStatus[task.status as TaskStatus] || "To Do";
    if (task._source === "project" && task.project_id) {
      await updateProjectTask(task.id, { status: newStatus });
    } else if (task._source === "customer" && task.customer_id) {
      await updateCustomerTask(task.id, { status: newStatus });
    } else {
      await updateTask(task.id, { status: newStatus });
    }
  };

  const colTasks = (col: TaskStatus) => filtered.filter(t => t.status === col);

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allTasks.length} total tasks (standalone + projects + customers)</p>
        </div>
        <button onClick={() => setModal({ open: true, task: null })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5 animate-stagger-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "High", "Medium", "Low"] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${priorityFilter === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {p === "all" ? "All Priority" : p}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} tasks shown</span>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-stagger-3">
        {COLUMNS.map((col, ci) => {
          const style = getColStyle(col);
          const colT = colTasks(col);
          return (
            <div key={col} className="kanban-col"
              style={{ background: style.bg, borderColor: style.border }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col === "Done" ? "bg-green-500" : col === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                  <span className="text-sm font-semibold text-foreground">{col}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colT.length}</span>
                </div>
                {col === "To Do" && (
                  <button onClick={() => setModal({ open: true, task: { status: col } })}
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {colT.map(task => (
                  <div key={`${task._source}-${task.id}`} className="bg-card rounded-xl p-3.5 border border-border/60 group card-hover">
                    {/* Source label */}
                    {task._source !== "standalone" && (
                      <div className="mb-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {task._source === "project" ? "🚀" : "💼"} {task._sourceName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground leading-snug flex-1">{task.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.link && (
                          <a href={task.link} target="_blank" rel="noopener noreferrer"
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                            <ExternalLink className="w-3 h-3 text-primary" />
                          </a>
                        )}
                        {task._source === "standalone" && (
                          <button onClick={() => setModal({ open: true, task: { ...task, assigned_to: task.assigned_to || [] } })}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteTask(task)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => handleStatusToggle(task)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:scale-105 cursor-pointer ${col === "Done" ? "badge-done" : col === "In Progress" ? "badge-progress" : "badge-todo"}`}>
                        {task.status}
                      </button>
                      <PriorityBadge priority={task.priority} />
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          📅 {new Date(task.due_date).toLocaleDateString("th", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {task.assigned_to.slice(0, 3).map((a, i) => (
                          <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-primary-foreground text-[9px] font-bold -ml-1 first:ml-0 border border-card ${i === 0 ? "bg-primary" : i === 1 ? "bg-accent-foreground" : "bg-muted-foreground"}`}>
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
                {colT.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
                )}
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

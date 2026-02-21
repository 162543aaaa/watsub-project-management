import { useState, useMemo, forwardRef } from "react";
import { Plus, Pencil, Trash2, X, Save, ExternalLink, Search, ArrowUpRight, GripVertical, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import type { Task } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskStatus = "To Do" | "In Progress" | "Done";
type TaskPriority = "Low" | "Medium" | "High";
const COLUMNS: TaskStatus[] = ["To Do", "In Progress", "Done"];
const YEARS = [2025, 2026, 2027];
const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface AllTask extends Task {
  _source?: "standalone" | "project" | "customer";
  _sourceName?: string;
  _sourceId?: string;
  _month?: number;
}

function getColStyle(col: TaskStatus) {
  if (col === "Done") return { bg: "hsl(142 71% 45% / 0.06)", border: "hsl(142 71% 45% / 0.2)" };
  if (col === "In Progress") return { bg: "hsl(191 91% 37% / 0.06)", border: "hsl(191 91% 37% / 0.2)" };
  return { bg: "hsl(220 14% 96%)", border: "hsl(220 13% 88%)" };
}

const PriorityBadge = forwardRef<HTMLSpanElement, { priority?: string }>(({ priority }, ref) => {
  if (!priority) return null;
  return (
    <span ref={ref} className={priority === "High" ? "badge-high" : priority === "Medium" ? "badge-medium" : "badge-low"}>
      {priority}
    </span>
  );
});
PriorityBadge.displayName = "PriorityBadge";

function DaysBadge({ startDate, dueDate, status }: { startDate?: string; dueDate?: string; status: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const badges: React.ReactNode[] = [];
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) badges.push(<span key="s" className="inline-flex items-center gap-0.5 text-[9px] font-medium" style={{ color: "hsl(191 91% 30%)" }}><Clock className="w-2.5 h-2.5" />{diff}d</span>);
  }
  if (dueDate && status !== "Done") {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) badges.push(<span key="o" className="inline-flex items-center gap-0.5 text-[9px] font-semibold animate-pulse" style={{ color: "hsl(0 84% 50%)" }}><AlertTriangle className="w-2.5 h-2.5" />เลย {diff}d</span>);
  }
  return badges.length > 0 ? <div className="flex items-center gap-1.5 mt-0.5">{badges}</div> : null;
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
  const [assignSearch, setAssignSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useState<HTMLDivElement | null>(null);

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const toggleAssign = (name: string) => {
    const current = form.assigned_to || [];
    const updated = current.includes(name) ? current.filter(x => x !== name) : [...current, name];
    setForm({ ...form, assigned_to: updated });
  };

  const save = () => {
    if (!form.name?.trim()) { toast({ title: "กรุณากรอกชื่องาน", variant: "destructive" }); return; }
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{form.id ? "Edit Task" : "New Task"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Task Name</label>
            <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter task name..." autoFocus />
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

          {/* Multi-select Assigned To */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Assigned To
            </label>
            {/* Selected pills */}
            {(form.assigned_to || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.assigned_to!.map(a => (
                  <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {a.split(" ")[0]}
                    <button type="button" onClick={() => toggleAssign(a)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Toggle dropdown */}
            <button type="button" onClick={() => setAssignOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-muted-foreground hover:border-primary/40 transition-all outline-none">
              <span>{assignOpen ? "Close" : `Add team member${(form.assigned_to || []).length ? ` (${form.assigned_to!.length} selected)` : "..."}`}</span>
              <span className="text-muted-foreground/60">{assignOpen ? "▲" : "▼"}</span>
            </button>
            {assignOpen && (
              <div className="mt-1.5 border border-border rounded-xl bg-card shadow-md overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="Search team members..."
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredEmployees.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
                  )}
                  {filteredEmployees.map(e => {
                    const selected = (form.assigned_to || []).includes(e.name);
                    return (
                      <button key={e.name} type="button" onClick={() => toggleAssign(e.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted ${selected ? "bg-primary/5" : ""}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-primary border-primary" : "border-border"}`}>
                          {selected && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                        </div>
                        <div className={`w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0`}>
                          {e.name.charAt(0)}
                        </div>
                        <span className={`flex-1 ${selected ? "font-medium text-foreground" : "text-muted-foreground"}`}>{e.name}</span>
                      </button>
                    );
                  })}
                </div>
                {(form.assigned_to || []).length > 0 && (
                  <div className="p-2 border-t border-border">
                    <button type="button" onClick={() => setForm({ ...form, assigned_to: [] })}
                      className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1">
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start Date</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.start_date || ""} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Due Date</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
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

// Sortable card wrapper
function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="relative"
    >
      <div {...attributes} {...listeners}
        className="absolute top-3 left-2 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        style={{ touchAction: "none" }}>
        <GripVertical className="w-3 h-3" />
      </div>
      {children}
    </div>
  );
}

export default function Tasks() {
  const { tasks, loading: loadingTasks, addTask, updateTask, deleteTask, reorderTasks } = useTasks();
  const { projects, loading: loadingProjects, updateTask: updateProjectTask, deleteTask: deleteProjectTask } = useProjects();
  const { customers, loading: loadingCustomers, updateTask: updateCustomerTask, deleteTask: deleteCustomerTask } = useCustomers();
  const { employees } = useEmployees();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ open: boolean; task: Partial<AllTask> | null }>({ open: false, task: null });
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number>(2026);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Build allTasks from all sources
  const allTasks = useMemo<AllTask[]>(() => {
    const standalone = tasks.map(t => ({ ...t, _source: "standalone" as const, _sourceName: undefined, _sourceId: undefined, _month: undefined }));
    const projectTasks: AllTask[] = projects.flatMap(p =>
      p.tasks.map(t => ({ ...t, _source: "project" as const, _sourceName: p.name, _sourceId: p.id, _month: p.month }))
    );
    const customerTasks: AllTask[] = customers.flatMap(c =>
      c.tasks.map(t => ({ ...t, _source: "customer" as const, _sourceName: c.name, _sourceId: c.id, _month: c.month }))
    );
    return [...standalone, ...projectTasks, ...customerTasks];
  }, [tasks, projects, customers]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    allTasks.forEach(t => { if (t._month) months.add(t._month); });
    return [...months].sort();
  }, [allTasks]);

  const filtered = useMemo(() => {
    let result = allTasks;
    if (filterMonth !== "all") result = result.filter(t => t._month === filterMonth);
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
  }, [allTasks, search, priorityFilter, filterMonth]);

  const loading = loadingTasks || loadingProjects || loadingCustomers;

  const getColTasks = (col: TaskStatus) => filtered.filter(t => t.status === col);

  const handleDragEnd = (col: TaskStatus, colIndex: number) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const colT = getColTasks(col);
    const ids = colT.map(t => `${t._source}-${t.id}`);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(colT, oldIdx, newIdx);
    // Only persist standalone tasks; project/customer tasks are ordered in their own pages
    const standaloneReordered = reordered.filter(t => t._source === "standalone") as Task[];
    if (standaloneReordered.length > 0) {
      await reorderTasks(standaloneReordered, colIndex);
    }
  };

  const handleSave = async (form: Partial<AllTask>) => {
    const updates = { name: form.name, status: form.status, priority: form.priority, assigned_to: form.assigned_to, due_date: form.due_date, start_date: form.start_date, comments: form.comments };
    if (form.id && form._source === "project" && form.project_id) {
      await updateProjectTask(form.id, updates);
    } else if (form.id && form._source === "customer" && form.customer_id) {
      await updateCustomerTask(form.id, updates);
    } else if (form.id) {
      await updateTask(form.id, updates);
    } else {
      await addTask({ name: form.name!, status: form.status || "To Do", priority: form.priority || "Medium", assigned_to: form.assigned_to || [], due_date: form.due_date || "", start_date: form.start_date || "", comments: form.comments || "", task_type: "standalone" });
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
    if (task._source === "project") await updateProjectTask(task.id, { status: newStatus });
    else if (task._source === "customer") await updateCustomerTask(task.id, { status: newStatus });
    else await updateTask(task.id, { status: newStatus });
  };

  const navigateToSource = (task: AllTask) => {
    if (task._source === "project") navigate("/projects");
    else if (task._source === "customer") navigate("/customers");
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allTasks.length} total · {filtered.length} shown</p>
        </div>
        <button onClick={() => setModal({ open: true, task: null })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-5 animate-stagger-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
          </div>
          <div className="flex gap-1.5">
            {(["all", "High", "Medium", "Low"] as const).map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${priorityFilter === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {YEARS.map(y => (
              <button key={y} onClick={() => setFilterYear(y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterYear === y ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {y}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-border" />
          <button onClick={() => setFilterMonth("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMonth === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            All months
          </button>
          {availableMonths.map(m => (
            <button key={m} onClick={() => setFilterMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMonth === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              {monthNames[m]?.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-stagger-3">
        {COLUMNS.map((col, colIndex) => {
          const style = getColStyle(col);
          const colT = getColTasks(col);
          const ids = colT.map(t => `${t._source}-${t.id}`);
          return (
            <div key={col} className="kanban-col" style={{ background: style.bg, borderColor: style.border }}>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(col, colIndex)}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {colT.map(task => {
                      const cardId = `${task._source}-${task.id}`;
                      return (
                        <SortableCard key={cardId} id={cardId}>
                          <div className="bg-card rounded-xl pl-6 pr-3.5 py-3.5 border border-border/60 group card-hover">
                            {/* Source label + navigate */}
                            {task._source !== "standalone" && (
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {task._source === "project" ? "🚀" : "💼"} {task._sourceName}
                                  {task._month && <span className="ml-1 opacity-60">· {monthNames[task._month]?.slice(0, 3)}</span>}
                                </span>
                                <button
                                  onClick={() => navigateToSource(task)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[10px] text-primary font-medium hover:underline"
                                  title={`Go to ${task._source === "project" ? "Projects" : "Customers"}`}
                                >
                                  View <ArrowUpRight className="w-2.5 h-2.5" />
                                </button>
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
                                {/* All tasks are now editable */}
                                <button onClick={() => setModal({ open: true, task: { ...task, assigned_to: task.assigned_to || [] } })}
                                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                                  <Pencil className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <button onClick={() => handleDeleteTask(task)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors">
                                  <Trash2 className="w-3 h-3 text-destructive" />
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
                            <DaysBadge startDate={task.start_date} dueDate={task.due_date} status={task.status} />
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
                        </SortableCard>
                      );
                    })}
                    {colT.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
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

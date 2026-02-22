import { useState, useMemo, forwardRef, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, X, Save, ExternalLink, Search, ArrowUpRight, GripVertical, Clock, AlertTriangle } from "lucide-react";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import { useNavigate } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import type { Task } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, useDroppable,
  rectIntersection,
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
  employees: { name: string; avatar?: string }[];
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
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in overflow-y-auto max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }}>
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
            <MultiSelectAssignee
              selected={form.assigned_to || []}
              onChange={val => setForm({ ...form, assigned_to: val })}
              employees={employees}
            />
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Link</label>
            <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.link || ""} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
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

// Droppable column wrapper
function DroppableColumn({ id, children, style }: { id: string; children: React.ReactNode; style: { bg: string; border: string } }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="kanban-col transition-all duration-200"
      style={{
        background: style.bg,
        borderColor: isOver ? "hsl(var(--primary))" : style.border,
        boxShadow: isOver ? "0 0 0 2px hsl(var(--primary) / 0.2)" : "none",
      }}
    >
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
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const getColTasks = useCallback((col: TaskStatus) => filtered.filter(t => t.status === col), [filtered]);

  const getCardId = (t: AllTask) => `${t._source}-${t.id}`;

  const findTaskByCardId = useCallback((cardId: string): AllTask | undefined => {
    return filtered.find(t => getCardId(t) === cardId);
  }, [filtered]);

  // Find which column a card belongs to
  const findColumnOfCard = useCallback((cardId: string): TaskStatus | null => {
    const task = findTaskByCardId(cardId);
    return task ? (task.status as TaskStatus) : null;
  }, [findTaskByCardId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetCol: TaskStatus | null = null;

    // Check if dropping over a column directly
    if (COLUMNS.includes(overId as TaskStatus)) {
      targetCol = overId as TaskStatus;
    } else {
      // Dropping over another card — find that card's column
      targetCol = findColumnOfCard(overId);
    }

    if (!targetCol) return;

    const activeTask = findTaskByCardId(activeCardId);
    if (!activeTask || activeTask.status === targetCol) return;

    // Optimistically update the status so the card appears in the new column
    // We do this by updating the underlying data through the appropriate hook
    // But for smooth UX, we handle this in onDragEnd instead
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;
    const activeTask = findTaskByCardId(activeCardId);
    if (!activeTask) return;

    // Determine target column
    let targetCol: TaskStatus | null = null;
    if (COLUMNS.includes(overId as TaskStatus)) {
      targetCol = overId as TaskStatus;
    } else {
      targetCol = findColumnOfCard(overId);
    }

    if (!targetCol) return;

    // Cross-column move: update status
    if (activeTask.status !== targetCol) {
      const updates = { status: targetCol };
      if (activeTask._source === "project") {
        await updateProjectTask(activeTask.id, updates);
      } else if (activeTask._source === "customer") {
        await updateCustomerTask(activeTask.id, updates);
      } else {
        await updateTask(activeTask.id, updates);
      }
      toast({ title: `ย้ายงานไป ${targetCol} สำเร็จ!` });
      return;
    }

    // Same-column reorder
    if (activeCardId === overId) return;
    const colT = getColTasks(targetCol);
    const ids = colT.map(t => getCardId(t));
    const oldIdx = ids.indexOf(activeCardId);
    const newIdx = ids.indexOf(overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(colT, oldIdx, newIdx);
    const colIndex = COLUMNS.indexOf(targetCol);
    const standaloneReordered = reordered.filter(t => t._source === "standalone") as Task[];
    if (standaloneReordered.length > 0) {
      await reorderTasks(standaloneReordered, colIndex);
    }
  };

  const handleSave = async (form: Partial<AllTask>) => {
    const updates = { name: form.name, status: form.status, priority: form.priority, assigned_to: form.assigned_to, due_date: form.due_date, start_date: form.start_date, comments: form.comments, link: form.link };
    if (form.id && form._source === "project" && form.project_id) {
      await updateProjectTask(form.id, updates);
    } else if (form.id && form._source === "customer" && form.customer_id) {
      await updateCustomerTask(form.id, updates);
    } else if (form.id) {
      await updateTask(form.id, updates);
    } else {
      await addTask({ name: form.name!, status: form.status || "To Do", priority: form.priority || "Medium", assigned_to: form.assigned_to || [], due_date: form.due_date || "", start_date: form.start_date || "", comments: form.comments || "", link: form.link || "", task_type: "standalone" });
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

  const activeTask = activeId ? findTaskByCardId(activeId) : null;

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

      {/* Kanban — Single DndContext for cross-column drag */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-stagger-3">
          {COLUMNS.map((col) => {
            const style = getColStyle(col);
            const colT = getColTasks(col);
            const ids = colT.map(t => getCardId(t));
            return (
              <DroppableColumn key={col} id={col} style={style}>
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
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 min-h-[60px]">
                    {colT.map(task => {
                      const cardId = getCardId(task);
                      return (
                        <SortableCard key={cardId} id={cardId}>
                          <TaskCard
                            task={task}
                            col={col}
                            onEdit={() => setModal({ open: true, task: { ...task, assigned_to: task.assigned_to || [] } })}
                            onDelete={() => handleDeleteTask(task)}
                            onStatusToggle={() => handleStatusToggle(task)}
                            onNavigate={() => navigateToSource(task)}
                          />
                        </SortableCard>
                      );
                    })}
                    {colT.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 rotate-2 scale-105">
              <TaskCard
                task={activeTask}
                col={activeTask.status as TaskStatus}
                onEdit={() => {}}
                onDelete={() => {}}
                onStatusToggle={() => {}}
                onNavigate={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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

// Extracted TaskCard for reuse with DragOverlay
function TaskCard({ task, col, onEdit, onDelete, onStatusToggle, onNavigate }: {
  task: AllTask;
  col: TaskStatus;
  onEdit: () => void;
  onDelete: () => void;
  onStatusToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="bg-card rounded-xl pl-6 pr-3.5 py-3.5 border border-border/60 group card-hover">
      {/* Source label + navigate */}
      {task._source !== "standalone" && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {task._source === "project" ? "🚀" : "💼"} {task._sourceName}
            {task._month && <span className="ml-1 opacity-60">· {monthNames[task._month]?.slice(0, 3)}</span>}
          </span>
          <button
            onClick={onNavigate}
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
          <button onClick={onEdit}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
          <button onClick={onDelete}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>
      {/* Link preview */}
      {task.link && (
        <a href={task.link} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary mb-1.5 truncate max-w-full transition-colors">
          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{task.link.replace(/^https?:\/\//, "")}</span>
        </a>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={onStatusToggle}
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
  );
}

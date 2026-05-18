import { useState, useMemo, forwardRef, useCallback, useRef, useEffect } from "react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { Plus, Pencil, Trash2, ExternalLink, Search, ArrowUpRight, Clock, AlertTriangle, Layers } from "lucide-react";
import EditTaskModal from "@/components/EditTaskModal";
import { useNavigate } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import type { Task } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { filterDoneTasks } from "@/lib/taskFilters";
import { HideDoneToggle } from "@/components/HideDoneToggle";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskStatus = "To Do" | "In Progress" | "Done";
type TaskPriority = "Low" | "Medium" | "High";
const COLUMNS: TaskStatus[] = ["To Do", "In Progress", "Done"];
const YEARS = [2025, 2026, 2027];
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
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

function isOverdue(dueDate?: string, status?: string) {
  if (!dueDate || status === "Done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return today.getTime() > due.getTime();
}

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
    if (diff > 0) badges.push(
      <span key="o" className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ color: "hsl(0 84% 45%)", background: "hsl(0 84% 50% / 0.12)" }}>
        <AlertTriangle className="w-3 h-3" />เลย {diff}d
      </span>
    );
  }
  return badges.length > 0 ? <div className="flex items-center gap-1.5 mt-1">{badges}</div> : null;
}


// Sortable card wrapper
function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
      className={`relative cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
    >
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
  const { tasks, loading: loadingTasks, addTask, updateTask, deleteTask, refetch: refetchTasks } = useTasks();
  const { projects, loading: loadingProjects, updateTask: updateProjectTask, deleteTask: deleteProjectTask, refetch: refetchProjects } = useProjects();
  const { customers, loading: loadingCustomers, updateTask: updateCustomerTask, deleteTask: deleteCustomerTask, refetch: refetchCustomers } = useCustomers();
  const { employees } = useEmployees();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ open: boolean; task: Partial<AllTask> | null }>({ open: false, task: null });
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [filterMonth, setFilterMonth] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [groupByProject, setGroupByProject] = useState(false);
  const [showDone, setShowDone] = useState(() => localStorage.getItem("hideDoneTasks") !== "true");

  useEffect(() => {
    localStorage.setItem("hideDoneTasks", String(!showDone));
  }, [showDone]);

  const [confirmDelete, setConfirmDelete] = useState<AllTask | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 5 } }));

  // Keyboard shortcut: "N" to open New Task modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setModal({ open: true, task: null });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const [localTasks, setLocalTasks] = useState<AllTask[]>([]);

  // Build allTasks from all sources
  const allTasks = useMemo<AllTask[]>(() => {
    const standalone = tasks.map(t => ({ ...t, _source: "standalone" as const, _sourceName: undefined, _sourceId: undefined, _month: undefined }));
    const projectTasks: AllTask[] = projects.flatMap(p =>
      p.tasks.map(t => ({ ...t, _source: "project" as const, _sourceName: p.name, _sourceId: p.id, _month: p.month }))
    );
    const customerTasks: AllTask[] = customers.flatMap(c =>
      c.tasks.map(t => ({ ...t, _source: "customer" as const, _sourceName: c.name, _sourceId: c.id, _month: c.month }))
    );
    return [...standalone, ...projectTasks, ...customerTasks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [tasks, projects, customers]);

  // Keep localTasks in sync when allTasks changes
  useEffect(() => {
    setLocalTasks(allTasks);
  }, [allTasks]);

  // Unique source names for filter
  const sourceOptions = useMemo(() => {
    const names = new Map<string, string>();
    localTasks.forEach(t => {
      if (t._sourceName && t._source) {
        const key = `${t._source}:${t._sourceName}`;
        if (!names.has(key)) {
          names.set(key, `${t._source === "project" ? "🚀" : "💼"} ${t._sourceName}`);
        }
      }
    });
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [localTasks]);

  const filtered = useMemo(() => {
    let result = localTasks;
    // Year filter using start_date, due_date, or created_at; fallback to 2026
    result = result.filter(t => {
      const dateStr = t.start_date || t.due_date || t.created_at;
      const year = dateStr ? new Date(dateStr).getFullYear() : 2026;
      return year === filterYear;
    });
    if (filterMonth !== "all") result = result.filter(t => t._month === filterMonth);
    if (priorityFilter !== "all") result = result.filter(t => t.priority === priorityFilter);
    if (filterSource !== "all") {
      result = result.filter(t => {
        const key = `${t._source}:${t._sourceName}`;
        return key === filterSource;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.assigned_to?.some(a => a.toLowerCase().includes(q)) ||
        t._sourceName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [localTasks, search, priorityFilter, filterMonth, filterSource, filterYear]);

  // Hide Done tasks when the toggle is off (display-only).
  const visibleTasks = useMemo(() => filterDoneTasks(filtered, showDone), [filtered, showDone]);
  const visibleColumns = useMemo<TaskStatus[]>(
    () => (showDone ? COLUMNS : COLUMNS.filter(c => c !== "Done")),
    [showDone],
  );

  const loading = loadingTasks || loadingProjects || loadingCustomers;

  const getColTasks = useCallback((col: TaskStatus) => visibleTasks.filter(t => t.status === col), [visibleTasks]);

  const getCardId = (t: AllTask) => `${t._source}-${t.id}`;

  const findTaskByCardId = useCallback((cardId: string): AllTask | undefined => {
    return visibleTasks.find(t => getCardId(t) === cardId);
  }, [visibleTasks]);

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
  };

  // Persist sort_order for a list of tasks, regardless of source.
  // All tasks live in the same `tasks` table, so we can update by id directly.
  const persistOrder = async (orderedTasks: AllTask[], colIndex: number) => {
    const base = colIndex * 10000;
    await Promise.all(
      orderedTasks.map((t, idx) =>
        supabase.from("tasks").update({ sort_order: base + idx }).eq("id", t.id)
      )
    );
  };

  const refetchAll = async () => {
    await Promise.all([refetchTasks(), refetchProjects(), refetchCustomers()]);
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

    // Cross-column move: update status AND sort_order
    if (activeTask.status !== targetCol) {
      if (targetCol === "Done" && !activeTask.link && (!activeTask.comments || activeTask.comments.trim().length < 20)) {
        toast({
          title: "กรุณาเพิ่มรายละเอียดหรือ Link ก่อนปิดงาน",
          description: "Please add a note (≥20 chars) or a link before completing this task.",
          variant: "destructive",
        });
        return;
      }

      // Compute insertion index in the target column
      const targetColTasks = getColTasks(targetCol);
      let insertIdx = targetColTasks.length;
      if (!COLUMNS.includes(overId as TaskStatus)) {
        const overIdx = targetColTasks.findIndex(t => getCardId(t) === overId);
        if (overIdx !== -1) insertIdx = overIdx;
      }
      
      const movedTask: AllTask = { ...activeTask, status: targetCol };

      // Optimistic update
      setLocalTasks(prev => {
        const filteredList = prev.filter(t => getCardId(t) !== activeCardId);
        const colTasks = filteredList.filter(t => t.status === targetCol);
        const otherTasks = filteredList.filter(t => t.status !== targetCol);
        const updatedCol = [...colTasks];
        updatedCol.splice(insertIdx, 0, movedTask);
        return [...otherTasks, ...updatedCol];
      });

      const updates = { status: targetCol };
      try {
        if (activeTask._source === "project") {
          await updateProjectTask(activeTask.id, updates);
        } else if (activeTask._source === "customer") {
          await updateCustomerTask(activeTask.id, updates);
        } else {
          await updateTask(activeTask.id, updates);
        }
        const colTasksOptimistic = getColTasks(targetCol).filter(t => getCardId(t) !== activeCardId);
        const newCol = [...colTasksOptimistic];
        newCol.splice(insertIdx, 0, movedTask);
        const colIndex = COLUMNS.indexOf(targetCol);
        await persistOrder(newCol, colIndex);
        refetchAll();
      } catch (err) {
        console.error("Error persisting order:", err);
      }
      toast({ title: `ย้ายงานไป ${targetCol} สำเร็จ!` });
      return;
    }

    // Same-column reorder
    if (activeCardId === overId) return;
    const colT = getColTasks(targetCol);
    const ids = colT.map(t => getCardId(t));
    const oldIdx = ids.indexOf(activeCardId);
    let newIdx = ids.indexOf(overId);
    if (oldIdx === -1) return;
    if (newIdx === -1) newIdx = colT.length - 1; // dropped on column area
    
    const reordered = arrayMove(colT, oldIdx, newIdx);

    // Optimistic update
    setLocalTasks(prev => {
      const otherTasks = prev.filter(t => t.status !== targetCol);
      return [...otherTasks, ...reordered];
    });

    const colIndex = COLUMNS.indexOf(targetCol);
    try {
      await persistOrder(reordered, colIndex);
      refetchAll();
    } catch (err) {
      console.error("Error persisting same-column order:", err);
    }
  };

  const handleSave = async (form: Partial<AllTask>) => {
    try {
      const updates = { name: form.name, status: form.status, priority: form.priority, assigned_to: form.assigned_to, due_date: form.due_date, start_date: form.start_date, comments: form.comments, link: form.link, category: form.category || "none" };
      
      // Optimistic update
      if (form.id) {
        setLocalTasks(prev => prev.map(t => getCardId(t) === `${form._source}-${form.id}` ? { ...t, ...updates } : t));
      }

      if (form.id && form._source === "project" && form.project_id) {
        await updateProjectTask(form.id, updates);
      } else if (form.id && form._source === "customer" && form.customer_id) {
        await updateCustomerTask(form.id, updates);
      } else if (form.id) {
        await updateTask(form.id, updates);
      } else {
        await addTask({ name: form.name!, status: form.status || "To Do", priority: form.priority || "Medium", assigned_to: form.assigned_to || [], due_date: form.due_date || "", start_date: form.start_date || "", comments: form.comments || "", link: form.link || "", task_type: "standalone", category: form.category || "none" });
      }
      refetchAll();
    } catch (err) {
      console.error("Error saving data:", err);
    }
  };

  const handleDeleteTask = async (task: AllTask) => {
    // Optimistic update
    setLocalTasks(prev => prev.filter(t => getCardId(t) !== getCardId(task)));

    try {
      if (task._source === "project" && task.project_id) {
        await deleteProjectTask(task.id, task.project_id);
      } else if (task._source === "customer" && task.customer_id) {
        await deleteCustomerTask(task.id, task.customer_id);
      } else {
        await deleteTask(task.id);
      }
      refetchAll();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleStatusToggle = async (task: AllTask) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };
    const newStatus = nextStatus[task.status as TaskStatus] || "To Do";
    if (newStatus === "Done" && !task.link && (!task.comments || task.comments.trim().length < 20)) {
      toast({
        title: "กรุณาเพิ่มรายละเอียดหรือ Link ก่อนปิดงาน",
        description: "Please add a note (≥20 chars) or a link before completing this task.",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setLocalTasks(prev => prev.map(t => getCardId(t) === getCardId(task) ? { ...t, status: newStatus } : t));

    try {
      if (task._source === "project") await updateProjectTask(task.id, { status: newStatus });
      else if (task._source === "customer") await updateCustomerTask(task.id, { status: newStatus });
      else await updateTask(task.id, { status: newStatus });
      refetchAll();
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const navigateToSource = (task: AllTask) => {
    if (task._source === "project") navigate("/projects");
    else if (task._source === "customer") navigate("/customers");
  };

  const activeTask = activeId ? findTaskByCardId(activeId) : null;

  // Group tasks by project within a column
  const getGroupedColTasks = useCallback((col: TaskStatus) => {
    const colTasks = getColTasks(col);
    if (!groupByProject) return null;
    const groups = new Map<string, AllTask[]>();
    colTasks.forEach(t => {
      const key = t._sourceName || "Standalone Tasks";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });
    return groups;
  }, [getColTasks, groupByProject]);

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allTasks.length} total · {filtered.length} shown</p>
        </div>
        <button onClick={() => setModal({ open: true, task: null })} className="btn-primary flex items-center gap-2" title="เพิ่ม Task (กด N)">
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
          {/* Fix #3: Project/Customer filter */}
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none min-w-[160px]"
          >
            <option value="all">โครงการ / Customer ทั้งหมด</option>
            {sourceOptions.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setGroupByProject(g => !g)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${groupByProject ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
            title="จัดกลุ่มตามโครงการ"
          >
            <Layers className="w-3.5 h-3.5" />
            Group by Project
          </button>
          <HideDoneToggle hideDone={!showDone} setHideDone={(val) => setShowDone(!val)} />
        </div>
        {/* Fix #10: Show all 12 months with horizontal scroll */}
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
          <div ref={monthScrollRef} className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterMonth("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterMonth === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
              All months
            </button>
            {ALL_MONTHS.map(m => (
              <button key={m} onClick={() => setFilterMonth(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterMonth === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {monthNames[m]?.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban — Single DndContext for cross-column drag */}
      {/* Fix #1: columns align at top so page scrolls as one unit */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={`grid grid-cols-1 ${showDone ? "md:grid-cols-3" : "md:grid-cols-2"} gap-5 items-start animate-stagger-3`}>
          {visibleColumns.map((col) => {
            const style = getColStyle(col);
            const colT = getColTasks(col);
            const ids = colT.map(t => getCardId(t));
            const grouped = getGroupedColTasks(col);
            return (
              <DroppableColumn key={col} id={col} style={style}>
                {/* Sticky column header */}
                <div className="flex items-center justify-between mb-4 sticky top-0 z-10 py-1" style={{ background: style.bg }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col === "Done" ? "bg-green-500" : col === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                    <span className="text-sm font-semibold text-foreground">{col}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colT.length}</span>
                  </div>
                  {/* Fix #4: Bigger + button with tooltip and hover effect */}
                  {col === "To Do" && (
                    <button onClick={() => setModal({ open: true, task: { status: col } })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground hover:scale-110"
                      title="เพิ่ม Task">
                      <Plus className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 min-h-[60px]">
                    {/* Fix #7: Group by Project rendering */}
                    {groupByProject && grouped ? (
                      [...grouped.entries()].map(([groupName, groupTasks]) => (
                        <div key={groupName}>
                          <div className="flex items-center gap-1.5 mb-2 mt-1">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{groupName}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
                          </div>
                          {groupTasks.map(task => {
                            const cardId = getCardId(task);
                            return (
                              <div key={cardId} className="mb-3">
                                <SortableCard id={cardId}>
                                  <TaskCard
                                    task={task}
                                    col={col}
                                    onEdit={() => setModal({ open: true, task: { ...task, assigned_to: task.assigned_to || [] } })}
                                    onDelete={() => setConfirmDelete(task)}
                                    onStatusToggle={() => handleStatusToggle(task)}
                                    onNavigate={() => navigateToSource(task)}
                                    employees={employees}
                                  />
                                </SortableCard>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      colT.map(task => {
                        const cardId = getCardId(task);
                        return (
                          <SortableCard key={cardId} id={cardId}>
                            <TaskCard
                              task={task}
                              col={col}
                              onEdit={() => setModal({ open: true, task: { ...task, assigned_to: task.assigned_to || [] } })}
                              onDelete={() => setConfirmDelete(task)}
                              onStatusToggle={() => handleStatusToggle(task)}
                              onNavigate={() => navigateToSource(task)}
                              employees={employees}
                            />
                          </SortableCard>
                        );
                      })
                    )}
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
            <div className="opacity-95 shadow-card-hover">
              <TaskCard
                task={activeTask}
                col={activeTask.status as TaskStatus}
                onEdit={() => {}}
                onDelete={() => {}}
                onStatusToggle={() => {}}
                onNavigate={() => {}}
                employees={employees}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <EditTaskModal
        isOpen={modal.open}
        task={modal.task}
        employees={employees}
        onSave={handleSave}
        onClose={() => setModal({ open: false, task: null })}
      />

      <ConfirmDeleteDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        onConfirm={() => { if (confirmDelete) { handleDeleteTask(confirmDelete); setConfirmDelete(null); } }}
        description={`ต้องการลบงาน "${confirmDelete?.name}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
      />
    </div>
  );
}

// Extracted TaskCard for reuse with DragOverlay
function TaskCard({ task, col, onEdit, onDelete, onStatusToggle, onNavigate, employees }: {
  task: AllTask;
  col: TaskStatus;
  onEdit: () => void;
  onDelete: () => void;
  onStatusToggle: () => void;
  onNavigate: () => void;
  employees?: { name: string; avatar?: string | null }[];
}) {
  const overdue = isOverdue(task.due_date, task.status);
  return (
    <div
      className={`bg-card rounded-xl px-3.5 py-3.5 border group card-hover ${overdue ? "border-l-[3px] border-l-red-400 border-t-border/60 border-r-border/60 border-b-border/60" : "border-border/60"}`}
      style={overdue ? { background: "hsl(0 84% 60% / 0.03)" } : undefined}
      onDoubleClick={onEdit}
    >
      {/* Source label + navigate */}
      {task._source !== "standalone" && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {task._source === "project" ? "🚀" : "💼"} {task._sourceName}
            {task._month && <span className="ml-1 opacity-60">· {monthNames[task._month]?.slice(0, 3)}</span>}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
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
            <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <ExternalLink className="w-3 h-3 text-primary" />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>
      {/* Link preview */}
      {task.link && (
        <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary mb-1.5 truncate max-w-full transition-colors">
          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{task.link.replace(/^https?:\/\//, "")}</span>
        </a>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={(e) => { e.stopPropagation(); onStatusToggle(); }}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all hover:scale-105 cursor-pointer ${col === "Done" ? "badge-done" : col === "In Progress" ? "badge-progress" : "badge-todo"}`}>
          {task.status}
        </button>
        <PriorityBadge priority={task.priority} />
        {task.category && task.category !== "none" && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${task.category === "meeting" ? "bg-violet-100 text-violet-700" : "bg-rose-100 text-rose-700"}`}>
            {task.category === "meeting" ? "🗓 Meeting" : "📍 On-site"}
          </span>
        )}
        {task.due_date && (
          <span className="text-xs text-muted-foreground">
            📅 {new Date(task.due_date).toLocaleDateString("th", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
      <DaysBadge startDate={task.start_date} dueDate={task.due_date} status={task.status} />
      {task.assigned_to && task.assigned_to.length > 0 && (
        <div className="flex items-center mt-2">
          {task.assigned_to.slice(0, 3).map((a, i) => {
            const emp = employees?.find(e => e.name === a);
            return (
              <div key={i} className="-ml-1 first:ml-0">
                <EmployeeAvatar name={a} avatar={emp?.avatar} size="xs" index={i} className="border-2 border-card" />
              </div>
            );
          })}
          {task.assigned_to.length > 3 && <span className="text-xs text-muted-foreground ml-1">+{task.assigned_to.length - 3}</span>}
        </div>
      )}
      {/* Fix #5: Consistent notes area — always show min height, truncate at 2 lines */}
      <div className="mt-2 min-h-[2rem]">
        {task.comments ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{task.comments}</p>
        ) : (
          <p className="text-xs text-muted-foreground/40 leading-relaxed italic">—</p>
        )}
      </div>
    </div>
  );
}

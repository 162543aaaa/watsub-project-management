import { useState, useMemo, forwardRef, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import LoadingScreen from "@/components/LoadingScreen";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowTopRightOnSquareIcon, ArrowUpRightIcon, ClockIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, QueueListIcon, TrashIcon } from '@heroicons/react/24/solid';
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
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, useDroppable, MeasuringStrategy, defaultDropAnimationSideEffects,
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
  if (col === "Done") return { bg: "hsl(var(--card))", border: "hsl(140 60% 50% / 0.35)" };
  if (col === "In Progress") return { bg: "hsl(var(--card))", border: "hsl(200 80% 55% / 0.35)" };
  return { bg: "hsl(var(--card))", border: "hsl(var(--border))" };
}

const PriorityBadge = forwardRef<HTMLSpanElement, { priority?: string }>(({ priority }, ref) => {
  if (!priority) return null;
  const colors = priority === "High" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
    : priority === "Medium" ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  return (
    <span ref={ref} className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${colors}`}>
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
    if (diff >= 0) badges.push(<span key="s" className="inline-flex items-center gap-0.5 text-[9px] font-medium" style={{ color: "hsl(191 91% 30%)" }}><ClockIcon className="w-2.5 h-2.5" />{diff}d</span>);
  }
  if (dueDate && status !== "Done") {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) badges.push(
      <span key="o" className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ color: "hsl(0 84% 45%)", background: "hsl(0 84% 50% / 0.12)" }}>
        <ExclamationTriangleIcon className="w-3 h-3" />เลย {diff}d
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
      style={{ 
        transform: CSS.Translate.toString(transform), 
        transition, 
        opacity: isDragging ? 0.5 : 1, 
        touchAction: "none"
      }}
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
      className="kanban-col transition-all duration-200 rounded-xl border"
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
      const task_type: Task["task_type"] =
        form.task_type === "project" ? "project" : form.task_type === "customer" ? "customer" : "standalone";
      const project_id = task_type === "project" ? (form.project_id ?? null) : null;
      const customer_id = task_type === "customer" ? (form.customer_id ?? null) : null;

      const updates = {
        name: form.name,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to,
        due_date: form.due_date,
        start_date: form.start_date,
        comments: form.comments,
        link: form.link,
        category: form.category || "none",
        task_type,
        project_id,
        customer_id,
      };

      if (form.id) {
        // Update directly on tasks table so parent re-assignment works across sources
        const { error } = await supabase.from("tasks").update(updates).eq("id", form.id);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "อัปเดตงานสำเร็จ!" });
      } else {
        await addTask({
          name: form.name!,
          status: form.status || "To Do",
          priority: form.priority || "Medium",
          assigned_to: form.assigned_to || [],
          due_date: form.due_date || "",
          start_date: form.start_date || "",
          comments: form.comments || "",
          link: form.link || "",
          task_type,
          project_id: project_id ?? undefined,
          customer_id: customer_id ?? undefined,
          category: form.category || "none",
        });
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

  if (loading) return <LoadingScreen />;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5 mb-5 animate-stagger-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks Management</h1>
          <p className="text-sm text-muted-foreground mt-1">ติดตาม ตรวจสอบ และจัดการงานทั้งหมดภายในองค์กรของคุณ</p>
        </div>
        <button onClick={() => setModal({ open: true, task: null })} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 h-10 shadow-sm" title="เพิ่ม Task (กด N)">
          <PlusIcon className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-card border border-border rounded-xl mb-5 animate-stagger-2 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            </div>
            <div className="flex gap-1.5">
              {(["all", "High", "Medium", "Low"] as const).map(p => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${priorityFilter === p ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"}`}>
                  {p === "all" ? "All" : p}
                </button>
              ))}
            </div>
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none min-w-[160px]"
            >
              <option value="all">โครงการ / Customer ทั้งหมด</option>
              {sourceOptions.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => setGroupByProject(g => !g)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${groupByProject ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"}`}
              title="จัดกลุ่มตามโครงการ"
            >
              <QueueListIcon className="w-3.5 h-3.5" />
              Group by Project
            </button>
            <HideDoneToggle hideDone={!showDone} setHideDone={(val) => setShowDone(!val)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <div className="flex gap-1">
              {YEARS.map(y => (
                <button key={y} onClick={() => setFilterYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterYear === y ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"}`}>
                  {y}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            <div ref={monthScrollRef} className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button onClick={() => setFilterMonth("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterMonth === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"}`}>
                All months
              </button>
              {ALL_MONTHS.map(m => (
                <button key={m} onClick={() => setFilterMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterMonth === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"}`}>
                  {monthNames[m]?.slice(0, 3)}
                </button>
              ))}
            </div>
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
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="flex gap-5 items-start overflow-x-auto snap-x pb-4 md:grid md:overflow-visible md:snap-none animate-stagger-3" style={{ gridTemplateColumns: showDone ? "repeat(3, minmax(280px, 1fr))" : "repeat(2, minmax(280px, 1fr))" }}>
          {visibleColumns.map((col) => {
            const style = getColStyle(col);
            const colT = getColTasks(col);
            const ids = colT.map(t => getCardId(t));
            const grouped = getGroupedColTasks(col);
            return (
              <div key={col} className="min-w-[300px] md:min-w-0 snap-center flex-shrink-0 md:flex-shrink w-full">
              <DroppableColumn id={col} style={style}>
                {/* Sticky column header */}
                <div className="flex items-center justify-between mb-4 sticky top-0 z-10 py-3 px-3 bg-card border-b border-border rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col === "Done" ? "bg-emerald-500" : col === "In Progress" ? "bg-sky-500" : "bg-slate-400"}`} />
                    <span className="text-sm font-semibold text-foreground">{col}</span>
                    <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded-full">{colT.length}</span>
                  </div>
                  {col === "To Do" && (
                    <button onClick={() => setModal({ open: true, task: { status: col } })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="เพิ่ม Task">
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-3 min-h-[100px] p-3">
                    {/* Fix #7: Group by Project rendering */}
                    {groupByProject && grouped ? (
                      [...grouped.entries()].map(([groupName, groupTasks]) => (
                        <div key={groupName} className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 mb-1 mt-1">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{groupName}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
                          </div>
                          <div className="flex flex-col gap-3">
                            {groupTasks.map(task => {
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
                            })}
                          </div>
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
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <p className="text-xs text-muted-foreground">No tasks here yet</p>
                        <button
                          onClick={() => setModal({ open: true, task: { status: col } })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary hover:bg-secondary transition-colors"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          Click here to add a new task
                        </button>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay */}
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="opacity-95 shadow-2xl cursor-grabbing w-full" style={{ transform: "none", width: "100%" }}>
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
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <EditTaskModal
        isOpen={modal.open}
        task={modal.task}
        employees={employees}
        onSave={handleSave}
        projects={projects.map(p => ({ id: p.id, name: p.name, month: p.month }))}
        customers={customers.map(c => ({ id: c.id, name: c.name, month: c.month }))}
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
      className={`bg-card rounded-xl px-3.5 py-3.5 border group transition-all duration-200 shadow-sm hover:shadow-md ${overdue ? "border-destructive/40 shadow-[0_0_10px_rgba(239,68,68,0.05)]" : "border-border"}`}
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
            View <ArrowUpRightIcon className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-foreground leading-snug flex-1">{task.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.link && (
            <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <ArrowTopRightOnSquareIcon className="w-3 h-3 text-primary" />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <PencilIcon className="w-3 h-3 text-muted-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors">
            <TrashIcon className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>
      {/* Link preview */}
      {task.link && (
        <a href={task.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary mb-1.5 truncate max-w-full transition-colors">
          <ArrowTopRightOnSquareIcon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{task.link.replace(/^https?:\/\//, "")}</span>
        </a>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={(e) => { e.stopPropagation(); onStatusToggle(); }}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${col === "Done" ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" : col === "In Progress" ? "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"}`}>
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
        <div className="flex items-center mt-2 -space-x-2">
          {task.assigned_to.slice(0, 3).map((a, i) => {
            const emp = employees?.find(e => e.name === a);
            return (
              <div key={i} className="">
                <EmployeeAvatar name={a} avatar={emp?.avatar} size="xs" index={i} className="border-2 border-black/50" />
              </div>
            );
          })}
          {task.assigned_to.length > 3 && <span className="text-xs text-muted-foreground ml-3">+{task.assigned_to.length - 3}</span>}
        </div>
      )}
      {/* Description: single line clamp */}
      {task.comments && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-1">{task.comments}</p>
      )}
    </div>
  );
}

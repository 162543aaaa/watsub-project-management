import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X, ExternalLink, Clock, MapPin, Users } from "lucide-react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { toast } from "@/hooks/use-toast";

type TaskStatus = "To Do" | "In Progress" | "Done";
type CalendarItemType = "task" | "meeting" | "onsite";

interface CalendarItem {
  id: string;
  name: string;
  type: CalendarItemType;
  status?: TaskStatus;
  category?: string;
  date: string;
  priority?: string;
  assigned_to?: string[];
  comments?: string;
  link?: string;
  taskType?: "standalone" | "project" | "customer";
  projectId?: string;
  customerId?: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  note?: string | null;
  participants?: string[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const getItemStyle = (item: CalendarItem) => {
  if (item.type === "meeting") return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  if (item.type === "onsite") return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (item.category === "meeting") return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  if (item.category === "onsite") return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (item.status === "Done") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (item.status === "In Progress") return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
  return "bg-muted text-muted-foreground";
};

const getItemIcon = (item: CalendarItem) => {
  if (item.type === "meeting" || item.category === "meeting") return "🗓 ";
  if (item.type === "onsite" || item.category === "onsite") return "📍 ";
  return "";
};

/* ── Draggable calendar item ── */
function DraggableItem({ item, onClick }: { item: CalendarItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.type}-${item.id}`,
    data: item,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
      }}
      title={item.name}
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-grab active:cursor-grabbing hover:brightness-95 transition-all ${getItemStyle(item)}`}
    >
      {getItemIcon(item)}{item.name}
    </div>
  );
}

/* ── Droppable day cell ── */
function DroppableDay({ dateStr, isToday, children }: { dateStr: string; isToday: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] border-b border-r border-border/40 p-2 transition-all duration-200 ${
        isOver ? "bg-primary/10 ring-2 ring-primary/30 ring-inset" : isToday ? "bg-primary/5" : "hover:bg-muted/30"
      }`}
    >
      {children}
    </div>
  );
}

/* ── Item detail modal ── */
function ItemDetailModal({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getItemStyle(item)}`}>
              {item.type === "meeting" ? "🗓 Meeting" : item.type === "onsite" ? "📍 On-site" : item.status || "Task"}
            </span>
            {item.priority && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                item.priority === "High" ? "badge-high" : item.priority === "Medium" ? "badge-medium" : "badge-low"
              }`}>{item.priority}</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h3 className="text-lg font-bold mb-3">{item.name}</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span>{new Date(item.date).toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          {item.startTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{item.startTime}{item.endTime ? ` - ${item.endTime}` : ""}</span>
            </div>
          )}
          {item.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{item.location}</span>
            </div>
          )}
          {((item.assigned_to && item.assigned_to.length > 0) || (item.participants && item.participants.length > 0)) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{(item.assigned_to || item.participants || []).join(", ")}</span>
            </div>
          )}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.link.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          {(item.comments || item.note) && (
            <p className="text-muted-foreground mt-2 p-3 bg-muted/50 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">{item.comments || item.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Day detail modal ("+N more") ── */
function DayDetailModal({ dateStr, items, onClose, onSelectItem }: {
  dateStr: string;
  items: CalendarItem[];
  onClose: () => void;
  onSelectItem: (item: CalendarItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm animate-scale-in max-h-[80vh] overflow-y-auto" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {new Date(dateStr).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => onSelectItem(item)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-95 ${getItemStyle(item)}`}
            >
              {getItemIcon(item)}{item.name}
              {item.status && <span className="ml-2 text-[10px] opacity-70">({item.status})</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Calendar Page ── */
export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [filterType, setFilterType] = useState<"all" | CalendarItemType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; items: CalendarItem[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { tasks: standaloneTasks, updateTask: updateStandaloneTask } = useTasks();
  const { projects, updateTask: updateProjectTask } = useProjects();
  const { customers, updateTask: updateCustomerTask } = useCustomers();
  const { meetings, updateMeeting } = useMeetings();
  const { onsiteWork, updateOnsiteWork } = useOnsiteWork();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ── Build items from all sources ── */
  const allItems = useMemo<CalendarItem[]>(() => {
    const standalone = standaloneTasks.filter(t => t.due_date).map(t => ({
      id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
      category: t.category, date: t.due_date!, priority: t.priority,
      assigned_to: t.assigned_to, comments: t.comments, link: t.link,
      taskType: "standalone" as const,
    }));
    const projectTasks = projects.flatMap(p =>
      p.tasks.filter(t => t.due_date).map(t => ({
        id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
        category: t.category, date: t.due_date!, priority: t.priority,
        assigned_to: t.assigned_to, comments: t.comments, link: t.link,
        taskType: "project" as const, projectId: p.id,
      }))
    );
    const customerTasks = customers.flatMap(c =>
      c.tasks.filter(t => t.due_date).map(t => ({
        id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
        category: t.category, date: t.due_date!, priority: t.priority,
        assigned_to: t.assigned_to, comments: t.comments, link: t.link,
        taskType: "customer" as const, customerId: c.id,
      }))
    );
    const meetingItems = meetings.map(m => ({
      id: m.id, name: m.title, type: "meeting" as const, date: m.meeting_date,
      startTime: m.start_time, endTime: m.end_time, location: m.location,
      note: m.note, participants: m.participants,
    }));
    const onsiteItems = onsiteWork.map(o => ({
      id: o.id, name: o.title, type: "onsite" as const, date: o.work_date,
      location: o.location, note: o.note, participants: o.participants,
    }));
    return [...standalone, ...projectTasks, ...customerTasks, ...meetingItems, ...onsiteItems];
  }, [standaloneTasks, projects, customers, meetings, onsiteWork]);

  /* ── Filter ── */
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterType !== "all") items = items.filter(i => i.type === filterType);
    if (filterStatus !== "all") items = items.filter(i => i.type !== "task" || i.status === filterStatus);
    return items;
  }, [allItems, filterType, filterStatus]);

  /* ── Calendar helpers ── */
  const daysInMonth = getDaysInMonth(current.year, current.month);
  const firstDay = getFirstDayOfMonth(current.year, current.month);
  const monthName = new Date(current.year, current.month, 1).toLocaleString("en", { month: "long" });
  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  const goToday = () => setCurrent({ year: today.getFullYear(), month: today.getMonth() });

  const getItemsForDay = (day: number) => {
    const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredItems.filter(t => t.date?.startsWith(dateStr));
  };

  /* ── Drag & Drop ── */
  const findItemByDndId = (dndId: string): CalendarItem | undefined =>
    filteredItems.find(i => `${i.type}-${i.id}` === dndId);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const item = findItemByDndId(active.id as string);
    if (!item) return;

    const newDate = over.id as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    if (item.date === newDate) return;

    if (item.type === "meeting") {
      await updateMeeting(item.id, { meeting_date: newDate });
    } else if (item.type === "onsite") {
      await updateOnsiteWork(item.id, { work_date: newDate });
    } else if (item.taskType === "project") {
      await updateProjectTask(item.id, { due_date: newDate });
    } else if (item.taskType === "customer") {
      await updateCustomerTask(item.id, { due_date: newDate });
      toast({ title: "ย้ายวันสำเร็จ!" });
    } else {
      await updateStandaloneTask(item.id, { due_date: newDate });
    }
  };

  const activeItem = activeId ? findItemByDndId(activeId) : null;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const typeFilters: { value: "all" | CalendarItemType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "task", label: "Tasks" },
    { value: "meeting", label: "🗓 Meetings" },
    { value: "onsite", label: "📍 On-site" },
  ];
  const statusFilters: { value: "all" | TaskStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "To Do", label: "To Do" },
    { value: "In Progress", label: "In Progress" },
    { value: "Done", label: "Done" },
  ];

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredItems.length} items on calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> Today
          </button>
          <button onClick={prev} aria-label="Previous month" className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-bold text-foreground min-w-[140px] text-center">{monthName} {current.year}</span>
          <button onClick={next} aria-label="Next month" className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 animate-stagger-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type:</span>
        {typeFilters.map(f => (
          <button key={f.value} onClick={() => setFilterType(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {f.label}
          </button>
        ))}
        <div className="w-px h-4 bg-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status:</span>
        {statusFilters.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar grid with DnD */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-card rounded-2xl border border-border overflow-hidden animate-stagger-3" style={{ boxShadow: "var(--shadow-sm)" }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {days.map(d => (
              <div key={d} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border/40 bg-muted/20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = current.year === today.getFullYear() && current.month === today.getMonth() && day === today.getDate();
              const dayItems = getItemsForDay(day);
              return (
                <DroppableDay key={day} dateStr={dateStr} isToday={isToday}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <DraggableItem
                        key={`${item.type}-${item.id}`}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <button
                        onClick={() => setSelectedDay({ dateStr, items: dayItems })}
                        className="text-[10px] text-primary font-medium px-1 hover:underline cursor-pointer"
                      >
                        +{dayItems.length - 3} more
                      </button>
                    )}
                  </div>
                </DroppableDay>
              );
            })}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeItem && (
            <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg cursor-grabbing ${getItemStyle(activeItem)}`}>
              {getItemIcon(activeItem)}{activeItem.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          dateStr={selectedDay.dateStr}
          items={selectedDay.items}
          onClose={() => setSelectedDay(null)}
          onSelectItem={(item) => { setSelectedDay(null); setSelectedItem(item); }}
        />
      )}
    </div>
  );
}

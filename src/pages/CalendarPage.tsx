import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X, ExternalLink, Clock, MapPin, Users, RotateCcw, Plus, Trash2 } from "lucide-react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { useHolidays } from "@/hooks/useHolidays";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TaskStatus = "To Do" | "In Progress" | "Done";
type CalendarItemType = "task" | "meeting" | "onsite" | "holiday";
type TaskSource = "standalone" | "project" | "customer";

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
  taskType?: TaskSource;
  projectId?: string;
  customerId?: string;
  sourceName?: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  note?: string | null;
  participants?: string[];
  holidayType?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const getItemStyle = (item: CalendarItem) => {
  if (item.type === "holiday") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (item.type === "meeting") return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  if (item.type === "onsite") return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (item.category === "meeting") return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  if (item.category === "onsite") return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (item.status === "Done") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (item.status === "In Progress") return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
  return "bg-muted text-muted-foreground";
};

const getItemIcon = (item: CalendarItem) => {
  if (item.type === "holiday") return "🎉 ";
  if (item.type === "meeting" || item.category === "meeting") return "🗓 ";
  if (item.type === "onsite" || item.category === "onsite") return "📍 ";
  return "";
};

/* ── Draggable calendar item ── */
function DraggableItem({ item, onClick }: { item: CalendarItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.type}-${item.id}`,
    data: item,
    disabled: item.type === "holiday",
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
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${item.type !== "holiday" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} hover:brightness-95 transition-all ${getItemStyle(item)}`}
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
              {item.type === "holiday" ? "🎉 วันหยุด" : item.type === "meeting" ? "🗓 Meeting" : item.type === "onsite" ? "📍 On-site" : item.status || "Task"}
            </span>
            {item.holidayType && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                {item.holidayType === "government" ? "วันหยุดราชการ" : item.holidayType === "islamic" ? "วันหยุดอิสลาม" : "วันหยุดสตูดิโอ"}
              </span>
            )}
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
        <h3 className="text-lg font-bold mb-1">{item.name}</h3>
        {item.sourceName && item.sourceName !== "Standalone" && (
          <p className="text-xs text-muted-foreground mb-3">
            {item.taskType === "project" ? "🚀" : "💼"} {item.sourceName}
          </p>
        )}
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

/* ── Day detail modal ── */
function DayDetailModal({ dateStr, items, onClose, onSelectItem }: {
  dateStr: string; items: CalendarItem[]; onClose: () => void; onSelectItem: (item: CalendarItem) => void;
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

/* ── Add Holiday Modal ── */
function AddHolidayModal({ onClose, onAdd }: { onClose: () => void; onAdd: (h: { name: string; holiday_date: string; holiday_type: string; color_tag: string | null }) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("government");

  const handleSubmit = () => {
    if (!name || !date) { toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return; }
    onAdd({ name, holiday_date: date, holiday_type: type, color_tag: null });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">เพิ่มวันหยุด</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อวันหยุด</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น วันสงกรานต์" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">วันที่</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ประเภท</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="government">วันหยุดราชการ</SelectItem>
                <SelectItem value="islamic">วันหยุดอิสลาม</SelectItem>
                <SelectItem value="studio">วันหยุดสตูดิโอ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={handleSubmit} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            เพิ่มวันหยุด
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Calendar Page ── */
export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [filterCategory, setFilterCategory] = useState<"all" | "meeting" | "onsite" | "holiday">("all");
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; items: CalendarItem[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);

  const { tasks: standaloneTasks, updateTask: updateStandaloneTask } = useTasks();
  const { projects, updateTask: updateProjectTask } = useProjects();
  const { customers, updateTask: updateCustomerTask } = useCustomers();
  const { meetings, updateMeeting } = useMeetings();
  const { onsiteWork, updateOnsiteWork } = useOnsiteWork();
  const { holidays, addHoliday, deleteHoliday } = useHolidays();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ── Build items from all sources ── */
  const allItems = useMemo<CalendarItem[]>(() => {
    const standalone = standaloneTasks.filter(t => t.due_date).map(t => ({
      id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
      category: t.category, date: t.due_date!, priority: t.priority,
      assigned_to: t.assigned_to, comments: t.comments, link: t.link,
      taskType: "standalone" as const, sourceName: "Standalone",
    }));
    const projectTasks = projects.flatMap(p =>
      p.tasks.filter(t => t.due_date).map(t => ({
        id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
        category: t.category, date: t.due_date!, priority: t.priority,
        assigned_to: t.assigned_to, comments: t.comments, link: t.link,
        taskType: "project" as const, projectId: p.id, sourceName: p.name,
      }))
    );
    const customerTasks = customers.flatMap(c =>
      c.tasks.filter(t => t.due_date).map(t => ({
        id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
        category: t.category, date: t.due_date!, priority: t.priority,
        assigned_to: t.assigned_to, comments: t.comments, link: t.link,
        taskType: "customer" as const, customerId: c.id, sourceName: c.name,
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
    const holidayItems = holidays.map(h => ({
      id: h.id, name: h.name, type: "holiday" as const, date: h.holiday_date,
      holidayType: h.holiday_type,
    }));
    return [...standalone, ...projectTasks, ...customerTasks, ...meetingItems, ...onsiteItems, ...holidayItems];
  }, [standaloneTasks, projects, customers, meetings, onsiteWork, holidays]);

  /* ── Filter ── */
  const hasActiveFilters = filterCategory !== "all";

  const filteredItems = useMemo(() => {
    if (filterCategory === "all") {
      // "ทั้งหมด" excludes meetings and onsite, shows tasks + holidays
      return allItems.filter(i => i.type !== "meeting" && i.type !== "onsite" && i.category !== "meeting" && i.category !== "onsite");
    }
    if (filterCategory === "meeting") return allItems.filter(i => i.type === "meeting" || (i.type === "task" && i.category === "meeting"));
    if (filterCategory === "onsite") return allItems.filter(i => i.type === "onsite" || (i.type === "task" && i.category === "onsite"));
    if (filterCategory === "holiday") return allItems.filter(i => i.type === "holiday");
    return allItems;
  }, [allItems, filterCategory]);

  const resetFilters = () => setFilterCategory("all");

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
    if (!item || item.type === "holiday") return;

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
    } else {
      await updateStandaloneTask(item.id, { due_date: newDate });
    }
    toast({ title: "ย้ายวันสำเร็จ!" });
  };

  const activeItem = activeId ? findItemByDndId(activeId) : null;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredItems.length}{filteredItems.length !== allItems.length ? ` / ${allItems.length}` : ""} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddHoliday(true)} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> เพิ่มวันหยุด
          </button>
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
        {(["all", "meeting", "onsite", "holiday"] as const).map(v => (
          <button key={v} onClick={() => setFilterCategory(v)} className={chipClass(filterCategory === v)}>
            {v === "all" ? "ทั้งหมด" : v === "meeting" ? "🗓 Meetings" : v === "onsite" ? "📍 On-site Work" : "🎉 วันหยุด"}
          </button>
        ))}
        {hasActiveFilters && (
          <button onClick={resetFilters} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Calendar grid with DnD */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-card rounded-2xl border border-border overflow-hidden animate-stagger-3" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="grid grid-cols-7 border-b border-border">
            {days.map(d => (
              <div key={d} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
            ))}
          </div>
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
                      <DraggableItem key={`${item.type}-${item.id}`} item={item} onClick={() => setSelectedItem(item)} />
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

        <DragOverlay>
          {activeItem && (
            <div className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg cursor-grabbing ${getItemStyle(activeItem)}`}>
              {getItemIcon(activeItem)}{activeItem.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {selectedItem && <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {selectedDay && (
        <DayDetailModal dateStr={selectedDay.dateStr} items={selectedDay.items} onClose={() => setSelectedDay(null)}
          onSelectItem={(item) => { setSelectedDay(null); setSelectedItem(item); }} />
      )}
      {showAddHoliday && <AddHolidayModal onClose={() => setShowAddHoliday(false)} onAdd={addHoliday} />}
    </div>
  );
}

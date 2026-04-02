import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarDays, X, ExternalLink, Clock, MapPin, Users, RotateCcw, Plus, Trash2, Pencil, Save } from "lucide-react";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import { useEmployees } from "@/hooks/useEmployees";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  holidayOriginalId?: string;
  holidayStartDate?: string;
  holidayEndDate?: string;
  start_date?: string;
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
function DraggableItem({ item, onClick, onDoubleClick }: { item: CalendarItem; onClick: () => void; onDoubleClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.type}-${item.id}`,
    data: item,
    disabled: item.type === "holiday",
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
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

/* ── Item detail modal (updated with holiday edit/delete) ── */
function ItemDetailModal({ item, onClose, onEditHoliday, onDeleteHoliday }: {
  item: CalendarItem; onClose: () => void;
  onEditHoliday?: (id: string) => void;
  onDeleteHoliday?: (id: string, name: string) => void;
}) {
  const isHoliday = item.type === "holiday" && item.holidayOriginalId;
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
            <span>
              {isHoliday && item.holidayStartDate && item.holidayEndDate && item.holidayStartDate !== item.holidayEndDate
                ? `${new Date(item.holidayStartDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })} — ${new Date(item.holidayEndDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`
                : new Date(item.date).toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              }
            </span>
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

        {/* Holiday action buttons */}
        {isHoliday && (
          <div className="flex gap-3 mt-5 pt-4 border-t border-border">
            <button
              onClick={() => onEditHoliday?.(item.holidayOriginalId!)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" /> แก้ไข
            </button>
            <button
              onClick={() => onDeleteHoliday?.(item.holidayOriginalId!, item.name)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> ลบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Day detail modal ── */
function DayDetailModal({ dateStr, items, onClose, onSelectItem, onDoubleClickItem }: {
  dateStr: string; items: CalendarItem[]; onClose: () => void; onSelectItem: (item: CalendarItem) => void;
  onDoubleClickItem?: (item: CalendarItem) => void;
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
              onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickItem?.(item); }}
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

/* ── Add/Edit Holiday Modal ── */
function HolidayFormModal({ onClose, onSubmit, initial }: {
  onClose: () => void;
  onSubmit: (h: { name: string; holiday_date: string; holiday_type: string; color_tag: string | null; start_date: string; end_date: string }) => void;
  initial?: { name: string; start_date: string; end_date: string; holiday_type: string };
}) {
  const [name, setName] = useState(initial?.name || "");
  const [startDate, setStartDate] = useState(initial?.start_date || "");
  const [endDate, setEndDate] = useState(initial?.end_date || "");
  const [type, setType] = useState(initial?.holiday_type || "government");

  const handleSubmit = () => {
    if (!name || !startDate) { toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return; }
    const finalEnd = endDate || startDate;
    onSubmit({ name, holiday_date: startDate, holiday_type: type, color_tag: null, start_date: startDate, end_date: finalEnd });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{initial ? "แก้ไขวันหยุด" : "เพิ่มวันหยุด"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อวันหยุด</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น วันสงกรานต์" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">วันที่เริ่มต้น</label>
              <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">วันที่สิ้นสุด</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
            </div>
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
            {initial ? "บันทึก" : "เพิ่มวันหยุด"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Meeting Add/Edit Modal ── */
function MeetingFormModal({ item, employees, projects, customers, onSave, onAdd, onClose, onCreateLinkedTask }: {
  item?: CalendarItem | null;
  employees: { name: string; avatar?: string }[];
  projects?: { id: string; name: string }[];
  customers?: { id: string; name: string }[];
  onSave?: (id: string, updates: Record<string, any>) => void;
  onAdd?: (data: Record<string, any>) => void;
  onClose: () => void;
  onCreateLinkedTask?: (task: Record<string, any>) => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    title: item?.name || "",
    meeting_date: item?.date || "",
    start_time: item?.startTime || "",
    end_time: item?.endTime || "",
    location: item?.location || "",
    note: item?.note || "",
    participants: item?.participants || [],
  });
  const [linkType, setLinkType] = useState<"none" | "project" | "customer">("none");
  const [linkId, setLinkId] = useState("");

  const save = () => {
    if (!form.title.trim()) { toast({ title: "กรุณากรอกหัวข้อการประชุม", variant: "destructive" }); return; }
    if (!form.meeting_date) { toast({ title: "กรุณาเลือกวันที่", variant: "destructive" }); return; }
    if (isEdit && onSave) {
      onSave(item!.id, form);
    } else if (onAdd) {
      onAdd(form);
    }
    // Create linked task if selected
    if (linkType !== "none" && linkId && onCreateLinkedTask) {
      onCreateLinkedTask({
        name: form.title,
        status: "To Do",
        priority: "Medium",
        assigned_to: form.participants,
        due_date: form.meeting_date,
        start_date: form.meeting_date,
        comments: form.note || "",
        link: "",
        category: "meeting",
        task_type: linkType === "project" ? "project" : "customer",
        project_id: linkType === "project" ? linkId : null,
        customer_id: linkType === "customer" ? linkId : null,
        sort_order: 0,
      });
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overscroll-contain" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg animate-scale-in flex flex-col max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="text-lg font-bold">{isEdit ? "Edit Meeting" : "เพิ่ม Meeting"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 overscroll-contain">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Meeting Title</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Date</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.meeting_date} onChange={e => setForm({ ...form, meeting_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start Time</label>
                <input type="time" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">End Time</label>
                <input type="time" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Location</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Meeting room, Zoom, etc." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Participants</label>
              <MultiSelectAssignee
                selected={form.participants}
                onChange={val => setForm({ ...form, participants: val })}
                employees={employees}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
              <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Meeting agenda or notes..." />
            </div>

            {/* Link to Project/Customer */}
            {!isEdit && (
              <div className="border-t border-border pt-4 space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">เชื่อมโยงกับ Project / Customer</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={linkType} onChange={e => { setLinkType(e.target.value as any); setLinkId(""); }}>
                  <option value="none">— ไม่เชื่อมโยง —</option>
                  <option value="project">🚀 Project</option>
                  <option value="customer">💼 Customer</option>
                </select>
                {linkType === "project" && projects && projects.length > 0 && (
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={linkId} onChange={e => setLinkId(e.target.value)}>
                    <option value="">— เลือก Project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {linkType === "customer" && customers && customers.length > 0 && (
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={linkId} onChange={e => setLinkId(e.target.value)}>
                    <option value="">— เลือก Customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {linkType !== "none" && linkId && (
                  <p className="text-xs text-muted-foreground">💡 จะสร้าง Task หมวด Meeting ในหน้า {linkType === "project" ? "Projects" : "Customers"} ด้วย</p>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Fixed Footer */}
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {isEdit ? "Save Meeting" : "เพิ่ม Meeting"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── On-site Add/Edit Modal ── */
function OnsiteFormModal({ item, employees, projects, customers, onSave, onAdd, onClose, onCreateLinkedTask }: {
  item?: CalendarItem | null;
  employees: { name: string; avatar?: string }[];
  projects?: { id: string; name: string }[];
  customers?: { id: string; name: string }[];
  onSave?: (id: string, updates: Record<string, any>) => void;
  onAdd?: (data: Record<string, any>) => void;
  onClose: () => void;
  onCreateLinkedTask?: (task: Record<string, any>) => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    title: item?.name || "",
    work_date: item?.date || "",
    location: item?.location || "",
    note: item?.note || "",
    participants: item?.participants || [],
  });
  const [linkType, setLinkType] = useState<"none" | "project" | "customer">("none");
  const [linkId, setLinkId] = useState("");

  const save = () => {
    if (!form.title.trim()) { toast({ title: "กรุณากรอกหัวข้อ On-site", variant: "destructive" }); return; }
    if (!form.work_date) { toast({ title: "กรุณาเลือกวันที่", variant: "destructive" }); return; }
    if (isEdit && onSave) {
      onSave(item!.id, form);
    } else if (onAdd) {
      onAdd(form);
    }
    // Create linked task if selected
    if (linkType !== "none" && linkId && onCreateLinkedTask) {
      onCreateLinkedTask({
        name: form.title,
        status: "To Do",
        priority: "Medium",
        assigned_to: form.participants,
        due_date: form.work_date,
        start_date: form.work_date,
        comments: form.note || "",
        link: "",
        category: "onsite",
        task_type: linkType === "project" ? "project" : "customer",
        project_id: linkType === "project" ? linkId : null,
        customer_id: linkType === "customer" ? linkId : null,
        sort_order: 0,
      });
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overscroll-contain" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg animate-scale-in flex flex-col max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="text-lg font-bold">{isEdit ? "Edit On-site Work" : "เพิ่ม On-site Work"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 overscroll-contain">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Title</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Date</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.work_date} onChange={e => setForm({ ...form, work_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Location</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Customer site, branch, etc." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Participants</label>
              <MultiSelectAssignee
                selected={form.participants}
                onChange={val => setForm({ ...form, participants: val })}
                employees={employees}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
              <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Work details or notes..." />
            </div>

            {/* Link to Project/Customer */}
            {!isEdit && (
              <div className="border-t border-border pt-4 space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">เชื่อมโยงกับ Project / Customer</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={linkType} onChange={e => { setLinkType(e.target.value as any); setLinkId(""); }}>
                  <option value="none">— ไม่เชื่อมโยง —</option>
                  <option value="project">🚀 Project</option>
                  <option value="customer">💼 Customer</option>
                </select>
                {linkType === "project" && projects && projects.length > 0 && (
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={linkId} onChange={e => setLinkId(e.target.value)}>
                    <option value="">— เลือก Project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {linkType === "customer" && customers && customers.length > 0 && (
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={linkId} onChange={e => setLinkId(e.target.value)}>
                    <option value="">— เลือก Customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {linkType !== "none" && linkId && (
                  <p className="text-xs text-muted-foreground">💡 จะสร้าง Task หมวด On-site ในหน้า {linkType === "project" ? "Projects" : "Customers"} ด้วย</p>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Fixed Footer */}
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {isEdit ? "Save On-site" : "เพิ่ม On-site"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Task Edit Modal (double-click edit from calendar) ── */
type TaskStatus_ = "To Do" | "In Progress" | "Done";
type TaskPriority_ = "Low" | "Medium" | "High";
const COLUMNS_ = ["To Do", "In Progress", "Done"] as const;

function TaskEditModal({ item, employees, onSave, onClose }: {
  item: CalendarItem;
  employees: { name: string; avatar?: string }[];
  onSave: (id: string, updates: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: item.name || "",
    status: (item.status || "To Do") as TaskStatus_,
    priority: (item.priority || "Medium") as TaskPriority_,
    category: item.category || "none",
    assigned_to: item.assigned_to || [],
    start_date: item.start_date || "",
    due_date: item.date || "",
    link: item.link || "",
    comments: item.comments || "",
  });

  const save = () => {
    if (!form.name.trim()) { toast({ title: "กรุณากรอกชื่องาน", variant: "destructive" }); return; }
    onSave(item.id, {
      name: form.name, status: form.status, priority: form.priority,
      category: form.category, assigned_to: form.assigned_to,
      start_date: form.start_date, due_date: form.due_date,
      link: form.link, comments: form.comments,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md animate-scale-in flex flex-col" style={{ boxShadow: "var(--shadow-lg)", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold">Edit Task</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 pt-5 scrollbar-hide">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Task Name</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus_ })}>
                  {COLUMNS_.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Priority</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority_ })}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="none">— ไม่ระบุ —</option>
                <option value="meeting">🗓 Meetings</option>
                <option value="onsite">📍 On-site Work</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Assigned To</label>
              <MultiSelectAssignee
                selected={form.assigned_to}
                onChange={val => setForm({ ...form, assigned_to: val })}
                employees={employees}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start Date</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Due Date</label>
                <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Link</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
              <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} placeholder="Additional notes..." />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 flex gap-3 p-6 pt-4 border-t border-border bg-card rounded-b-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Task
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
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [showAddOnsite, setShowAddOnsite] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [editingTask, setEditingTask] = useState<CalendarItem | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<CalendarItem | null>(null);
  const [editingOnsite, setEditingOnsite] = useState<CalendarItem | null>(null);

  const { tasks: standaloneTasks, updateTask: updateStandaloneTask } = useTasks();
  const { projects, updateTask: updateProjectTask } = useProjects();
  const { customers, updateTask: updateCustomerTask } = useCustomers();
  const { meetings, addMeeting, updateMeeting } = useMeetings();
  const { onsiteWork, addOnsiteWork, updateOnsiteWork } = useOnsiteWork();
  const { holidays, addHoliday, updateHoliday, deleteHoliday } = useHolidays();
  const { employees } = useEmployees();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ── Build items from all sources ── */
  const allItems = useMemo<CalendarItem[]>(() => {
    const standalone = standaloneTasks.filter(t => t.due_date).map(t => ({
      id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
      category: t.category, date: t.due_date!, priority: t.priority,
      assigned_to: t.assigned_to, comments: t.comments, link: t.link,
      taskType: "standalone" as const, sourceName: "Standalone",
      start_date: t.start_date,
    }));
    const projectTasks = projects.flatMap(p =>
      p.tasks.filter(t => t.due_date).map(t => ({
        id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
        category: t.category, date: t.due_date!, priority: t.priority,
        assigned_to: t.assigned_to, comments: t.comments, link: t.link,
        taskType: "project" as const, projectId: p.id, sourceName: p.name,
        start_date: t.start_date,
      }))
    );
    const customerTasks = customers.flatMap(c =>
      c.tasks.filter(t => t.due_date).map(t => ({
        id: t.id, name: t.name, type: "task" as const, status: t.status as TaskStatus,
        category: t.category, date: t.due_date!, priority: t.priority,
        assigned_to: t.assigned_to, comments: t.comments, link: t.link,
        taskType: "customer" as const, customerId: c.id, sourceName: c.name,
        start_date: t.start_date,
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
    const holidayItems: CalendarItem[] = [];
    holidays.forEach(h => {
      const start = new Date(h.start_date || h.holiday_date);
      const end = new Date(h.end_date || h.holiday_date);
      if (isNaN(start.getTime())) return;
      const endDate = isNaN(end.getTime()) ? start : end;
      const current = new Date(start);
      const isMultiDay = start.getTime() !== endDate.getTime();
      while (current <= endDate) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        holidayItems.push({
          id: `${h.id}-${dateStr}`,
          name: isMultiDay ? `${h.name} (${h.start_date} ~ ${h.end_date})` : h.name,
          type: "holiday" as const,
          date: dateStr,
          holidayType: h.holiday_type,
          holidayOriginalId: h.id,
          holidayStartDate: h.start_date || h.holiday_date,
          holidayEndDate: h.end_date || h.holiday_date,
        });
        current.setDate(current.getDate() + 1);
      }
    });
    return [...standalone, ...projectTasks, ...customerTasks, ...meetingItems, ...onsiteItems, ...holidayItems];
  }, [standaloneTasks, projects, customers, meetings, onsiteWork, holidays]);

  /* ── Filter ── */
  const hasActiveFilters = filterCategory !== "all";

  const filteredItems = useMemo(() => {
    if (filterCategory === "all") {
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

  /* ── Holiday actions ── */
  const handleEditHoliday = (id: string) => {
    setSelectedItem(null);
    setEditingHolidayId(id);
  };

  const handleDeleteHoliday = (id: string, name: string) => {
    setSelectedItem(null);
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteHoliday(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleUpdateHoliday = async (data: { name: string; holiday_date: string; holiday_type: string; color_tag: string | null; start_date: string; end_date: string }) => {
    if (editingHolidayId) {
      await updateHoliday(editingHolidayId, data);
      setEditingHolidayId(null);
    }
  };

  const handleEditTaskSave = async (id: string, updates: Record<string, any>) => {
    const task = editingTask;
    if (!task) return;
    if (task.taskType === "project") {
      await updateProjectTask(id, updates);
    } else if (task.taskType === "customer") {
      await updateCustomerTask(id, updates);
    } else {
      await updateStandaloneTask(id, updates);
    }
    toast({ title: "บันทึกสำเร็จ!" });
  };

  const handleEditMeetingSave = async (id: string, updates: Record<string, any>) => {
    await updateMeeting(id, updates);
    toast({ title: "บันทึกการประชุมสำเร็จ!" });
  };

  const handleEditOnsiteSave = async (id: string, updates: Record<string, any>) => {
    await updateOnsiteWork(id, updates);
    toast({ title: "บันทึก On-site สำเร็จ!" });
  };

  const handleTaskDoubleClick = (item: CalendarItem) => {
    if (item.type === "meeting") {
      // Actual meeting from meetings table
      setEditingMeeting(item);
    } else if (item.type === "onsite") {
      // Actual onsite from onsite_work table
      setEditingOnsite(item);
    } else if (item.type === "task") {
      // All tasks (standalone, project, customer) regardless of category
      setEditingTask(item);
    } else if (item.type === "holiday") {
      handleEditHoliday(item.holidayOriginalId!);
    } else {
      setSelectedItem(item);
    }
  };

  const editingHoliday = editingHolidayId ? holidays.find(h => h.id === editingHolidayId) : null;

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
          <button onClick={() => setShowAddMeeting(true)} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> 🗓 Meeting
          </button>
          <button onClick={() => setShowAddOnsite(true)} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> 📍 On-site
          </button>
          <button onClick={() => setShowAddHoliday(true)} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> วันหยุด
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
                      <DraggableItem key={`${item.type}-${item.id}`} item={item} onClick={() => setSelectedItem(item)} onDoubleClick={() => handleTaskDoubleClick(item)} />
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
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEditHoliday={handleEditHoliday}
          onDeleteHoliday={handleDeleteHoliday}
        />
      )}
      {selectedDay && (
        <DayDetailModal dateStr={selectedDay.dateStr} items={selectedDay.items} onClose={() => setSelectedDay(null)}
          onSelectItem={(item) => { setSelectedDay(null); setSelectedItem(item); }}
          onDoubleClickItem={(item) => { setSelectedDay(null); handleTaskDoubleClick(item); }} />
      )}
      {editingTask && (
        <TaskEditModal
          item={editingTask}
          employees={employees}
          onSave={handleEditTaskSave}
          onClose={() => setEditingTask(null)}
        />
      )}
      {editingMeeting && (
        <MeetingFormModal
          item={editingMeeting}
          employees={employees}
          onSave={handleEditMeetingSave}
          onClose={() => setEditingMeeting(null)}
        />
      )}
      {editingOnsite && (
        <OnsiteFormModal
          item={editingOnsite}
          employees={employees}
          onSave={handleEditOnsiteSave}
          onClose={() => setEditingOnsite(null)}
        />
      )}
      {showAddMeeting && (
        <MeetingFormModal
          employees={employees}
          onAdd={async (data) => { await addMeeting(data as any); }}
          onClose={() => setShowAddMeeting(false)}
        />
      )}
      {showAddOnsite && (
        <OnsiteFormModal
          employees={employees}
          onAdd={async (data) => { await addOnsiteWork(data as any); }}
          onClose={() => setShowAddOnsite(false)}
        />
      )}
      {showAddHoliday && <HolidayFormModal onClose={() => setShowAddHoliday(false)} onSubmit={addHoliday} />}
      {editingHolidayId && editingHoliday && (
        <HolidayFormModal
          onClose={() => setEditingHolidayId(null)}
          onSubmit={handleUpdateHoliday}
          initial={{
            name: editingHoliday.name,
            start_date: editingHoliday.start_date || editingHoliday.holiday_date,
            end_date: editingHoliday.end_date || editingHoliday.holiday_date,
            holiday_type: editingHoliday.holiday_type,
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ "{deleteConfirm?.name}" ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

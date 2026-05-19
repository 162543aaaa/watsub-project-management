import { CalendarIcon, CheckIcon, ClockIcon, DocumentTextIcon, MapPinIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMeetings, Meeting } from "@/hooks/useMeetings";
import { useEmployees } from "@/hooks/useEmployees";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { toast } from "@/hooks/use-toast";

const emptyForm = { title: "", meeting_date: "", start_time: "", end_time: "", location: "", note: "", participants: [] as string[] };

export default function Meetings() {
  const { meetings, loading, addMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const { employees } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (m: Meeting) => {
    setEditing(m);
    setForm({
      title: m.title,
      meeting_date: m.meeting_date,
      start_time: m.start_time || "",
      end_time: m.end_time || "",
      location: m.location || "",
      note: m.note || "",
      participants: m.participants || [],
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.meeting_date) return;
    const payload = {
      title: form.title,
      meeting_date: form.meeting_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      note: form.note || null,
      participants: form.participants,
    };
    if (editing) {
      await updateMeeting(editing.id, payload);
    } else {
      await addMeeting(payload);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMeeting(id);
    setConfirmDelete(null);
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-stagger-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{meetings.length} การประชุม</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <PlusIcon className="w-4 h-4" /> เพิ่มการประชุม
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีการประชุม</p>
          <button onClick={openAdd} className="mt-3 text-xs text-primary font-medium hover:underline">เพิ่มการประชุมแรก →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-stagger-2">
          {meetings.map(m => (
            <div key={m.id} className="bg-card rounded-2xl border border-border/50 p-5 hover:border-violet-400/40 transition-all" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex-1 truncate pr-2">{m.title}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><PencilIcon className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setConfirmDelete(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><TrashIcon className="w-3.5 h-3.5 text-destructive/70" /></button>
                </div>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{new Date(m.meeting_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                {(m.start_time || m.end_time) && (
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{m.start_time || "?"} - {m.end_time || "?"}</span>
                  </div>
                )}
                {m.location && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{m.location}</span>
                  </div>
                )}
                {m.note && (
                  <div className="flex items-start gap-2">
                    <DocumentTextIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{m.note}</span>
                  </div>
                )}
              </div>
              {m.participants.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {m.participants.slice(0, 4).map(name => {
                        const emp = employees.find(e => e.name === name);
                        return <EmployeeAvatar key={name} name={name} avatar={emp?.avatar} size="xs" />;
                      })}
                    </div>
                    {m.participants.length > 4 && <span className="text-[10px] text-muted-foreground ml-1">+{m.participants.length - 4}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{m.participants.length} คน</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขการประชุม" : "เพิ่มการประชุม"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลการประชุม</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">ชื่อการประชุม *</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ชื่อการประชุม" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">วันที่ *</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">เวลาเริ่ม</label>
                <input type="time" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">เวลาสิ้นสุด</label>
                <input type="time" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">สถานที่</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="สถานที่ประชุม" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">ผู้เข้าร่วม</label>
              <MultiSelectAssignee selected={form.participants} onChange={p => setForm(f => ({ ...f, participants: p }))} employees={employees} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">หมายเหตุ</label>
              </div>
              <textarea className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="หมายเหตุ..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
              <button onClick={save}
                className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"><CheckIcon className="w-4 h-4" /> บันทึก</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>ต้องการลบการประชุมนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">ลบ</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

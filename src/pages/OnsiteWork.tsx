import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Calendar, MapPin, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useOnsiteWork, OnsiteWork } from "@/hooks/useOnsiteWork";
import { useEmployees } from "@/hooks/useEmployees";
import MultiSelectAssignee from "@/components/MultiSelectAssignee";
import EmployeeAvatar from "@/components/EmployeeAvatar";

const emptyForm = { title: "", work_date: "", location: "", note: "", participants: [] as string[] };

export default function OnsiteWorkPage() {
  const { onsiteWork, loading, addOnsiteWork, updateOnsiteWork, deleteOnsiteWork } = useOnsiteWork();
  const { employees } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OnsiteWork | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (w: OnsiteWork) => {
    setEditing(w);
    setForm({ title: w.title, work_date: w.work_date, location: w.location || "", note: w.note || "", participants: w.participants || [] });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.work_date) return;
    const payload = { title: form.title, work_date: form.work_date, location: form.location || null, note: form.note || null, participants: form.participants };
    if (editing) { await updateOnsiteWork(editing.id, payload); } else { await addOnsiteWork(payload); }
    setShowForm(false); setEditing(null);
  };

  const handleDelete = async (id: string) => { await deleteOnsiteWork(id); setConfirmDelete(null); };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-stagger-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">On-site Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{onsiteWork.length} งานออกกอง</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> เพิ่มงานออกกอง
        </button>
      </div>

      {onsiteWork.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <MapPin className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีงานออกกอง</p>
          <button onClick={openAdd} className="mt-3 text-xs text-primary font-medium hover:underline">เพิ่มงานออกกองแรก →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-stagger-2">
          {onsiteWork.map(w => (
            <div key={w.id} className="bg-card rounded-2xl border border-border/50 p-5 hover:border-rose-400/40 transition-all" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex-1 truncate pr-2">{w.title}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); openEdit(w); } }} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setConfirmDelete(w.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>
                </div>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{new Date(w.work_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                {w.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{w.location}</span>
                  </div>
                )}
                {w.note && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{w.note}</span>
                  </div>
                )}
              </div>
              {w.participants.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {w.participants.slice(0, 4).map(name => {
                        const emp = employees.find(e => e.name === name);
                        return <EmployeeAvatar key={name} name={name} avatar={emp?.avatar} size="xs" />;
                      })}
                    </div>
                    {w.participants.length > 4 && <span className="text-[10px] text-muted-foreground ml-1">+{w.participants.length - 4}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{w.participants.length} คน</span>
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
            <DialogTitle>{editing ? "แก้ไขงานออกกอง" : "เพิ่มงานออกกอง"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลงานออกกอง</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">ชื่องาน *</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ชื่องานออกกอง" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">วันที่ *</label>
              <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.work_date} onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">สถานที่</label>
              <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="สถานที่ทำงาน" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">ผู้เข้าร่วม</label>
              <MultiSelectAssignee selected={form.participants} onChange={p => setForm(f => ({ ...f, participants: p }))} employees={employees} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">หมายเหตุ</label>
              <textarea className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="หมายเหตุ..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">ยกเลิก</button>
              <button onClick={save}
                className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"><Save className="w-4 h-4" /> บันทึก</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>ต้องการลบงานออกกองนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</DialogDescription>
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

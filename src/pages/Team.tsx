import { useState, useRef, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Save, Mail, Phone, Upload, QrCode, Eye, ArrowLeft, Camera, Filter, Users, MapPin, Briefcase, CalendarDays, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useTasks } from "@/hooks/useTasks";
import { useCustomers } from "@/hooks/useCustomers";
import { useProjects } from "@/hooks/useProjects";
import { useMeetings } from "@/hooks/useMeetings";
import { useOnsiteWork } from "@/hooks/useOnsiteWork";
import { useLeave } from "@/hooks/useLeave";
import { supabase } from "@/integrations/supabase/client";

const gradients = [
  "from-cyan-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

function getWorkTenure(startDate?: string): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  if (isNaN(start.getTime())) return null;
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years < 0) return null;
  if (years === 0 && months === 0) return "เริ่มงานเดือนนี้";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (months > 0) parts.push(`${months} เดือน`);
  return parts.join(" ");
}

export default function Team() {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { tasks: standaloneTasks } = useTasks();
  const { customers } = useCustomers();
  const { projects } = useProjects();
  const { meetings } = useMeetings();
  const { onsiteWork } = useOnsiteWork();
  const { leaves } = useLeave();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", position: "", email: "", role: "employee", phone: "", avatar: "", promptpay_qr: "", start_date: "", note: "" });
  const [detail, setDetail] = useState<Employee | null>(null);
  const [uploading, setUploading] = useState<{ avatar?: boolean; qr?: boolean }>({});
  const avatarRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState(0); // 0 = all months

  const allTasks = useMemo(() => [
    ...standaloneTasks,
    ...projects.flatMap(p => p.tasks),
    ...customers.flatMap(c => c.tasks),
  ], [standaloneTasks, projects, customers]);

  // Filter tasks by year/month based on due_date or created_at
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const d = t.due_date || t.created_at;
      if (!d) return false;
      const date = new Date(d);
      if (date.getFullYear() !== filterYear) return false;
      if (filterMonth > 0 && date.getMonth() + 1 !== filterMonth) return false;
      return true;
    });
  }, [allTasks, filterYear, filterMonth]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const date = new Date(m.meeting_date);
      if (date.getFullYear() !== filterYear) return false;
      if (filterMonth > 0 && date.getMonth() + 1 !== filterMonth) return false;
      return true;
    });
  }, [meetings, filterYear, filterMonth]);

  const filteredOnsite = useMemo(() => {
    return onsiteWork.filter(w => {
      const date = new Date(w.work_date);
      if (date.getFullYear() !== filterYear) return false;
      if (filterMonth > 0 && date.getMonth() + 1 !== filterMonth) return false;
      return true;
    });
  }, [onsiteWork, filterYear, filterMonth]);

  const getExtraStats = (name: string) => {
    const myMeetings = filteredMeetings.filter(m => m.participants?.includes(name));
    const myOnsite = filteredOnsite.filter(w => w.participants?.includes(name));
    const myMeetingTasks = filteredTasks.filter(t => t.category === "meeting" && t.assigned_to?.includes(name));
    const myOnsiteTasks = filteredTasks.filter(t => t.category === "onsite" && t.assigned_to?.includes(name));
    const allMyMeetings = meetings.filter(m => m.participants?.includes(name));
    const allMyOnsite = onsiteWork.filter(w => w.participants?.includes(name));
    const allMyMeetingTasks = allTasks.filter(t => t.category === "meeting" && t.assigned_to?.includes(name));
    const allMyOnsiteTasks = allTasks.filter(t => t.category === "onsite" && t.assigned_to?.includes(name));
    return {
      meetingCount: myMeetings.length + myMeetingTasks.length,
      onsiteCount: myOnsite.length + myOnsiteTasks.length,
      allMeetings: allMyMeetings.length + allMyMeetingTasks.length,
      allOnsite: allMyOnsite.length + allMyOnsiteTasks.length,
    };
  };

  const getLeaveDays = (name: string) => {
    const approvedLeaves = leaves.filter(l => l.requested_by === name && l.status === "Approved");
    let totalDays = 0;
    for (const l of approvedLeaves) {
      const start = new Date(l.leave_start);
      const end = new Date(l.leave_end);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalDays += Math.max(diff, 1);
      }
    }
    return totalDays;
  };

  const getStats = (name: string, tasks = allTasks) => {
    const myTasks = tasks.filter(t => t.assigned_to?.includes(name) && t.category !== "meeting" && t.category !== "onsite");
    const done = myTasks.filter(t => t.status === "Done").length;
    const inProgress = myTasks.filter(t => t.status === "In Progress").length;
    const todo = myTasks.filter(t => t.status === "To Do").length;
    return { total: myTasks.length, done, inProgress, todo, pct: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
  };

  const uploadFile = async (file: File, type: "avatar" | "qr", empId?: string) => {
    setUploading(prev => ({ ...prev, [type === "avatar" ? "avatar" : "qr"]: true }));
    const ext = file.name.split(".").pop();
    const folder = empId || "temp";
    const path = `${folder}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("employee-assets").upload(path, file, { upsert: true });
    setUploading(prev => ({ ...prev, [type === "avatar" ? "avatar" : "qr"]: false }));
    if (error) { console.error(error); return null; }
    return path;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await uploadFile(file, "avatar", editing?.id);
    if (path) setForm(f => ({ ...f, avatar: path }));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await uploadFile(file, "qr", editing?.id);
    if (path) setForm(f => ({ ...f, promptpay_qr: path }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.position.trim() || !form.email.trim()) return;
    const payload = { ...form, start_date: form.start_date || undefined };
    if (editing) {
      await updateEmployee(editing.id, payload);
    } else {
      await addEmployee(payload);
    }
    setShowAdd(false);
    setEditing(null);
    setForm({ name: "", position: "", email: "", role: "employee", phone: "", avatar: "", promptpay_qr: "", start_date: "", note: "" });
  };

  const startEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, position: emp.position, email: emp.email, role: emp.role, phone: emp.phone || "", avatar: emp.avatar || "", promptpay_qr: emp.promptpay_qr || "", start_date: emp.start_date || "", note: emp.note || "" });
    setShowAdd(true);
  };

  // Filter controls component
  const FilterBar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <select
        value={filterYear}
        onChange={e => setFilterYear(Number(e.target.value))}
        className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
      >
        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={filterMonth}
        onChange={e => setFilterMonth(Number(e.target.value))}
        className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
      >
        <option value={0}>ทุกเดือน</option>
        {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
    </div>
  );

  // ── Detail View ──────────────────────────────────────────────────────────────
  if (detail) {
    const stats = getStats(detail.name);
    const monthlyStats = getStats(detail.name, filteredTasks);
    const extra = getExtraStats(detail.name);
    const myTasks = filteredTasks.filter(t => t.assigned_to?.includes(detail.name));
    const grad = gradients[employees.findIndex(e => e.id === detail.id) % gradients.length];
    return (
      <div className="p-4 sm:p-6 page-enter">
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Team
        </button>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Profile Card */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex-shrink-0">
                  {detail.avatar ? (
                    <img src={getPublicUrl(detail.avatar)} alt={detail.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-border" />
                  ) : (
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-2xl sm:text-3xl font-bold`}>
                      {detail.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 sm:hidden">
                  <h1 className="text-lg font-bold text-foreground truncate">{detail.name}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{detail.position}</p>
                  <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{detail.role}</span>
                  {getWorkTenure(detail.start_date) && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {getWorkTenure(detail.start_date)}
                    </p>
                  )}
                </div>
              </div>
              <div className="hidden sm:block flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground">{detail.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{detail.position}</p>
                <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{detail.role}</span>
                {getWorkTenure(detail.start_date) && (
                  <p className="text-sm text-primary mt-1 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" /> อายุงาน: {getWorkTenure(detail.start_date)}
                  </p>
                )}
              </div>
              <button onClick={() => startEdit(detail)} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors flex-shrink-0">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <div className="mt-4 sm:mt-5 space-y-3 border-t border-border/50 pt-4">
              <a href={`mailto:${detail.email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{detail.email}</span>
              </a>
              {detail.phone && (
                <a href={`tel:${detail.phone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" /> {detail.phone}
                </a>
              )}
            </div>
            <button onClick={() => startEdit(detail)} className="sm:hidden mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          {/* PromptPay QR */}
          {detail.promptpay_qr && (
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">PromptPay QR</h2>
              </div>
              <img src={getPublicUrl(detail.promptpay_qr)} alt="PromptPay QR" className="w-44 h-44 sm:w-56 sm:h-56 object-contain mx-auto rounded-xl border border-border bg-white p-2" />
              <p className="text-xs text-muted-foreground mt-3">สแกนเพื่อโอนเงิน</p>
            </div>
          )}

          {/* Monthly Task Stats with filter */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-foreground">สถิติงาน</h2>
              <FilterBar />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
              {[
                { label: "ทั้งหมด", value: monthlyStats.total, color: "text-foreground" },
                { label: "เสร็จแล้ว", value: monthlyStats.done, color: "text-green-600" },
                { label: "กำลังทำ", value: monthlyStats.inProgress, color: "text-primary" },
                { label: "ค้างอยู่", value: monthlyStats.todo, color: "text-amber-500" },
                { label: "ประชุม", value: extra.meetingCount, color: "text-violet-500" },
                { label: "ออกกอง", value: extra.onsiteCount, color: "text-rose-500" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-muted">
                  <div className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar mb-1"><div className="progress-fill" style={{ width: `${monthlyStats.pct}%` }} /></div>
            <div className="text-right text-xs font-bold text-primary">{monthlyStats.pct}% complete</div>

            {/* Overall stats */}
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-2">ภาพรวมทั้งหมด (ทุกปี)</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-foreground font-semibold">{stats.total} งาน</span>
                <span className="text-green-600">{stats.done} เสร็จ</span>
                <span className="text-amber-500">{stats.todo} ค้าง</span>
                <span className="text-violet-500">{extra.allMeetings} ประชุม</span>
                <span className="text-rose-500">{extra.allOnsite} ออกกอง</span>
                <span className="text-primary font-bold">{stats.pct}%</span>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          {myTasks.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <h2 className="font-bold text-foreground mb-4">งาน ({myTasks.length})</h2>
              <div className="space-y-2">
                {myTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{task.name}</span>
                    <span className={`flex-shrink-0 ${task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"}`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-stagger-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{employees.length} team members</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar />
          <button onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: "", position: "", email: "", role: "employee", phone: "", avatar: "", promptpay_qr: "", start_date: "", note: "" }); }}
            className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลพนักงาน</DialogDescription>
          </DialogHeader>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/50">
              <div className="relative flex-shrink-0">
                {form.avatar ? (
                  <img src={getPublicUrl(form.avatar)} alt="Avatar" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-border" />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                    {form.name ? form.name.charAt(0).toUpperCase() : <Camera className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground mb-1">Profile Photo</p>
                <button onClick={() => avatarRef.current?.click()}
                  disabled={uploading.avatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                  {uploading.avatar ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploading.avatar ? "Uploading..." : "Upload Photo"}
                </button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                {form.avatar && <p className="text-xs text-muted-foreground mt-1">✓ Photo uploaded</p>}
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Full Name", key: "name", placeholder: "Full name...", type: "text" },
                { label: "Position", key: "position", placeholder: "e.g. Community Support", type: "text" },
                { label: "Email", key: "email", placeholder: "email@example.com", type: "text" },
                { label: "Phone", key: "phone", placeholder: "e.g. 081-234-5678", type: "text" },
                { label: "วันเริ่มงาน", key: "start_date", placeholder: "", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{f.label}</label>
                  <input type={f.type} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
                </div>
              ))}

              {/* PromptPay QR Upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">PromptPay QR Code</label>
                <div className="flex items-center gap-3">
                  {form.promptpay_qr ? (
                    <img src={getPublicUrl(form.promptpay_qr)} alt="QR" className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-contain border border-border bg-white p-1" />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div>
                    <button onClick={() => qrRef.current?.click()}
                      disabled={uploading.qr}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                      {uploading.qr ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> : <Upload className="w-3 h-3" />}
                      {uploading.qr ? "Uploading..." : "Upload QR"}
                    </button>
                    <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                    {form.promptpay_qr && <p className="text-xs text-muted-foreground mt-1">✓ QR uploaded</p>}
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">โน้ต / หน้าที่</label>
                <Textarea
                  className="w-full rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none min-h-[80px]"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="ระบุหน้าที่ความรับผิดชอบ..."
                />
              </div>
            </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editing ? "Update" : "Add"}</button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {employees.map((emp, i) => {
          const stats = getStats(emp.name, filteredTasks);
          const overallStats = getStats(emp.name);
          const extra = getExtraStats(emp.name);
          const grad = gradients[i % gradients.length];
          return (
            <div key={emp.id} className={`bg-card rounded-2xl border border-border/60 p-4 sm:p-5 card-hover animate-stagger-${Math.min(i + 1, 5)} group`}>
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    {emp.avatar ? (
                      <img src={getPublicUrl(emp.avatar)} alt={emp.name} className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover avatar-hover" />
                    ) : (
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-base sm:text-lg font-bold avatar-hover`}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {emp.promptpay_qr && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                        <QrCode className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-sm leading-tight truncate">{emp.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{emp.position}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => setDetail(emp)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => startEdit(emp)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteEmployee(emp.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Contact & Tenure */}
              <div className="space-y-1.5 mb-3">
                <a href={`mailto:${emp.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors truncate">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{emp.email}</span>
                </a>
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {emp.phone}
                  </a>
                )}
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                  {emp.start_date && getWorkTenure(emp.start_date)
                    ? `อายุงาน: ${getWorkTenure(emp.start_date)}`
                    : <span className="text-muted-foreground font-normal">อายุงาน: ยังไม่ระบุวันเริ่มงาน</span>
                  }
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" /> วันลา: {getLeaveDays(emp.name)} วัน
                </div>
                {emp.note && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{emp.note}</span>
                  </div>
                )}
              </div>

              {/* Monthly stats */}
              <div className="grid grid-cols-3 gap-1.5 mb-2 p-2.5 rounded-xl bg-muted/50">
                {[
                  { label: "ทั้งหมด", value: stats.total, color: "text-foreground" },
                  { label: "เสร็จ", value: stats.done, color: "text-green-600" },
                  { label: "ค้าง", value: stats.todo, color: "text-amber-500" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[9px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 text-[10px] font-medium text-violet-500">
                  <Users className="w-3 h-3" /> ประชุม {extra.meetingCount}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-[10px] font-medium text-rose-500">
                  <MapPin className="w-3 h-3" /> ออกกอง {extra.onsiteCount}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ความคืบหน้า</span>
                  <span className="font-semibold text-foreground">{stats.done}/{stats.total}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>รวมทุกปี: {overallStats.total} งาน</span>
                  <span className="font-bold text-primary">{stats.pct}%</span>
                </div>
              </div>

              {/* View detail link */}
              <button onClick={() => setDetail(emp)}
                className="mt-3 w-full text-xs text-center text-muted-foreground hover:text-primary transition-colors py-1.5 rounded-lg hover:bg-muted/50">
                View details →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

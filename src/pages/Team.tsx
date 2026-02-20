import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Save, Mail, Phone, Upload, QrCode, Eye, ArrowLeft, Camera } from "lucide-react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useTasks } from "@/hooks/useTasks";
import { useCustomers } from "@/hooks/useCustomers";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";

const gradients = [
  "from-cyan-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

export default function Team() {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { tasks: standaloneTasks } = useTasks();
  const { customers } = useCustomers();
  const { projects } = useProjects();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", position: "", email: "", role: "employee", phone: "", avatar: "", promptpay_qr: "" });
  const [detail, setDetail] = useState<Employee | null>(null);
  const [uploading, setUploading] = useState<{ avatar?: boolean; qr?: boolean }>({});
  const avatarRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  const allTasks = [
    ...standaloneTasks,
    ...projects.flatMap(p => p.tasks),
    ...customers.flatMap(c => c.tasks),
  ];

  const getStats = (name: string) => {
    const myTasks = allTasks.filter(t => t.assigned_to?.includes(name));
    const done = myTasks.filter(t => t.status === "Done").length;
    return { total: myTasks.length, done, pct: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
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
    if (editing) {
      await updateEmployee(editing.id, form);
    } else {
      await addEmployee(form);
    }
    setShowAdd(false);
    setEditing(null);
    setForm({ name: "", position: "", email: "", role: "employee", phone: "", avatar: "", promptpay_qr: "" });
  };

  const startEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, position: emp.position, email: emp.email, role: emp.role, phone: emp.phone || "", avatar: emp.avatar || "", promptpay_qr: emp.promptpay_qr || "" });
    setShowAdd(true);
  };

  // ── Detail View ──────────────────────────────────────────────────────────────
  if (detail) {
    const stats = getStats(detail.name);
    const myTasks = allTasks.filter(t => t.assigned_to?.includes(detail.name));
    const grad = gradients[employees.findIndex(e => e.id === detail.id) % gradients.length];
    return (
      <div className="p-6 page-enter">
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Team
        </button>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <div className="bg-card rounded-2xl border border-border p-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0">
                {detail.avatar ? (
                  <img src={getPublicUrl(detail.avatar)} alt={detail.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-border" />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-3xl font-bold`}>
                    {detail.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground">{detail.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{detail.position}</p>
                <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{detail.role}</span>
              </div>
              <button onClick={() => startEdit(detail)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <div className="mt-5 space-y-3 border-t border-border/50 pt-4">
              <a href={`mailto:${detail.email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" /> {detail.email}
              </a>
              {detail.phone && (
                <a href={`tel:${detail.phone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" /> {detail.phone}
                </a>
              )}
            </div>
          </div>

          {/* PromptPay QR */}
          {detail.promptpay_qr && (
            <div className="bg-card rounded-2xl border border-border p-6 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">PromptPay QR</h2>
              </div>
              <img src={getPublicUrl(detail.promptpay_qr)} alt="PromptPay QR" className="w-56 h-56 object-contain mx-auto rounded-xl border border-border bg-white p-2" />
              <p className="text-xs text-muted-foreground mt-3">สแกนเพื่อโอนเงิน</p>
            </div>
          )}

          {/* Task Stats */}
          <div className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 className="font-bold text-foreground mb-4">Task Summary</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total", value: stats.total, color: "text-foreground" },
                { label: "Done", value: stats.done, color: "text-green-600" },
                { label: "Remaining", value: stats.total - stats.done, color: "text-primary" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-muted">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar mb-1"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
            <div className="text-right text-xs font-bold text-primary">{stats.pct}% complete</div>
          </div>

          {/* Tasks List */}
          {myTasks.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <h2 className="font-bold text-foreground mb-4">Tasks ({myTasks.length})</h2>
              <div className="space-y-2">
                {myTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "Done" ? "bg-green-500" : task.status === "In Progress" ? "bg-cyan-500" : "bg-gray-400"}`} />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{task.name}</span>
                    <span className={task.status === "Done" ? "badge-done" : task.status === "In Progress" ? "badge-progress" : "badge-todo"}>
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
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{employees.length} team members</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: "", position: "", email: "", role: "employee", phone: "", avatar: "", promptpay_qr: "" }); }}
          className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Employee</button>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg animate-scale-in overflow-y-auto max-h-[90vh]" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editing ? "Edit Employee" : "Add Employee"}</h3>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-muted/40 border border-border/50">
              <div className="relative flex-shrink-0">
                {form.avatar ? (
                  <img src={getPublicUrl(form.avatar)} alt="Avatar" className="w-16 h-16 rounded-xl object-cover border-2 border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                    {form.name ? form.name.charAt(0).toUpperCase() : <Camera className="w-6 h-6" />}
                  </div>
                )}
              </div>
              <div className="flex-1">
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
                { label: "Full Name", key: "name", placeholder: "Full name..." },
                { label: "Position", key: "position", placeholder: "e.g. Community Support" },
                { label: "Email", key: "email", placeholder: "email@example.com" },
                { label: "Phone", key: "phone", placeholder: "e.g. 081-234-5678" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{f.label}</label>
                  <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
                </div>
              ))}

              {/* PromptPay QR Upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">PromptPay QR Code</label>
                <div className="flex items-center gap-3">
                  {form.promptpay_qr ? (
                    <img src={getPublicUrl(form.promptpay_qr)} alt="QR" className="w-16 h-16 rounded-lg object-contain border border-border bg-white p-1" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-muted-foreground/40" />
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
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editing ? "Update" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.map((emp, i) => {
          const stats = getStats(emp.name);
          const grad = gradients[i % gradients.length];
          return (
            <div key={emp.id} className={`bg-card rounded-2xl border border-border/60 p-5 card-hover animate-stagger-${Math.min(i + 1, 5)} group`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {emp.avatar ? (
                      <img src={getPublicUrl(emp.avatar)} alt={emp.name} className="w-12 h-12 rounded-xl object-cover avatar-hover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-lg font-bold avatar-hover`}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {emp.promptpay_qr && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                        <QrCode className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{emp.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.position}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setDetail(emp)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
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
              <div className="space-y-2 mb-3">
                <a href={`mailto:${emp.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {emp.email}
                </a>
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {emp.phone}
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Task progress</span>
                  <span className="font-semibold text-foreground">{stats.done}/{stats.total}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.total} total tasks</span>
                  <span className="font-bold text-primary">{stats.pct}%</span>
                </div>
              </div>
              {/* View detail link */}
              <button onClick={() => setDetail(emp)}
                className="mt-3 w-full text-xs text-center text-muted-foreground hover:text-primary transition-colors py-1">
                View details →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

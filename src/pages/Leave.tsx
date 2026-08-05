import { CheckCircleIcon, CheckIcon, ClockIcon, PencilSquareIcon, PlusIcon, TrashIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useState } from "react";
import { parseISO, startOfMonth, endOfMonth } from "date-fns";
import { useLeave, LeaveRequest } from "@/hooks/useLeave";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

type LeaveStatus = "Pending" | "Approved" | "Rejected";
const leaveTypes = ["Annual", "Sick", "Personal", "Unpaid", "Maternity"];

export default function Leave() {
  const { leaves, loading, addLeave, updateStatus, updateLeave, deleteLeave } = useLeave();
  const { employees } = useEmployees();
  const { profile, isAdmin } = useAuthContext() as any;
  const currentName = profile?.display_name ?? "";
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<LeaveStatus>("Pending");
  const [filter, setFilter] = useState<LeaveStatus | "all">("all");
  const [form, setForm] = useState({ requested_by: "", leave_type: "Annual", leave_start: "", leave_end: "", leave_reason: "" });

  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const leavesInMonth = leaves.filter(l => {
    if (!l.leave_start || !l.leave_end) return false;
    const start = parseISO(l.leave_start);
    const end = parseISO(l.leave_end);
    const monthStart = startOfMonth(new Date(filterYear, filterMonth - 1));
    const monthEnd = endOfMonth(monthStart);
    return start <= monthEnd && end >= monthStart;
  });

  const filtered = filter === "all" ? leavesInMonth : leavesInMonth.filter(l => l.status === filter);
  const pending = leavesInMonth.filter(l => l.status === "Pending").length;

  const resetForm = () => {
    setForm({ requested_by: "", leave_type: "Annual", leave_start: "", leave_end: "", leave_reason: "" });
    setEditingId(null);
    setEditStatus("Pending");
  };

  const openEdit = (leave: LeaveRequest) => {
    setForm({
      requested_by: leave.requested_by,
      leave_type: leave.leave_type,
      leave_start: leave.leave_start,
      leave_end: leave.leave_end,
      leave_reason: leave.leave_reason,
    });
    setEditStatus(leave.status);
    setEditingId(leave.id);
    setShowAdd(true);
  };

  const handleAdd = async () => {
    const requestedBy = currentName || form.requested_by;
    if (!requestedBy || !form.leave_start || !form.leave_end || !form.leave_reason) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return;
    }
    if (editingId) {
      await updateLeave(editingId, { ...form, requested_by: form.requested_by || requestedBy, status: editStatus });
    } else {
      await addLeave({ ...form, requested_by: requestedBy, status: "Pending", requested_date: new Date().toISOString() });
    }
    setShowAdd(false);
    resetForm();
  };

  const statusStyle = (status: LeaveStatus) => {
    if (status === "Approved") return "bg-green-100 text-green-700";
    if (status === "Rejected") return "bg-red-100 text-red-600";
    return "bg-amber-100 text-amber-700";
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pending > 0 && <span className="text-amber-600 font-semibold">{pending} pending · </span>}
            {leaves.length} total requests
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Request Leave
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 animate-stagger-2">
        {([
          { label: "Pending", count: leaves.filter(l => l.status === "Pending").length, icon: ClockIcon, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Approved", count: leaves.filter(l => l.status === "Approved").length, icon: CheckCircleIcon, color: "text-green-600", bg: "bg-green-50" },
          { label: "Rejected", count: leaves.filter(l => l.status === "Rejected").length, icon: XCircleIcon, color: "text-red-500", bg: "bg-red-50" },
        ] as const).map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.bg} border border-border/50`}>
            <div className="flex items-center gap-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            </div>
            <p className={`text-sm font-medium mt-1 ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 animate-stagger-3 flex-wrap">
        {(["all", "Pending", "Approved", "Rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsl(222 47% 9% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md animate-scale-in" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editingId ? "Edit Leave" : "Request Leave"}</h3>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><XMarkIcon className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Requester</label>
                {isAdmin ? (
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={form.requested_by || currentName} onChange={e => setForm({ ...form, requested_by: e.target.value })}>
                    <option value="">Select employee...</option>
                    {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                ) : (
                  <input readOnly value={currentName}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none" />
                )}
              </div>
              {isAdmin && editingId && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={editStatus} onChange={e => setEditStatus(e.target.value as LeaveStatus)}>
                    {(["Pending", "Approved", "Rejected"] as const).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Leave Type</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                  {leaveTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Start Date</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={form.leave_start} onChange={e => setForm({ ...form, leave_start: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">End Date</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                    value={form.leave_end} onChange={e => setForm({ ...form, leave_end: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Reason</label>
                <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none resize-none"
                  value={form.leave_reason} onChange={e => setForm({ ...form, leave_reason: e.target.value })} placeholder="Reason for leave..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleAdd} className="flex-1 btn-primary flex items-center justify-center gap-2"><CheckIcon className="w-4 h-4" /> {editingId ? "Save" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden animate-stagger-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                {["Employee", "Type", "Period", "Reason", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(leave => (
                <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const emp = employees.find(e => e.name === leave.requested_by);
                        return <EmployeeAvatar name={leave.requested_by} avatar={emp?.avatar} size="sm" index={employees.indexOf(emp!)} />;
                      })()}
                      <span className="text-sm font-medium text-foreground">{leave.requested_by}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{leave.leave_type}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {leave.leave_start && new Date(leave.leave_start).toLocaleDateString("en", { day: "numeric", month: "short" })}
                    {leave.leave_start !== leave.leave_end && leave.leave_end && ` – ${new Date(leave.leave_end).toLocaleDateString("en", { day: "numeric", month: "short" })}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{leave.leave_reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(leave.status)}`}>{leave.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {leave.status === "Pending" && (
                        <>
                          <button onClick={() => updateStatus(leave.id, "Approved")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                            <CheckIcon className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => updateStatus(leave.id, "Rejected")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                            <XMarkIcon className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(leave)} title="แก้ไข / ย้ายวัน"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(leave.id)} title="ลบ"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">No leave requests found.</div>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={async () => { if (deleteId) await deleteLeave(deleteId); setDeleteId(null); }}
        title="ยืนยันการลบคำขอลา"
        description="ต้องการลบคำขอลานี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
      />
    </div>
  );
}

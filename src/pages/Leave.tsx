import { useState } from "react";
import { Plus, Check, X, Save, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useLeave, LeaveRequest } from "@/hooks/useLeave";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "@/hooks/use-toast";

type LeaveStatus = "Pending" | "Approved" | "Rejected";
const leaveTypes = ["Annual", "Sick", "Personal", "Unpaid", "Maternity"];

export default function Leave() {
  const { leaves, loading, addLeave, updateStatus } = useLeave();
  const { employees } = useEmployees();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<LeaveStatus | "all">("all");
  const [form, setForm] = useState({ requested_by: "", leave_type: "Annual", leave_start: "", leave_end: "", leave_reason: "" });

  const filtered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);
  const pending = leaves.filter(l => l.status === "Pending").length;

  const handleAdd = async () => {
    if (!form.requested_by || !form.leave_start || !form.leave_end || !form.leave_reason) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" }); return;
    }
    await addLeave({ ...form, status: "Pending", requested_date: new Date().toISOString() });
    setShowAdd(false);
    setForm({ requested_by: "", leave_type: "Annual", leave_start: "", leave_end: "", leave_reason: "" });
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
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 animate-stagger-2">
        {([
          { label: "Pending", count: leaves.filter(l => l.status === "Pending").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Approved", count: leaves.filter(l => l.status === "Approved").length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Rejected", count: leaves.filter(l => l.status === "Rejected").length, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
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
              <h3 className="text-lg font-bold">Request Leave</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Requester</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none"
                  value={form.requested_by} onChange={e => setForm({ ...form, requested_by: e.target.value })}>
                  <option value="">Select employee...</option>
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
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
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleAdd} className="flex-1 btn-primary flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Submit</button>
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
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{leave.requested_by}</td>
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
                    {leave.status === "Pending" && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateStatus(leave.id, "Approved")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => updateStatus(leave.id, "Rejected")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
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
    </div>
  );
}

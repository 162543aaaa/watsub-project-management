import { useState, useEffect, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { Shield, Plus, Lock, Unlock, CheckCircle2, Clock, ExternalLink, FileDown, Trash2 } from "lucide-react";
import { useKpiPeriods, useKpiEvaluations } from "@/hooks/useKpi";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { exportPDF, escapeHtml } from "@/lib/exportUtils";
import { getEligiblePeerReviewers } from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;

function StatusPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function KpiAdmin() {
  const { isAdmin, loading: authLoading } = useAuthContext();
  const { periods, loading: periodsLoading, addPeriod, updatePeriod, deletePeriod } = useKpiPeriods();
  const { evaluations } = useKpiEvaluations();
  const { employees } = useEmployees();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"quarter" | "project">("quarter");
  const [projectId, setProjectId] = useState("");
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("projects").select("id, name").order("name").then(({ data }) => setProjects(data ?? []));
  }, []);

  const handleCreate = async () => {
    if (!label.trim()) { toast({ title: "กรุณาระบุชื่อรอบประเมิน", variant: "destructive" }); return; }
    setCreating(true);
    await addPeriod({
      label,
      type,
      status: "open",
      project_id: type === "project" && projectId ? projectId : null,
    });
    setLabel(""); setType("quarter"); setProjectId(""); setShowForm(false);
    setCreating(false);
  };

  const handleToggleStatus = async (id: string, current: "open" | "closed") => {
    const next = current === "open" ? "closed" : "open";
    await updatePeriod(id, { status: next });
    toast({ title: next === "closed" ? "ปิดรอบประเมินแล้ว" : "เปิดรอบประเมินแล้ว" });
  };

  const handleDeletePeriod = async (periodId: string, periodLabel: string) => {
    const confirmDelete = window.confirm(
      `ต้องการลบรอบประเมิน "${periodLabel}" ใช่หรือไม่?\nการลบจะลบข้อมูลการประเมินในรอบนี้ทั้งหมด`,
    );
    if (!confirmDelete) return;
    await deletePeriod(periodId);
  };

  const periodStats = useMemo(() => periods.map(period => {
    const evals = evaluations.filter(e => e.period_id === period.id);
    const submitted = evals.filter(e => e.submitted_at).length;
    const rows = employees.map(emp => {
      const selfDone  = evals.some(e => e.evaluatee_id === emp.id && e.evaluator_id === emp.id && e.type === "self" && e.submitted_at);
      const supDone   = evals.some(e => e.evaluatee_id === emp.id && e.type === "supervisor" && e.submitted_at);
      const eligiblePeers = getEligiblePeerReviewers(emp, employees);
      const peersTotal = eligiblePeers.length;
      const peersDone  = eligiblePeers
        .filter(peer => evals.some(e => e.evaluator_id === peer.id && e.evaluatee_id === emp.id && e.type === "peer" && e.submitted_at))
        .length;
      return { emp, selfDone, supDone, peersDone, peersTotal };
    });
    const expectedTotal = rows.reduce((sum, r) => sum + 2 + r.peersTotal, 0);
    const completedTotal = rows.reduce((sum, r) => sum + (r.selfDone ? 1 : 0) + (r.supDone ? 1 : 0) + r.peersDone, 0);
    const allCompleted = expectedTotal > 0 && completedTotal >= expectedTotal;
    return { period, submitted, rows, expectedTotal, completedTotal, allCompleted };
  }), [periods, evaluations, employees]);

  const handleExportPeriodPdf = (periodLabel: string, rows: Array<{
    emp: { name: string; position: string };
    selfDone: boolean;
    supDone: boolean;
    peersDone: number;
    peersTotal: number;
  }>) => {
    const html = `
      <h1>KPI Completion Report</h1>
      <div class="sub">Period: ${escapeHtml(periodLabel)}</div>
      <table>
        <thead>
          <tr>
            <th>ชื่อ</th>
            <th>ตำแหน่ง</th>
            <th>Self</th>
            <th>Peer</th>
            <th>Supervisor</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.emp.name)}</td>
              <td>${escapeHtml(row.emp.position)}</td>
              <td>${row.selfDone ? "✅" : "❌"}</td>
              <td>${row.peersDone}/${row.peersTotal}</td>
              <td>${row.supDone ? "✅" : "❌"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    exportPDF(`kpi-completion-${periodLabel}`, html);
  };

  if (authLoading || periodsLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!isAdmin) return <Navigate to="/kpi/overview" replace />;

  return (
    <div className="p-4 md:p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">KPI Admin</h1>
            <p className="text-sm text-muted-foreground">จัดการรอบการประเมินและดูสถานะการส่ง</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> รอบใหม่
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">สร้างรอบประเมินใหม่</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อรอบประเมิน</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="เช่น OVL Project Review หรือ Q2 2026"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ประเภท</label>
              <select value={type} onChange={e => setType(e.target.value as "quarter" | "project")}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="quarter">รายไตรมาส</option>
                <option value="project">ตามโปรเจกต์</option>
              </select>
            </div>
            {type === "project" && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">โปรเจกต์</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">— เลือกโปรเจกต์ —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-60">
              {creating ? "กำลังสร้าง..." : "สร้าง"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Period list */}
      <div className="space-y-5">
        {periodStats.length === 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-10 text-center text-muted-foreground">
            ยังไม่มีรอบการประเมิน
          </div>
        )}
        {periodStats.map(({ period, submitted, rows, completedTotal, expectedTotal, allCompleted }) => (
          <div key={period.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3"
              style={{ background: "hsl(222 47% 11% / 0.04)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-base">{period.label}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={period.status === "open"
                      ? { background: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)" }
                      : { background: "hsl(215 14% 60% / 0.15)", color: "hsl(215 14% 45%)" }}>
                    {period.status === "open" ? "เปิดอยู่" : "ปิดแล้ว"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {period.type === "project" ? "ตามโปรเจกต์" : "รายไตรมาส"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">ส่งแล้ว {submitted} รายการ</p>
                <p className="text-xs text-muted-foreground mt-0.5">ครบถ้วน {completedTotal}/{expectedTotal}</p>
              </div>
              <div className="flex items-center gap-2">
                {allCompleted && (
                  <button
                    onClick={() => handleExportPeriodPdf(period.label, rows)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors flex-shrink-0">
                    <FileDown className="w-3.5 h-3.5" /> Export PDF
                  </button>
                )}
                <button
                  onClick={() => handleToggleStatus(period.id, period.status as "open" | "closed")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors flex-shrink-0">
                  {period.status === "open"
                    ? <><Lock className="w-3.5 h-3.5" /> ปิดรอบ</>
                    : <><Unlock className="w-3.5 h-3.5" /> เปิดรอบ</>}
                </button>
                {period.type === "quarter" && (
                  <button
                    onClick={() => handleDeletePeriod(period.id, period.label)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/5 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" /> ลบไตรมาส
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-border/30">
              {rows.map(({ emp, selfDone, supDone, peersDone, peersTotal }) => (
                <div key={emp.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                      {avatarUrl(emp.avatar)
                        ? <img src={avatarUrl(emp.avatar)!} alt={emp.name} className="w-full h-full object-cover" />
                        : <span className="text-[10px] font-bold text-primary">{emp.name.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusPill done={selfDone} label="ตนเอง" />
                    <StatusPill done={peersDone === peersTotal && peersTotal > 0} label={`เพื่อน ${peersDone}/${peersTotal}`} />
                    <StatusPill done={supDone} label="หัวหน้า" />
                  </div>
                  <Link to={`/kpi/report/${emp.id}`}>
                    <button className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" /> รายงาน
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

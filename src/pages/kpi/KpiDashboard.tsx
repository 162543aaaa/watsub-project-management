import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BarChart, Bar, CartesianGrid, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Plus, Bell, Lock } from "lucide-react";

import { useAuthContext } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useKpiEvaluations, useKpiPeriods, calcFinalScore } from "@/hooks/useKpi";
import { KPI_CATEGORIES } from "@/hooks/useKpi";
import { resolveRoleKey, ROLE_WEIGHTS } from "@/config/kpiQuestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function averageCategory(scores: Record<string, number | string>, keys: string[]) {
  const vals = keys.map((k) => Number(scores[k] ?? 0)).filter((v) => Number.isFinite(v) && v > 0);
  return avg(vals);
}

function weightedFromRole(scores: Record<string, number | string>, roleWeights: Record<string, number>) {
  let total = 0;
  let sumWeight = 0;
  for (const cat of KPI_CATEGORIES) {
    const w = roleWeights[cat.key] ?? 0;
    if (w === 0) continue;
    const catAvg = averageCategory(scores, cat.items.map((i) => i.key));
    if (catAvg <= 0) continue;
    total += catAvg * w;
    sumWeight += w;
  }
  return sumWeight === 0 ? 0 : total / sumWeight;
}

export default function KpiDashboard() {
  const { user, isAdmin } = useAuthContext();
  const { employees } = useEmployees();
  const { periods, updatePeriod } = useKpiPeriods();
  const { evaluations } = useKpiEvaluations();
  const [memberFilter, setMemberFilter] = useState("all");
  const navigate = useNavigate();

  const me = useMemo(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return null;
    return employees.find((e) => (e.email ?? "").toLowerCase() === email) ?? null;
  }, [employees, user?.email]);
  const isDirector = Boolean(me?.role?.toLowerCase().includes("director"));
  const canView = isAdmin || isDirector;

  const currentPeriod = useMemo(() => periods.find((p) => p.status === "open") ?? periods[0], [periods]);
  const prevPeriod = useMemo(() => {
    if (!currentPeriod) return null;
    const sorted = [...periods].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const idx = sorted.findIndex((p) => p.id === currentPeriod.id);
    return idx > 0 ? sorted[idx - 1] : null;
  }, [periods, currentPeriod]);

  const memberScores = useMemo(() => {
    if (!currentPeriod) return [];
    return employees.map((emp) => {
      const roleKey = resolveRoleKey(emp);
      const roleWeights = ROLE_WEIGHTS[roleKey];
      const memberEvals = evaluations.filter((e) => e.period_id === currentPeriod.id && e.evaluatee_id === emp.id && e.submitted_at);
      const self = avg(memberEvals.filter((e) => e.type === "self").map((e) => weightedFromRole(e.scores as Record<string, number | string>, roleWeights)));
      const peer = avg(memberEvals.filter((e) => e.type === "peer").map((e) => weightedFromRole(e.scores as Record<string, number | string>, roleWeights)));
      const sup = avg(memberEvals.filter((e) => e.type === "supervisor").map((e) => weightedFromRole(e.scores as Record<string, number | string>, roleWeights)));
      const auto = 0;
      const final = calcFinalScore(auto, self || null, peer || null, sup || null);
      const job = avg(memberEvals.map((e) => averageCategory(e.scores as Record<string, number | string>, ["quality", "quantity", "punctuality", "accountability"])));
      const comp = avg(memberEvals.map((e) => averageCategory(e.scores as Record<string, number | string>, ["technical", "problem_solving", "learning", "decision_making", "creativity"])));
      const team = avg(memberEvals.map((e) => averageCategory(e.scores as Record<string, number | string>, ["communication", "support", "openness", "collaboration"])));
      const lead = avg(memberEvals.map((e) => averageCategory(e.scores as Record<string, number | string>, ["presentation", "decision_making", "management", "strategic"])));

      let trend = "→";
      if (prevPeriod) {
        const prev = evaluations.filter((e) => e.period_id === prevPeriod.id && e.evaluatee_id === emp.id && e.submitted_at);
        const prevFinal = avg(prev.map((e) => weightedFromRole(e.scores as Record<string, number | string>, roleWeights)));
        if (final > prevFinal + 0.05) trend = "↑";
        else if (final < prevFinal - 0.05) trend = "↓";
      }

      const status = {
        self: memberEvals.some((e) => e.evaluator_id === emp.id && e.type === "self"),
        peer: memberEvals.filter((e) => e.type === "peer").length,
        supervisor: memberEvals.some((e) => e.type === "supervisor"),
      };

      return { emp, final, job, comp, team, lead, trend, status };
    });
  }, [currentPeriod, employees, evaluations, prevPeriod]);

  const teamAvg = avg(memberScores.map((m) => m.final).filter((n) => n > 0));
  const top = [...memberScores].sort((a, b) => b.final - a.final)[0];
  const low = [...memberScores].sort((a, b) => a.final - b.final)[0];
  const submitted = evaluations.filter((e) => e.period_id === currentPeriod?.id && e.submitted_at).length;
  const expected = employees.length * 4;

  const radarData = useMemo(() => {
    const rows = memberFilter === "all" ? memberScores : memberScores.filter((m) => m.emp.id === memberFilter);
    return rows.map((row) => ({
      name: row.emp.name,
      Job: Number(row.job.toFixed(2)),
      Competency: Number(row.comp.toFixed(2)),
      Teamwork: Number(row.team.toFixed(2)),
      Leadership: Number(row.lead.toFixed(2)),
    }));
  }, [memberScores, memberFilter]);

  const radarChartData = useMemo(() => ([
    {
      axis: "Job",
      ...Object.fromEntries(radarData.map((r) => [r.name, r.Job])),
    },
    {
      axis: "Competency",
      ...Object.fromEntries(radarData.map((r) => [r.name, r.Competency])),
    },
    {
      axis: "Teamwork",
      ...Object.fromEntries(radarData.map((r) => [r.name, r.Teamwork])),
    },
    {
      axis: "Leadership",
      ...Object.fromEntries(radarData.map((r) => [r.name, r.Leadership])),
    },
  ]), [radarData]);

  const comparisonData = useMemo(() => {
    const closed = periods.filter((p) => p.status === "closed");
    return closed.map((p) => {
      const pEvals = evaluations.filter((e) => e.period_id === p.id && e.submitted_at);
      const agg = pEvals.map((e) => {
        const rw = ROLE_WEIGHTS[resolveRoleKey(employees.find((em) => em.id === e.evaluatee_id) ?? undefined)];
        return {
          job: averageCategory(e.scores as Record<string, number | string>, ["quality", "quantity", "punctuality", "accountability"]),
          comp: averageCategory(e.scores as Record<string, number | string>, ["technical", "problem_solving", "learning", "decision_making", "creativity"]),
          team: averageCategory(e.scores as Record<string, number | string>, ["communication", "support", "openness", "collaboration"]),
          lead: averageCategory(e.scores as Record<string, number | string>, ["presentation", "decision_making", "management", "strategic"]),
          overall: weightedFromRole(e.scores as Record<string, number | string>, rw),
        };
      });
      return {
        period: p.label,
        Team: Number(avg(agg.map((a) => a.overall)).toFixed(2)),
        Job: Number(avg(agg.map((a) => a.job)).toFixed(2)),
        Comp: Number(avg(agg.map((a) => a.comp)).toFixed(2)),
        Teamwork: Number(avg(agg.map((a) => a.team)).toFixed(2)),
        Lead: Number(avg(agg.map((a) => a.lead)).toFixed(2)),
      };
    });
  }, [periods, evaluations, employees]);

  const remind = async (name: string) => {
    await supabase.from("notifications").insert({
      title: "KPI Reminder",
      message: `กรุณาส่งแบบประเมิน KPI ให้ครบถ้วน (${name})`,
      type: "info",
      is_read: false,
    });
    toast({ title: `ส่ง remind ให้ ${name} แล้ว` });
  };

  const exportCsv = () => {
    const header = ["name", "role", "total", "job", "comp", "team", "lead", "trend"];
    const rows = memberScores.map((m) => [m.emp.name, m.emp.role, m.final.toFixed(2), m.job.toFixed(2), m.comp.toFixed(2), m.team.toFixed(2), m.lead.toFixed(2), m.trend]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-dashboard-${currentPeriod?.label ?? "period"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) return <Navigate to="/kpi/overview" replace />;
  if (!currentPeriod) return <div className="p-6">ยังไม่มีรอบ KPI</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">รอบปัจจุบัน</p><p className="font-semibold">{currentPeriod.label} ({currentPeriod.status === "open" ? "เปิดอยู่" : "ปิดแล้ว"})</p></div>
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Submission</p><p className="font-semibold">{submitted}/{expected}</p></div>
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">คะแนนเฉลี่ยทีม</p><p className="font-semibold">{teamAvg.toFixed(2)} / 5</p></div>
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">สูงสุด/ต่ำสุด</p><p className="font-semibold">{top?.emp.name ?? "-"} / {low?.emp.name ?? "-"}</p></div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Team Radar Chart</h2>
          <select className="border rounded px-2 py-1 text-sm" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
            <option value="all">ทั้งทีม</option>
            {memberScores.map((m) => <option key={m.emp.id} value={m.emp.id}>{m.emp.name}</option>)}
          </select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarChartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" />
              <PolarRadiusAxis domain={[0, 5]} />
              {radarData.map((row, idx) => (
                <Radar
                  key={row.name}
                  name={row.name}
                  dataKey={row.name}
                  stroke={["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"][idx % 5]}
                  fill={["#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"][idx % 5]}
                  fillOpacity={0.1}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 overflow-auto">
        <h2 className="font-semibold mb-3">Individual Summary</h2>
        <table className="min-w-full text-sm">
          <thead><tr className="text-left border-b"><th>ชื่อ</th><th>role</th><th>คะแนนรวม</th><th>job</th><th>comp</th><th>team</th><th>lead</th><th>creativity</th><th>trend</th></tr></thead>
          <tbody>
            {memberScores.map((m) => (
              <tr key={m.emp.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/kpi/report/${m.emp.id}`)}>
                <td>{m.emp.name}</td><td>{m.emp.kpi_role ?? m.emp.role}</td><td>{m.final.toFixed(2)}</td><td>{m.job.toFixed(2)}</td><td>{m.comp.toFixed(2)}</td><td>{m.team.toFixed(2)}</td><td>{m.lead.toFixed(2)}</td><td>0.00</td><td>{m.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border rounded-xl p-4 overflow-auto">
        <h2 className="font-semibold mb-3">Submission Status</h2>
        <table className="min-w-full text-sm">
          <thead><tr className="text-left border-b"><th>ชื่อ</th><th>self</th><th>peer 1</th><th>peer 2</th><th>supervisor</th><th>status</th></tr></thead>
          <tbody>
            {memberScores.map((m) => {
              const donePeer = m.status.peer;
              const ok = m.status.self && m.status.supervisor && donePeer >= 2;
              return (
                <tr key={m.emp.id} className="border-b">
                  <td>{m.emp.name}</td>
                  <td>{m.status.self ? "✓" : "pending"}</td>
                  <td>{donePeer >= 1 ? "✓" : "pending"}</td>
                  <td>{donePeer >= 2 ? "✓" : "pending"}</td>
                  <td>{m.status.supervisor ? "✓" : "pending"}</td>
                  <td>{ok ? "complete" : <button className="text-xs border rounded px-2 py-1 inline-flex items-center gap-1" onClick={() => remind(m.emp.name)}><Bell className="w-3 h-3" /> remind</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comparisonData.length >= 2 && (
        <div className="bg-card border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Period Comparison</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Team" fill="#06b6d4" />
                <Bar dataKey="Job" fill="#0ea5e9" />
                <Bar dataKey="Comp" fill="#8b5cf6" />
                <Bar dataKey="Teamwork" fill="#22c55e" />
                <Bar dataKey="Lead" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/kpi/admin/new-period" className="px-3 py-2 border rounded-lg inline-flex items-center gap-1 text-sm"><Plus className="w-4 h-4" /> สร้างรอบใหม่</Link>
        <button onClick={() => updatePeriod(currentPeriod.id, { status: "closed" })} className="px-3 py-2 border rounded-lg inline-flex items-center gap-1 text-sm"><Lock className="w-4 h-4" /> ปิดรอบปัจจุบัน</button>
        <button onClick={exportCsv} className="px-3 py-2 border rounded-lg inline-flex items-center gap-1 text-sm"><Download className="w-4 h-4" /> export CSV</button>
      </div>
    </div>
  );
}

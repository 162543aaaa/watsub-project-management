import { useMemo } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { BarChart, Bar, CartesianGrid, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Download, FileSpreadsheet, BellRing } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useKpiEvaluations, useKpiPeriods, calcCategoryScore, calcFinalScore, type KpiSubScores } from "@/hooks/useKpi";
import { getEligiblePeerReviewers, getSelfEvaluationType, resolveRoleKey } from "@/config/kpiQuestions";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "@/hooks/use-toast";

const CATS = [
  { key: "job_performance", short: "Job" },
  { key: "competency", short: "Comp" },
  { key: "teamwork", short: "Team" },
  { key: "leadership", short: "Lead" },
] as const;

function trendIcon(current: number | null, prev: number | null) {
  if (current === null || prev === null) return "→";
  if (current > prev + 0.01) return "↑";
  if (current < prev - 0.01) return "↓";
  return "→";
}

export default function KpiDashboard() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuthContext();
  const { periods } = useKpiPeriods();
  const { evaluations } = useKpiEvaluations();
  const { employees } = useEmployees();
  const { addNotification } = useNotifications();

  const me = useMemo(() => {
    const email = (user?.email ?? "").toLowerCase();
    return employees.find((emp) => (emp.email ?? "").toLowerCase() === email) ?? null;
  }, [employees, user?.email]);

  const canView = isAdmin || me?.role?.toLowerCase().includes("director");
  if (!canView) return <Navigate to="/kpi/overview" replace />;

  const openPeriods = periods.filter((p) => p.status === "open");
  const closedPeriods = periods.filter((p) => p.status === "closed").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const active = openPeriods[0] ?? closedPeriods[closedPeriods.length - 1] ?? null;
  if (!active) {
    return <div className="p-6 text-sm text-muted-foreground">ยังไม่มีรอบ KPI</div>;
  }

  const evals = evaluations.filter((e) => e.period_id === active.id && e.submitted_at);

  const personRows = employees.map((emp) => {
    const personEvals = evals.filter((e) => e.evaluatee_id === emp.id);
    const getAvg = (type: "self" | "peer" | "supervisor") => {
      const items = personEvals.filter((e) => e.type === type);
      if (!items.length) return null;
      const vals = items.map((ev) => {
        const scores = ev.scores as KpiSubScores;
        const catScores = CATS.map((cat) => calcCategoryScore(scores, cat.key));
        const valid = catScores.filter((v) => v > 0);
        if (!valid.length) return 0;
        return valid.reduce((a, b) => a + b, 0) / valid.length;
      });
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const self = getAvg("self");
    const peer = getAvg("peer");
    const supervisor = getAvg("supervisor");
    const auto = self ?? 0;
    const final = personEvals.length ? calcFinalScore(auto, self, peer, supervisor) : null;

    const lastClosed = closedPeriods[closedPeriods.length - 2];
    const prevFinal = lastClosed
      ? evaluations.filter((e) => e.period_id === lastClosed.id && e.evaluatee_id === emp.id && e.submitted_at).length
        ? calcFinalScore(auto, self, peer, supervisor)
        : null
      : null;

    const scoreByCat: Record<string, number> = {};
    for (const cat of CATS) {
      const vals = personEvals
        .map((ev) => calcCategoryScore(ev.scores as KpiSubScores, cat.key))
        .filter((v) => v > 0);
      scoreByCat[cat.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    const selfType = getSelfEvaluationType(resolveRoleKey(emp));
    const peers = getEligiblePeerReviewers(emp, employees);
    const selfDone = evals.some((e) => e.evaluatee_id === emp.id && e.evaluator_id === emp.id && e.type === selfType);
    const supDone = evals.some((e) => e.evaluatee_id === emp.id && e.type === "supervisor");
    const peerDone = peers.filter((peerEmp) => evals.some((e) => e.evaluatee_id === emp.id && e.evaluator_id === peerEmp.id && e.type === "peer")).length;

    return {
      emp,
      final,
      prevFinal,
      trend: trendIcon(final, prevFinal),
      scoreByCat,
      selfDone,
      supDone,
      peerDone,
      peerTotal: peers.length,
      complete: selfDone && supDone && peerDone >= Math.min(2, peers.length),
    };
  });

  const completed = personRows.filter((r) => r.complete).length;
  const teamAvg = personRows.filter((r) => r.final !== null).map((r) => r.final as number);
  const teamWeightedAvg = teamAvg.length ? teamAvg.reduce((a, b) => a + b, 0) / teamAvg.length : 0;
  const top = [...personRows].filter((r) => r.final !== null).sort((a, b) => (b.final ?? 0) - (a.final ?? 0))[0];
  const low = [...personRows].filter((r) => r.final !== null).sort((a, b) => (a.final ?? 0) - (b.final ?? 0))[0];

  const radarData = personRows.map((r) => ({
    name: r.emp.name,
    Job: Number(r.scoreByCat.job_performance.toFixed(2)),
    Comp: Number(r.scoreByCat.competency.toFixed(2)),
    Team: Number(r.scoreByCat.teamwork.toFixed(2)),
    Lead: Number(r.scoreByCat.leadership.toFixed(2)),
  }));

  const periodCompare = closedPeriods.map((period) => {
    const periodEvals = evaluations.filter((e) => e.period_id === period.id && e.submitted_at);
    const perCat: Record<string, number> = { job: 0, comp: 0, team: 0, lead: 0 };
    const total = periodEvals.length || 1;
    for (const ev of periodEvals) {
      const scores = ev.scores as KpiSubScores;
      perCat.job += calcCategoryScore(scores, "job_performance");
      perCat.comp += calcCategoryScore(scores, "competency");
      perCat.team += calcCategoryScore(scores, "teamwork");
      perCat.lead += calcCategoryScore(scores, "leadership");
    }
    return {
      period: period.label,
      job: Number((perCat.job / total).toFixed(2)),
      comp: Number((perCat.comp / total).toFixed(2)),
      team: Number((perCat.team / total).toFixed(2)),
      lead: Number((perCat.lead / total).toFixed(2)),
    };
  });

  const remind = async (name: string) => {
    await addNotification({
      title: `KPI reminder: ${name}`,
      message: `กรุณาอัปเดตแบบประเมิน KPI รอบ ${active.label}`,
      is_read: false,
      type: "info",
    });
    toast({ title: "ส่ง remind แล้ว", description: `แจ้งเตือนไปยัง ${name}` });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl md:text-2xl font-bold">KPI Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link to="/kpi/admin" className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" />สร้างรอบใหม่</Link>
          <button className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2" onClick={() => navigate("/export")}><Download className="w-4 h-4" />Export PDF</button>
          <button className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2" onClick={() => navigate("/export")}><FileSpreadsheet className="w-4 h-4" />Export CSV</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="Periods" value={`Open ${openPeriods.length} / Closed ${closedPeriods.length}`} />
        <Card title="Submission" value={`${completed}/${personRows.length} คน`} />
        <Card title="Team average" value={teamWeightedAvg.toFixed(2)} />
        <Card title="Top / Low" value={`${top?.emp.name ?? "-"} / ${low?.emp.name ?? "-"}`} />
      </div>

      <section className="bg-card border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Team Radar Chart</h2>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis domain={[0, 5]} />
              <Radar name="Job" dataKey="Job" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} />
              <Radar name="Comp" dataKey="Comp" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} />
              <Radar name="Team" dataKey="Team" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />
              <Radar name="Lead" dataKey="Lead" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-card border rounded-xl p-4 overflow-auto">
        <h2 className="font-semibold mb-3">Individual Summary</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>ชื่อ</th><th>role</th><th>คะแนนรวม</th><th>job</th><th>comp</th><th>team</th><th>lead</th><th>creativity</th><th>trend</th></tr></thead>
          <tbody>
            {personRows.map((r) => (
              <tr key={r.emp.id} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/kpi/report/${r.emp.id}`)}>
                <td>{r.emp.name}</td><td>{r.emp.kpi_role ?? "-"}</td><td>{r.final?.toFixed(2) ?? "-"}</td>
                <td>{r.scoreByCat.job_performance.toFixed(2)}</td><td>{r.scoreByCat.competency.toFixed(2)}</td><td>{r.scoreByCat.teamwork.toFixed(2)}</td><td>{r.scoreByCat.leadership.toFixed(2)}</td><td>-</td><td>{r.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-card border rounded-xl p-4 overflow-auto">
        <h2 className="font-semibold mb-3">Submission Status</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>ชื่อ</th><th>self</th><th>peer 1</th><th>peer 2</th><th>supervisor</th><th>status</th></tr></thead>
          <tbody>
            {personRows.map((r) => (
              <tr key={r.emp.id} className="border-b">
                <td>{r.emp.name}</td>
                <td>{r.selfDone ? "✓" : "pending"}</td>
                <td>{r.peerDone >= 1 ? "✓" : "pending"}</td>
                <td>{r.peerDone >= 2 || r.peerTotal < 2 ? "✓" : "pending"}</td>
                <td>{r.supDone ? "✓" : "pending"}</td>
                <td>
                  {r.complete ? "complete" : (
                    <button className="px-2 py-1 rounded border inline-flex items-center gap-1" onClick={() => remind(r.emp.name)}><BellRing className="w-3 h-3" />remind</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {periodCompare.length > 1 && (
        <section className="bg-card border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Period Comparison</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodCompare}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="job" fill="#0ea5e9" />
                <Bar dataKey="comp" fill="#8b5cf6" />
                <Bar dataKey="team" fill="#22c55e" />
                <Bar dataKey="lead" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-base font-semibold mt-1">{value}</p>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, BarChart2, TrendingUp } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  useKpiPeriods, useKpiEvaluations, useKpiRoleWeights,
  calcWeightedScore, calcFinalScore, type KpiEvaluation,
} from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const RADAR_KEYS = ["job_performance", "competency", "teamwork", "leadership"] as const;
const RADAR_LABELS: Record<string, string> = {
  job_performance: "ผลงาน",
  competency: "ความสามารถ",
  teamwork: "ทีม",
  leadership: "ผู้นำ",
};

function avg(evals: KpiEvaluation[], weights: ReturnType<ReturnType<typeof useKpiRoleWeights>["getWeightForRole"]>): number | null {
  if (evals.length === 0) return null;
  const scores = evals.map(e => calcWeightedScore(e.scores, weights));
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export default function KpiReport() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations: allEvals } = useKpiEvaluations();
  const { employees } = useEmployees();
  const { getWeightForRole } = useKpiRoleWeights();

  const member = useMemo(() => employees.find(e => e.id === memberId), [employees, memberId]);
  const weights = useMemo(() => member ? getWeightForRole(member.role ?? "") : null, [member, getWeightForRole]);

  // Latest closed period + previous for trend
  const closedPeriods = useMemo(() =>
    periods.filter(p => p.status === "closed").sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [periods]
  );
  const latestPeriod = closedPeriods[closedPeriods.length - 1];
  const prevPeriod = closedPeriods[closedPeriods.length - 2];

  // Per-period score breakdown for the member
  function getMemberScores(periodId: string) {
    if (!memberId || !weights) return null;
    const evals = allEvals.filter(e => e.period_id === periodId && e.evaluatee_id === memberId && e.submitted_at);
    const selfEvals = evals.filter(e => e.type === "self");
    const peerEvals = evals.filter(e => e.type === "peer");
    const supEvals = evals.filter(e => e.type === "supervisor");
    return {
      self: avg(selfEvals, weights),
      peer: avg(peerEvals, weights),
      supervisor: avg(supEvals, weights),
    };
  }

  const latestScores = latestPeriod ? getMemberScores(latestPeriod.id) : null;
  const prevScores = prevPeriod ? getMemberScores(prevPeriod.id) : null;

  // Auto score from tasks
  const [autoScore, setAutoScore] = useState<number>(0);
  useEffect(() => {
    if (!memberId) return;
    supabase.from("tasks").select("status, due_date, comments").contains("assigned_to", [memberId])
      .then(({ data }) => {
        if (!data || data.length === 0) { setAutoScore(0); return; }
        const done = data.filter(t => t.status === "Done");
        const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date());
        const punctuality = done.length > 0 ? (onTime.length / done.length) : 0;
        const firstPass = done.filter(t => !t.comments?.toLowerCase().includes("revision") && !t.comments?.toLowerCase().includes("แก้ไข"));
        const quality = done.length > 0 ? (firstPass.length / done.length) : 0;
        setAutoScore(((punctuality + quality) / 2) * 5);
      });
  }, [memberId]);

  const finalScore = latestScores
    ? calcFinalScore(autoScore, latestScores.self, latestScores.peer, latestScores.supervisor)
    : null;

  // Radar data: per-axis averages from all submitted evals for latest period
  const radarData = useMemo(() => {
    if (!latestPeriod || !memberId) return [];
    const evals = allEvals.filter(e => e.period_id === latestPeriod.id && e.evaluatee_id === memberId && e.submitted_at);
    return RADAR_KEYS.map(key => {
      const vals = evals.map(e => (e.scores as Record<string, number>)[key] ?? 0).filter(v => v > 0);
      const value = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { axis: RADAR_LABELS[key], value: parseFloat(value.toFixed(2)) };
    });
  }, [latestPeriod, allEvals, memberId]);

  // Trend line data
  const trendData = useMemo(() => {
    return closedPeriods.slice(-5).map(p => {
      const s = getMemberScores(p.id);
      const final = s ? calcFinalScore(autoScore, s.self, s.peer, s.supervisor) : null;
      return { period: p.label, คะแนนรวม: final ? parseFloat(final.toFixed(2)) : null };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedPeriods, allEvals, autoScore]);

  // Action plan (saved per period, stored in localStorage for now — lightweight)
  const actionKey = `kpi_action_${memberId}_${latestPeriod?.id ?? ""}`;
  const [actionPlan, setActionPlan] = useState(() => localStorage.getItem(actionKey) ?? "");
  const saveActionPlan = () => {
    localStorage.setItem(actionKey, actionPlan);
    toast({ title: "บันทึก Action Plan แล้ว" });
  };

  if (!member) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 page-enter max-w-3xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/kpi/overview")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">รายงาน KPI: {member.name}</h1>
          <p className="text-sm text-muted-foreground">{member.position}</p>
        </div>
      </div>

      {!latestPeriod ? (
        <div className="bg-card border border-border/60 rounded-2xl p-10 text-center text-muted-foreground">
          ยังไม่มีรอบการประเมินที่ปิดแล้ว
        </div>
      ) : (
        <div className="space-y-5">
          {/* Score breakdown */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              คะแนน — {latestPeriod.label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Auto (งาน)", value: autoScore },
                { label: "ตนเอง", value: latestScores?.self },
                { label: "เพื่อน", value: isAdmin ? latestScores?.peer : null, hidden: !isAdmin },
                { label: "หัวหน้า", value: latestScores?.supervisor },
              ].filter(s => !s.hidden).map(s => (
                <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-xl font-bold">{s.value !== null && s.value !== undefined ? s.value.toFixed(2) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">/ 5</p>
                </div>
              ))}
            </div>
            {finalScore !== null && (
              <div className="rounded-xl p-3 text-center" style={{ background: "hsl(191 91% 37% / 0.08)" }}>
                <p className="text-xs text-muted-foreground mb-0.5">คะแนนรวมสุดท้าย</p>
                <p className="text-2xl font-bold" style={{ color: "hsl(191 91% 37%)" }}>{finalScore.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">/ 5</p>
              </div>
            )}
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Radar Chart</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(220 13% 88%)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "hsl(222 47% 40%)" }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} tickCount={6} />
                  <Radar
                    name={member.name}
                    dataKey="value"
                    stroke="hsl(191 91% 37%)"
                    fill="hsl(191 91% 37%)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trend line */}
          {trendData.length >= 2 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">แนวโน้มคะแนน</h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 88%)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="คะแนนรวม"
                    stroke="hsl(191 91% 37%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(191 91% 37%)", r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Action plan */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Action Plan</h2>
            <textarea
              value={actionPlan}
              onChange={e => setActionPlan(e.target.value)}
              rows={4}
              placeholder="กำหนดแผนพัฒนาตนเองสำหรับรอบถัดไป..."
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            />
            <button
              onClick={saveActionPlan}
              className="btn-primary text-sm px-4 py-2 rounded-lg"
            >
              บันทึก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

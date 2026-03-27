import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart2, TrendingUp, Star } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  KPI_CATEGORIES,
  useKpiPeriods, useKpiEvaluations,
  calcCategoryScore, calcWeightedScore, calcFinalScore,
  type KpiEvaluation, type KpiSubScores,
} from "@/hooks/useKpi";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
function getAvatarUrl(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

function avgScores(evals: KpiEvaluation[]): KpiSubScores | null {
  if (evals.length === 0) return null;
  const result: Record<string, number> = {};
  for (const ev of evals) {
    for (const [k, v] of Object.entries(ev.scores as Record<string, number>)) {
      result[k] = (result[k] ?? 0) + v;
    }
  }
  for (const k in result) result[k] /= evals.length;
  return result as KpiSubScores;
}

function avgWeighted(evals: KpiEvaluation[]): number | null {
  if (evals.length === 0) return null;
  const scores = evals.map(e => calcWeightedScore(e.scores as KpiSubScores));
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export default function KpiReport() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations: allEvals } = useKpiEvaluations();
  const { employees } = useEmployees();

  const member = useMemo(() => employees.find(e => e.id === memberId), [employees, memberId]);

  const closedPeriods = useMemo(() =>
    periods.filter(p => p.status === "closed").sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [periods]
  );
  const latestPeriod = closedPeriods[closedPeriods.length - 1];

  function getBreakdown(periodId: string) {
    const evals = allEvals.filter(e => e.period_id === periodId && e.evaluatee_id === memberId && e.submitted_at);
    return {
      self: avgWeighted(evals.filter(e => e.type === "self")),
      peer: avgWeighted(evals.filter(e => e.type === "peer")),
      supervisor: avgWeighted(evals.filter(e => e.type === "supervisor")),
      allScores: avgScores(evals),
    };
  }

  const latestBreakdown = latestPeriod ? getBreakdown(latestPeriod.id) : null;

  // Auto score from tasks
  const [autoScore, setAutoScore] = useState(0);
  useEffect(() => {
    if (!memberId) return;
    supabase.from("tasks").select("status, due_date, comments").contains("assigned_to", [memberId])
      .then(({ data }) => {
        if (!data || data.length === 0) { setAutoScore(0); return; }
        const done = data.filter(t => t.status === "Done");
        const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date());
        const firstPass = done.filter(t => !t.comments?.toLowerCase().includes("revision") && !t.comments?.toLowerCase().includes("แก้ไข"));
        setAutoScore(((done.length > 0 ? onTime.length / done.length : 0) + (done.length > 0 ? firstPass.length / done.length : 0)) / 2 * 5);
      });
  }, [memberId]);

  const finalScore = latestBreakdown
    ? calcFinalScore(autoScore, latestBreakdown.self, latestBreakdown.peer, latestBreakdown.supervisor)
    : null;

  // Radar: category averages from all submitted evals of latest period
  const radarData = useMemo(() => {
    if (!latestPeriod || !memberId) return [];
    const evals = allEvals.filter(e => e.period_id === latestPeriod.id && e.evaluatee_id === memberId && e.submitted_at);
    const merged = avgScores(evals);
    if (!merged) return [];
    return KPI_CATEGORIES.map(cat => ({
      category: cat.labelTh.replace(" / ", "\n/ "),
      คะแนน: parseFloat(calcCategoryScore(merged, cat.key).toFixed(2)),
      fullMark: 5,
    }));
  }, [latestPeriod, allEvals, memberId]);

  // Trend line — last 5 closed periods
  const trendData = useMemo(() => {
    return closedPeriods.slice(-5).map(p => {
      const b = getBreakdown(p.id);
      const final = b ? calcFinalScore(autoScore, b.self, b.peer, b.supervisor) : null;
      return { period: p.label, คะแนนรวม: final !== null ? parseFloat(final.toFixed(2)) : null };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedPeriods, allEvals, autoScore]);

  // Action plan (per member per period, persisted in localStorage)
  const actionKey = `kpi_action_${memberId}_${latestPeriod?.id ?? ""}`;
  const [actionPlan, setActionPlan] = useState(() => localStorage.getItem(actionKey) ?? "");
  const saveActionPlan = () => {
    localStorage.setItem(actionKey, actionPlan);
    toast({ title: "บันทึก Action Plan แล้ว" });
  };

  if (!member) {
    return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const avatarUrl = getAvatarUrl(member.avatar);

  return (
    <div className="p-4 md:p-6 page-enter max-w-3xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/kpi/overview")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Header */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
          {avatarUrl
            ? <img src={avatarUrl} alt={member.name} className="w-full h-full object-cover" />
            : <span className="text-xl font-bold text-primary">{member.name.charAt(0)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary flex-shrink-0" />
            <h1 className="text-xl font-bold truncate">{member.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{member.position}</p>
          {latestPeriod && <p className="text-xs text-muted-foreground mt-0.5">รอบล่าสุด: {latestPeriod.label}</p>}
        </div>
        {finalScore !== null && (
          <div className="text-center flex-shrink-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">คะแนนรวม</p>
            <p className="text-2xl font-bold" style={{ color: "hsl(191 91% 37%)" }}>{finalScore.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">/ 5</p>
          </div>
        )}
      </div>

      {!latestPeriod ? (
        <div className="bg-card border border-border/60 rounded-2xl p-10 text-center text-muted-foreground">
          ยังไม่มีรอบการประเมินที่ปิดแล้ว
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Score Breakdown ── */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              คะแนนแยกประเภท — {latestPeriod.label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Auto (งาน)", value: autoScore, color: "hsl(215 14% 50%)" },
                { label: "ตนเอง (Self)", value: latestBreakdown?.self ?? null, color: "hsl(191 91% 37%)" },
                { label: "เพื่อน (Peer)", value: isAdmin ? (latestBreakdown?.peer ?? null) : null, color: "hsl(262 83% 58%)", adminOnly: true },
                { label: "หัวหน้า (Supervisor)", value: latestBreakdown?.supervisor ?? null, color: "hsl(38 92% 50%)" },
              ].filter(s => !s.adminOnly || isAdmin).map(s => (
                <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1 leading-tight">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>
                    {s.value !== null && s.value !== undefined ? s.value.toFixed(2) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/ 5</p>
                </div>
              ))}
            </div>

            {/* Per-category breakdown */}
            {latestBreakdown?.allScores && (
              <div className="space-y-2 pt-3 border-t border-border/40">
                <p className="text-xs font-medium text-muted-foreground mb-3">คะแนนรายหมวด (ค่าเฉลี่ยทุกประเภท)</p>
                {KPI_CATEGORIES.map(cat => {
                  const score = calcCategoryScore(latestBreakdown.allScores!, cat.key);
                  const pct = (score / 5) * 100;
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{cat.labelTh}</span>
                        <span className="font-bold" style={{ color: cat.color }}>{score > 0 ? score.toFixed(2) : "—"}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Radar Chart ── */}
          {radarData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Radar Chart</h2>
              <p className="text-xs text-muted-foreground mb-4">สมดุลทักษะทั้ง 4 ด้าน</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="hsl(220 13% 88%)" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(222 47% 40%)" }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} tickCount={6} />
                  <Radar
                    name={member.name}
                    dataKey="คะแนน"
                    stroke="hsl(191 91% 37%)"
                    fill="hsl(191 91% 37%)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{ fill: "hsl(191 91% 37%)", r: 4 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Trend Line ── */}
          {trendData.length >= 2 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">แนวโน้มคะแนน</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">เปรียบเทียบรอบที่ผ่านมา</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 88%)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v?.toFixed(2)} />
                  <Legend />
                  <Line type="monotone" dataKey="คะแนนรวม"
                    stroke="hsl(191 91% 37%)" strokeWidth={2}
                    dot={{ fill: "hsl(191 91% 37%)", r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Action Plan ── */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Action Plan</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">เป้าหมายที่ต้องการพัฒนาในโปรเจกต์ถัดไป</p>
            <textarea
              value={actionPlan}
              onChange={e => setActionPlan(e.target.value)}
              rows={4}
              placeholder="กำหนดแผนพัฒนาตนเองสำหรับรอบถัดไป..."
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            />
            <button onClick={saveActionPlan} className="btn-primary text-sm px-4 py-2 rounded-lg">
              บันทึก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

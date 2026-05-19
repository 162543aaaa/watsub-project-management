import { ArrowLeftIcon, ArrowTrendingUpIcon, ChartBarIcon, ExclamationTriangleIcon, StarIcon } from '@heroicons/react/24/solid';
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  KPI_CATEGORIES, useKpiPeriods, useKpiEvaluations,
  calcCategoryScore, calcWeightedScore, calcFinalScore,
  type KpiEvaluation, type KpiSubScores,
} from "@/hooks/useKpi";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { canSeePeerIdentity, resolveRoleKey, getEligiblePeerReviewers, ROLE_WEIGHTS, REVIEWER_WEIGHTS } from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;
const getReviewType = (e: { reviewer_type?: string | null; type?: string | null }) =>
  (e.reviewer_type ?? e.type ?? "").toLowerCase();

function avgScores(evals: KpiEvaluation[]): KpiSubScores | null {
  if (!evals.length) return null;
  const acc: Record<string, number> = {};
  for (const ev of evals) {
    for (const [k, v] of Object.entries(ev.scores as Record<string, number | string>)) {
      if (typeof v !== "number") continue;
      acc[k] = (acc[k] ?? 0) + v;
    }
  }
  for (const k in acc) acc[k] /= evals.length;
  return acc as KpiSubScores;
}

function avgWeighted(evals: KpiEvaluation[], memberInfo?: { name?: string; kpi_role?: string; role?: string; type?: string } | null): number | null {
  if (!evals.length) return null;
  const roleKey = memberInfo ? resolveRoleKey(memberInfo) : null;
  const roleW = roleKey ? ROLE_WEIGHTS[roleKey] : null;

  const vals = evals.map(ev => {
    if (!roleW) return calcWeightedScore(ev.scores as KpiSubScores);
    const s = ev.scores as KpiSubScores;
    let total = 0, wSum = 0;
    for (const cat of KPI_CATEGORIES) {
      const w = roleW[cat.key] ?? 0;
      if (w === 0) continue;
      const avg = calcCategoryScore(s, cat.key);
      if (avg === 0) continue;
      total += avg * w;
      wSum += w;
    }
    return wSum === 0 ? 0 : total / wSum;
  });
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export default function KpiReport() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations: allEvals } = useKpiEvaluations();
  const { employees } = useEmployees();

  const member = useMemo(() => employees.find(e => e.id === memberId), [employees, memberId]);
  const me = useMemo(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return null;
    return employees.find((e) => (e.email ?? "").toLowerCase() === email) ?? null;
  }, [employees, user?.email]);

  const closedPeriods = useMemo(() =>
    periods.filter(p => p.status === "closed").sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [periods]);
  const latest = closedPeriods[closedPeriods.length - 1];

  // Check if there's an open period selected (for status-only view)
  const openPeriods = useMemo(() => periods.filter(p => p.status === "open"), [periods]);

  function getBreakdown(periodId: string) {
    const evals = allEvals.filter(e => e.period_id === periodId && e.evaluatee_id === memberId && e.submitted_at);
    return {
      self: avgWeighted(evals.filter(e => getReviewType(e) === "self"), member),
      peer: avgWeighted(evals.filter(e => getReviewType(e) === "peer"), member),
      supervisor: avgWeighted(evals.filter(e => getReviewType(e) === "supervisor"), member),
      allScores: avgScores(evals),
      peerCount: evals.filter(e => getReviewType(e) === "peer").length,
      peerEvaluators: evals.filter(e => getReviewType(e) === "peer").map((e) => employees.find((emp) => emp.id === e.evaluator_id)?.name).filter(Boolean) as string[],
    };
  }

  const breakdown = latest ? getBreakdown(latest.id) : null;
  const showPeerIdentity = Boolean(me && canSeePeerIdentity(me));

  // Check peer count requirement (need 2 peers to generate report)
  const eligiblePeerCount = useMemo(() => {
    if (!member) return 0;
    return getEligiblePeerReviewers(member, employees).length;
  }, [member, employees]);

  const peerComplete = (breakdown?.peerCount ?? 0) >= Math.min(2, eligiblePeerCount);

  // Auto score from tasks — null when no data
  const [autoScore, setAutoScore] = useState<number | null>(null);
  useEffect(() => {
    if (!memberId) return;
    supabase.from("tasks").select("status,due_date,comments").contains("assigned_to", [memberId])
      .then(({ data }) => {
        if (!data?.length) { setAutoScore(null); return; }
        const done = data.filter(t => t.status === "Done");
        if (!done.length) { setAutoScore(null); return; }
        const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date()).length;
        const fp = done.filter(t =>
          !t.comments?.toLowerCase().includes("revision") &&
          !t.comments?.toLowerCase().includes("แก้ไข")).length;
        const rate = ((onTime / done.length) + (fp / done.length)) / 2;
        setAutoScore(rate * 5);
      });
  }, [memberId]);

  const finalScore = breakdown && peerComplete
    ? calcFinalScore(autoScore ?? 0, breakdown.self, breakdown.peer, breakdown.supervisor)
    : null;

  // Radar data
  const radarData = useMemo(() => {
    if (!latest || !memberId || !peerComplete) return [];
    const evals = allEvals.filter(e => e.period_id === latest.id && e.evaluatee_id === memberId && e.submitted_at);
    const merged = avgScores(evals);
    if (!merged) return [];
    return KPI_CATEGORIES.map(cat => ({
      category: cat.labelTh,
      คะแนน: parseFloat(calcCategoryScore(merged, cat.key).toFixed(2)),
      fullMark: 5,
    }));
  }, [latest, allEvals, memberId, peerComplete]);

  // Trend data
  const trendData = useMemo(() =>
    closedPeriods.slice(-5).map(p => {
      const b = getBreakdown(p.id);
      const pCount = allEvals.filter(e => e.period_id === p.id && e.evaluatee_id === memberId && getReviewType(e) === "peer" && e.submitted_at).length;
      if (pCount < Math.min(2, eligiblePeerCount)) return { period: p.label, คะแนนรวม: null };
      const f = b ? calcFinalScore(autoScore ?? 0, b.self, b.peer, b.supervisor) : null;
      return { period: p.label, คะแนนรวม: f !== null ? parseFloat(f.toFixed(2)) : null };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [closedPeriods, allEvals, autoScore, eligiblePeerCount]);

  // Action plan (localStorage)
  const actionKey = `kpi_action_${memberId}_${latest?.id ?? ""}`;
  const [actionPlan, setActionPlan] = useState(() => localStorage.getItem(actionKey) ?? "");
  const saveAction = () => { localStorage.setItem(actionKey, actionPlan); toast({ title: "บันทึก Action Plan แล้ว" }); };

  if (!member) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const url = avatarUrl(member.avatar);

  // Check if only open periods exist (no closed)
  const hasOnlyOpenPeriods = !latest && openPeriods.length > 0;

  return (
    <div className="p-4 md:p-6 page-enter max-w-3xl mx-auto">
      <button onClick={() => navigate("/kpi/overview")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeftIcon className="w-4 h-4" /> กลับ
      </button>

      {/* Member header */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
          {url
            ? <img src={url} alt={member.name} className="w-full h-full object-cover" />
            : <span className="text-xl font-bold text-primary">{member.name.charAt(0)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <h1 className="text-xl font-bold truncate">{member.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{member.position}</p>
          {latest && <p className="text-xs text-muted-foreground mt-0.5">รอบล่าสุด: {latest.label}</p>}
        </div>
        {finalScore !== null && peerComplete && (
          <div className="text-center flex-shrink-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">คะแนนรวม</p>
            <p className="text-2xl font-bold" style={{ color: "hsl(191 91% 37%)" }}>{finalScore.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">/ 5</p>
          </div>
        )}
      </div>

      {/* Period not closed — show status only */}
      {hasOnlyOpenPeriods && (
        <div className="bg-card border border-amber-300/50 rounded-2xl p-6 text-center">
          <ExclamationTriangleIcon className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-sm mb-1">รอบประเมินยังเปิดอยู่</p>
          <p className="text-sm text-muted-foreground">ผลคะแนนจะแสดงเมื่อรอบประเมินปิดแล้วเท่านั้น ดูได้เฉพาะสถานะ submitted / pending</p>
        </div>
      )}

      {!latest && !hasOnlyOpenPeriods && (
        <div className="bg-card border border-border/60 rounded-2xl p-10 text-center text-muted-foreground">
          ยังไม่มีรอบการประเมินที่ปิดแล้ว
        </div>
      )}

      {latest && !peerComplete && (
        <div className="bg-card border border-amber-300/50 rounded-2xl p-6 text-center mb-5">
          <ExclamationTriangleIcon className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-sm mb-1">ยังไม่สามารถแสดงรายงานได้</p>
          <p className="text-sm text-muted-foreground">
            Peer ส่งแล้ว {breakdown?.peerCount ?? 0} คน จากที่ต้องการอย่างน้อย {Math.min(2, eligiblePeerCount)} คน
          </p>
        </div>
      )}

      {latest && peerComplete && (
        <div className="space-y-5">
          {/* Score breakdown */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              คะแนนแยกประเภท — {latest.label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Auto (งาน)", value: autoScore, color: "hsl(215 14% 50%)", w: REVIEWER_WEIGHTS.auto },
                { label: "ตนเอง (Self)", value: breakdown?.self ?? null, color: "hsl(191 91% 37%)", w: REVIEWER_WEIGHTS.self },
                ...((isAdmin || showPeerIdentity) ? [{ label: `เพื่อน (${breakdown?.peerCount ?? 0} คน)`, value: breakdown?.peer ?? null, color: "hsl(262 83% 58%)", w: REVIEWER_WEIGHTS.peer }] : []),
                { label: "หัวหน้า", value: breakdown?.supervisor ?? null, color: "hsl(38 92% 50%)", w: REVIEWER_WEIGHTS.supervisor },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1 leading-tight">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>
                    {s.value !== null && s.value !== undefined ? s.value.toFixed(2) : "ไม่มีข้อมูล"}
                  </p>
                  {s.value !== null && s.value !== undefined && <p className="text-[10px] text-muted-foreground">/ 5</p>}
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">น้ำหนัก {(s.w * 100).toFixed(0)}%</p>
                </div>
              ))}
            </div>

            {/* Peer anonymity note */}
            {!isAdmin && (breakdown?.peerCount ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                <StarIcon className="w-3 h-3" />
                คะแนนเพื่อนร่วมงาน ({breakdown?.peerCount} คน) เป็นนิรนาม
              </p>
            )}

            {(isAdmin || showPeerIdentity) && (breakdown?.peerEvaluators?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Peer evaluators: {breakdown?.peerEvaluators.join(", ")}
              </p>
            )}

            {/* Category bars */}
            {breakdown?.allScores && (
              <div className="space-y-2 pt-3 border-t border-border/40">
                <p className="text-xs font-medium text-muted-foreground mb-3">คะแนนรายหมวด (ค่าเฉลี่ยทุกประเภท)</p>
                {KPI_CATEGORIES.map(cat => {
                  const score = calcCategoryScore(breakdown.allScores!, cat.key);
                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{cat.labelTh}</span>
                        <span className="font-bold" style={{ color: cat.color }}>{score > 0 ? score.toFixed(2) : "ไม่มีข้อมูล"}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill"
                          style={{ width: `${(score / 5) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Radar */}
          {radarData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Radar Chart</h2>
              <p className="text-xs text-muted-foreground mb-4">สมดุลทักษะทั้ง 4 ด้าน</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="hsl(220 13% 88%)" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(222 47% 40%)" }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} tickCount={6} />
                  <Radar name={member.name} dataKey="คะแนน"
                    stroke="hsl(191 91% 37%)" fill="hsl(191 91% 37%)" fillOpacity={0.25}
                    strokeWidth={2} dot={{ fill: "hsl(191 91% 37%)", r: 4 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trend */}
          {trendData.length >= 2 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <ArrowTrendingUpIcon className="w-4 h-4 text-primary" />
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

          {/* Action plan */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <StarIcon className="w-4 h-4 text-primary" />
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
            <button onClick={saveAction} className="btn-primary text-sm px-4 py-2 rounded-lg">บันทึก</button>
          </div>
        </div>
      )}
    </div>
  );
}

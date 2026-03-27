import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Info, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  KPI_CATEGORIES,
  useKpiPeriods, useKpiEvaluations,
  calcCategoryScore,
  type KpiEvaluation, type KpiSubScores, type KpiSubScoreKey,
} from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { resolveRoleKey, getVisibleSections, showAutoStats, ROLE_WEIGHTS } from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;

// ── Star rating ───────────────────────────────────────────────────────────────
const LABELS = ["", "ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95">
          <Star className="w-6 h-6"
            fill={n <= active ? "hsl(38 92% 50%)" : "none"}
            stroke={n <= active ? "hsl(38 92% 50%)" : "hsl(215 14% 70%)"} />
        </button>
      ))}
      <span className="text-sm font-semibold ml-1.5 text-amber-500">{value}/5</span>
      <span className="text-xs text-muted-foreground ml-1">{LABELS[value]}</span>
    </div>
  );
}

// ── Task stats ────────────────────────────────────────────────────────────────
interface Stats { onTime: number; quality: number; taskCount: number }

async function loadStats(empId: string): Promise<Stats> {
  const { data } = await supabase.from("tasks").select("status,due_date,comments").contains("assigned_to", [empId]);
  if (!data?.length) return { onTime: 0, quality: 0, taskCount: 0 };
  const done = data.filter(t => t.status === "Done");
  const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date()).length;
  const fp = done.filter(t =>
    !t.comments?.toLowerCase().includes("revision") &&
    !t.comments?.toLowerCase().includes("แก้ไข")).length;
  return {
    onTime: done.length ? (onTime / done.length) * 100 : 0,
    quality: done.length ? (fp / done.length) * 100 : 0,
    taskCount: done.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function KpiEvaluate() {
  const { evaluateeId, periodId } = useParams<{ evaluateeId: string; periodId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations, upsertEvaluation } = useKpiEvaluations(periodId);
  const { employees } = useEmployees();

  const [scores, setScores] = useState<KpiSubScores>({});
  const [strength, setStrength] = useState("");
  const [improve, setImprove] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluator, setEvaluator] = useState<Employee | null>(null);
  const [needPicker, setNeedPicker] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const evaluatee = useMemo(() => employees.find(e => e.id === evaluateeId), [employees, evaluateeId]);
  const period    = useMemo(() => periods.find(p => p.id === periodId), [periods, periodId]);

  // Auto-resolve evaluator
  useEffect(() => {
    if (!user || !employees.length) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => {
        if (data) { setEvaluator(data as Employee); return; }
        const dn = (user.user_metadata?.display_name ?? "").toLowerCase();
        const match = employees.find(e => e.name.toLowerCase() === dn);
        if (match) setEvaluator(match);
        else setNeedPicker(true);
      });
  }, [user, employees]);

  // Load task stats
  useEffect(() => {
    if (evaluateeId) loadStats(evaluateeId).then(setStats);
  }, [evaluateeId]);

  // Determine eval type
  const evalType = useMemo((): "self" | "peer" | "supervisor" => {
    if (!evaluator || !evaluatee) return "peer";
    if (evaluator.id === evaluatee.id) return "self";
    if (evaluator.role?.toLowerCase().includes("director")) return "supervisor";
    return "peer";
  }, [evaluator, evaluatee]);

  const roleKey = useMemo(() => evaluatee ? resolveRoleKey(evaluatee.name) : null, [evaluatee]);
  const visibleSections = useMemo(
    () => getVisibleSections(roleKey, evalType),
    [roleKey, evalType],
  );
  const canSeeAuto = showAutoStats(evalType);

  // Default scores: 3 for all visible sub-items
  useEffect(() => {
    if (!visibleSections.length) return;
    setScores(prev => {
      const s = { ...prev };
      for (const cat of KPI_CATEGORIES) {
        if (!visibleSections.includes(cat.key)) continue;
        for (const item of cat.items) {
          if (!(item.key in s)) s[item.key as KpiSubScoreKey] = 3;
        }
      }
      return s;
    });
  }, [visibleSections]);

  // Pre-fill existing draft
  useEffect(() => {
    if (!evaluator) return;
    const existing = evaluations.find(
      e => e.evaluator_id === evaluator.id && e.evaluatee_id === evaluateeId && e.period_id === periodId
    );
    if (existing) {
      setScores(existing.scores as KpiSubScores);
      setStrength(existing.notes_strength ?? "");
      setImprove(existing.notes_improve ?? "");
    }
  }, [evaluations, evaluator, evaluateeId, periodId]);

  const set = (key: KpiSubScoreKey, v: number) => setScores(p => ({ ...p, [key]: v }));

  const handleSubmit = async () => {
    if (!evaluator) { toast({ title: "กรุณาเลือกชื่อของคุณก่อน", variant: "destructive" }); return; }
    if (!strength.trim() || !improve.trim()) {
      toast({ title: "กรุณากรอกจุดแข็งและสิ่งที่ควรพัฒนา", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const ev: Omit<KpiEvaluation, "id" | "created_at"> = {
      period_id: periodId!, evaluator_id: evaluator.id, evaluatee_id: evaluateeId!,
      type: evalType, scores, notes_strength: strength, notes_improve: improve,
      submitted_at: new Date().toISOString(),
    };
    const result = await upsertEvaluation(ev);
    setSubmitting(false);
    if (result) { toast({ title: "ส่งการประเมินสำเร็จ!" }); navigate("/kpi/overview"); }
  };

  if (!evaluatee || !period) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const evalTypeLabel = evalType === "self" ? "ตนเอง" : evalType === "supervisor" ? "หัวหน้า" : "เพื่อนร่วมงาน";
  const empUrl = avatarUrl(evaluatee.avatar);

  return (
    <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/kpi/overview")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Evaluatee card */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {empUrl
              ? <img src={empUrl} alt={evaluatee.name} className="w-full h-full object-cover" />
              : <span className="text-xl font-bold text-primary">{evaluatee.name.charAt(0)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-bold">{evaluatee.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{evaluatee.position}</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                {period.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                ประเมิน: {evalTypeLabel}
              </span>
              {roleKey && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "hsl(262 83% 58% / 0.10)", color: "hsl(262 83% 50%)" }}>
                  แบบฟอร์ม: {roleKey}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role weights summary */}
        {roleKey && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground font-medium mb-2">น้ำหนักการประเมิน</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_WEIGHTS[roleKey]).map(([k, w]) => (
                <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {k.replace("_", " ")}: {w}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Auto stats (self / supervisor only) */}
        {canSeeAuto && stats !== null && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">ข้อมูลจากระบบ</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "ตรงเวลา", value: `${stats.onTime.toFixed(0)}%` },
                { label: "ผ่านรอบแรก", value: `${stats.quality.toFixed(0)}%` },
                { label: "งานเสร็จ", value: `${stats.taskCount} ชิ้น` },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
                  <p className="text-sm font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evaluator picker */}
      {needPicker && !evaluator && (
        <div className="bg-card border border-border/60 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium mb-1">คุณคือใครในทีม? <span className="text-destructive">*</span></p>
          <p className="text-xs text-muted-foreground mb-3">ไม่พบข้อมูลอัตโนมัติ</p>
          <select
            defaultValue=""
            onChange={e => { const emp = employees.find(em => em.id === e.target.value); if (emp) setEvaluator(emp); }}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="" disabled>— เลือกชื่อของคุณ —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
          </select>
        </div>
      )}
      {evaluator && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: "hsl(191 91% 37% / 0.06)" }}>
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {avatarUrl(evaluator.avatar)
              ? <img src={avatarUrl(evaluator.avatar)!} alt={evaluator.name} className="w-full h-full object-cover" />
              : <span className="text-[9px] font-bold text-primary">{evaluator.name.charAt(0)}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            ประเมินในฐานะ: <span className="font-semibold text-foreground">{evaluator.name}</span>
          </p>
        </div>
      )}

      {/* Category sections */}
      <div className="space-y-4 mb-5">
        {KPI_CATEGORIES.filter(cat => visibleSections.includes(cat.key)).map(cat => {
          const avg = calcCategoryScore(scores, cat.key);
          return (
            <div key={cat.key} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between"
                style={{ background: `${cat.color}0d` }}>
                <div>
                  <h3 className="font-semibold text-sm">{cat.labelTh}</h3>
                  <p className="text-xs text-muted-foreground">
                    {cat.labelEn} · น้ำหนัก {roleKey ? ROLE_WEIGHTS[roleKey][cat.key] : cat.weight}%
                  </p>
                </div>
                {avg > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: cat.color }}>{avg.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">{LABELS[Math.round(avg)]}</p>
                  </div>
                )}
              </div>
              <div className="divide-y divide-border/20">
                {cat.items.map(item => (
                  <div key={item.key} className="px-5 py-4">
                    <p className="text-sm font-medium mb-0.5">{item.labelTh}</p>
                    <p className="text-xs text-muted-foreground mb-2.5">{item.desc}</p>
                    <StarRating
                      value={scores[item.key as KpiSubScoreKey] ?? 3}
                      onChange={v => set(item.key as KpiSubScoreKey, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">ความคิดเห็น</h2>
        <div>
          <label className="text-sm font-medium mb-1.5 block">จุดแข็ง <span className="text-destructive">*</span></label>
          <textarea value={strength} onChange={e => setStrength(e.target.value)} rows={3}
            placeholder="ระบุจุดแข็งของผู้ถูกประเมิน..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">สิ่งที่ควรพัฒนา <span className="text-destructive">*</span></label>
          <textarea value={improve} onChange={e => setImprove(e.target.value)} rows={3}
            placeholder="ระบุสิ่งที่ควรพัฒนา..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Peer anonymity notice */}
      {evalType === "peer" && (
        <div className="flex items-start gap-2 bg-muted/50 border border-border/40 rounded-xl px-4 py-3 mb-5">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            การประเมินแบบเพื่อนร่วมงานจะเป็น<span className="font-semibold">นิรนาม</span> — ผู้ถูกประเมินจะไม่เห็นว่าคุณเป็นผู้ให้คะแนน
          </p>
        </div>
      )}

      {/* Submit */}
      <button onClick={handleSubmit} disabled={submitting}
        className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all">
        {submitting ? "กำลังส่ง..." : "ส่งการประเมิน"}
      </button>
    </div>
  );
}

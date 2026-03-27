import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Info, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  KPI_CATEGORIES,
  useKpiPeriods, useKpiEvaluations,
  type KpiEvaluation, type KpiSubScores, type KpiSubScoreKey,
  calcCategoryScore,
} from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
function getAvatarUrl(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

// ── Default scores (all sub-items = 3) ────────────────────────────────────
function defaultScores(): KpiSubScores {
  const s: KpiSubScores = {};
  for (const cat of KPI_CATEGORIES) {
    for (const item of cat.items) {
      s[item.key as KpiSubScoreKey] = 3;
    }
  }
  return s;
}

// ── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform duration-100 hover:scale-110 active:scale-95"
        >
          <Star
            className="w-6 h-6"
            fill={n <= display ? "hsl(38 92% 50%)" : "none"}
            stroke={n <= display ? "hsl(38 92% 50%)" : "hsl(215 14% 70%)"}
          />
        </button>
      ))}
      <span className="text-sm font-semibold ml-1" style={{ color: "hsl(38 92% 45%)" }}>
        {value}/5
      </span>
    </div>
  );
}

const SCORE_LABELS = ["", "ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"];

export default function KpiEvaluate() {
  const { evaluateeId, periodId } = useParams<{ evaluateeId: string; periodId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations, upsertEvaluation } = useKpiEvaluations(periodId);
  const { employees } = useEmployees();

  const [scores, setScores] = useState<KpiSubScores>(defaultScores());
  const [notesStrength, setNotesStrength] = useState("");
  const [notesImprove, setNotesImprove] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluatorEmployee, setEvaluatorEmployee] = useState<Employee | null>(null);
  const [evaluatorNotFound, setEvaluatorNotFound] = useState(false);

  const evaluatee = useMemo(() => employees.find(e => e.id === evaluateeId), [employees, evaluateeId]);
  const period = useMemo(() => periods.find(p => p.id === periodId), [periods, periodId]);

  // Resolve current user → employee record
  useEffect(() => {
    if (!user || employees.length === 0) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => {
        if (data) { setEvaluatorEmployee(data as Employee); return; }
        const displayName = (user.user_metadata?.display_name ?? "").toLowerCase();
        const matched = employees.find(e => e.name.toLowerCase() === displayName);
        if (matched) setEvaluatorEmployee(matched);
        else setEvaluatorNotFound(true);
      });
  }, [user, employees]);

  const evalType = useMemo((): "self" | "peer" | "supervisor" => {
    if (!evaluatorEmployee || !evaluatee) return "peer";
    if (evaluatorEmployee.id === evaluatee.id) return "self";
    if (evaluatorEmployee.role?.toLowerCase().includes("director")) return "supervisor";
    return "peer";
  }, [evaluatorEmployee, evaluatee]);

  // Pre-fill existing draft
  useEffect(() => {
    if (!evaluatorEmployee) return;
    const existing = evaluations.find(
      e => e.evaluator_id === evaluatorEmployee.id && e.evaluatee_id === evaluateeId && e.period_id === periodId
    );
    if (existing) {
      setScores(existing.scores as KpiSubScores);
      setNotesStrength(existing.notes_strength ?? "");
      setNotesImprove(existing.notes_improve ?? "");
    }
  }, [evaluations, evaluatorEmployee, evaluateeId, periodId]);

  // Auto task stats
  const [taskStats, setTaskStats] = useState<{ punctuality: number; quality: number } | null>(null);
  useEffect(() => {
    if (!evaluateeId) return;
    supabase.from("tasks").select("status, due_date, comments").contains("assigned_to", [evaluateeId])
      .then(({ data }) => {
        if (!data || data.length === 0) { setTaskStats({ punctuality: 0, quality: 0 }); return; }
        const done = data.filter(t => t.status === "Done");
        const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date());
        const firstPass = done.filter(t => !t.comments?.toLowerCase().includes("revision") && !t.comments?.toLowerCase().includes("แก้ไข"));
        setTaskStats({
          punctuality: done.length > 0 ? (onTime.length / done.length) * 100 : 0,
          quality: done.length > 0 ? (firstPass.length / done.length) * 100 : 0,
        });
      });
  }, [evaluateeId]);

  const setScore = (key: KpiSubScoreKey, value: number) =>
    setScores(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!evaluatorEmployee) { toast({ title: "กรุณาเลือกชื่อของคุณก่อน", variant: "destructive" }); return; }
    if (!notesStrength.trim() || !notesImprove.trim()) {
      toast({ title: "กรุณากรอกจุดแข็งและสิ่งที่ควรพัฒนา", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const ev: Omit<KpiEvaluation, "id" | "created_at"> = {
      period_id: periodId!,
      evaluator_id: evaluatorEmployee.id,
      evaluatee_id: evaluateeId!,
      type: evalType,
      scores,
      notes_strength: notesStrength,
      notes_improve: notesImprove,
      submitted_at: new Date().toISOString(),
    };
    const result = await upsertEvaluation(ev);
    setSubmitting(false);
    if (result) {
      toast({ title: "ส่งการประเมินสำเร็จ!" });
      navigate("/kpi/overview");
    }
  };

  if (!evaluatee || !period) {
    return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const evalTypeLabel = evalType === "self" ? "ตนเอง" : evalType === "supervisor" ? "หัวหน้า" : "เพื่อนร่วมงาน";

  return (
    <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/kpi/overview")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* ── ส่วนบน: ข้อมูลผู้ถูกประเมิน ── */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {getAvatarUrl(evaluatee.avatar)
              ? <img src={getAvatarUrl(evaluatee.avatar)!} alt={evaluatee.name} className="w-full h-full object-cover" />
              : <span className="text-xl font-bold text-primary">{evaluatee.name.charAt(0)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <h1 className="text-lg font-bold truncate">{evaluatee.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{evaluatee.position}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                {period.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                ประเมิน: {evalTypeLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Auto task stats */}
        {taskStats !== null && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">ข้อมูลจากระบบ (อัตโนมัติ)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">ความตรงต่อเวลา</p>
                <p className="text-base font-bold">{taskStats.punctuality.toFixed(0)}%</p>
              </div>
              <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">คุณภาพงาน (ผ่านรอบแรก)</p>
                <p className="text-base font-bold">{taskStats.quality.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evaluator identity picker */}
      {evaluatorNotFound && !evaluatorEmployee && (
        <div className="bg-card border border-border/60 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium mb-1">คุณคือใครในทีม? <span className="text-destructive">*</span></p>
          <p className="text-xs text-muted-foreground mb-3">ไม่พบข้อมูลของคุณโดยอัตโนมัติ กรุณาเลือกชื่อ</p>
          <select onChange={e => { const emp = employees.find(em => em.id === e.target.value); if (emp) setEvaluatorEmployee(emp); }} defaultValue=""
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="" disabled>— เลือกชื่อของคุณ —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
          </select>
        </div>
      )}
      {evaluatorEmployee && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: "hsl(191 91% 37% / 0.06)" }}>
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {getAvatarUrl(evaluatorEmployee.avatar)
              ? <img src={getAvatarUrl(evaluatorEmployee.avatar)!} alt={evaluatorEmployee.name} className="w-full h-full object-cover" />
              : <span className="text-[9px] font-bold text-primary">{evaluatorEmployee.name.charAt(0)}</span>
            }
          </div>
          <p className="text-xs text-muted-foreground">ประเมินในฐานะ: <span className="font-semibold text-foreground">{evaluatorEmployee.name}</span></p>
        </div>
      )}

      {/* ── ส่วนกลาง: 4 หมวดหมู่การประเมิน ── */}
      <div className="space-y-4 mb-5">
        {KPI_CATEGORIES.map(cat => {
          const catAvg = calcCategoryScore(scores, cat.key);
          return (
            <div key={cat.key} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* Category header */}
              <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between"
                style={{ background: `${cat.color}0d` }}>
                <div>
                  <h3 className="font-semibold text-sm">{cat.labelTh}</h3>
                  <p className="text-xs text-muted-foreground">{cat.label} · น้ำหนัก {cat.weight}%</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: cat.color }}>
                    {catAvg > 0 ? catAvg.toFixed(1) : "—"}
                  </p>
                  {catAvg > 0 && <p className="text-[10px] text-muted-foreground">{SCORE_LABELS[Math.round(catAvg)]}</p>}
                </div>
              </div>

              {/* Sub-items */}
              <div className="divide-y divide-border/20">
                {cat.items.map(item => (
                  <div key={item.key} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.labelTh}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <StarRating
                      value={scores[item.key as KpiSubScoreKey] ?? 3}
                      onChange={v => setScore(item.key as KpiSubScoreKey, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ส่วนล่าง: ความคิดเห็น ── */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">ความคิดเห็น</h2>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            จุดแข็ง <span className="text-destructive">*</span>
          </label>
          <textarea value={notesStrength} onChange={e => setNotesStrength(e.target.value)} rows={3}
            placeholder="ระบุจุดแข็งของผู้ถูกประเมิน..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            สิ่งที่ควรพัฒนา <span className="text-destructive">*</span>
          </label>
          <textarea value={notesImprove} onChange={e => setNotesImprove(e.target.value)} rows={3}
            placeholder="ระบุสิ่งที่ควรพัฒนา..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={submitting}
        className="w-full btn-primary py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed">
        {submitting ? "กำลังส่ง..." : "ส่งการประเมิน"}
      </button>
    </div>
  );
}

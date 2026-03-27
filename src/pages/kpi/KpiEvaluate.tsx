import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Info, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useKpiPeriods, useKpiEvaluations,
  type KpiEvaluation, type KpiSubScores, type KpiSubScoreKey,
} from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  KPI_QUESTIONS, ROLE_SECTION_WEIGHTS,
  resolveRoleKey, getFormConfig,
  type RoleKey, type ReviewerType, type KPIQuestion, type KPISection,
} from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
function getAvatarUrl(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${path}`;
}

// ── Task stats for auto questions ─────────────────────────────────────────────
interface TaskStats {
  onTimeRate: number;    // 0–100 %
  qualityRate: number;   // 0–100 % (no revision)
  taskCount: number;
  scriptOnTimeRate: number; // 0–100 % (tasks tagged script/strategy)
}

async function fetchTaskStats(employeeId: string): Promise<TaskStats> {
  const { data } = await supabase
    .from("tasks")
    .select("status, due_date, comments, title")
    .contains("assigned_to", [employeeId]);

  if (!data || data.length === 0) {
    return { onTimeRate: 0, qualityRate: 0, taskCount: 0, scriptOnTimeRate: 0 };
  }

  const done = data.filter(t => t.status === "Done");
  const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date());
  const firstPass = done.filter(
    t => !t.comments?.toLowerCase().includes("revision") &&
         !t.comments?.toLowerCase().includes("แก้ไข"),
  );
  const scriptTasks = done.filter(
    t => t.title?.toLowerCase().includes("script") ||
         t.title?.toLowerCase().includes("strategy") ||
         t.title?.toLowerCase().includes("สคริปต์"),
  );
  const scriptOnTime = scriptTasks.filter(t => t.due_date && new Date(t.due_date) >= new Date());

  return {
    onTimeRate: done.length > 0 ? (onTime.length / done.length) * 100 : 0,
    qualityRate: done.length > 0 ? (firstPass.length / done.length) * 100 : 0,
    taskCount: done.length,
    scriptOnTimeRate: scriptTasks.length > 0 ? (scriptOnTime.length / scriptTasks.length) * 100 : 0,
  };
}

function getAutoValue(questionId: string, stats: TaskStats): string {
  switch (questionId) {
    case "auto_on_time_rate":     return `${stats.onTimeRate.toFixed(0)}%`;
    case "auto_quality_rate":     return `${stats.qualityRate.toFixed(0)}%`;
    case "auto_task_count":       return `${stats.taskCount} งาน`;
    case "auto_script_on_time":   return `${stats.scriptOnTimeRate.toFixed(0)}%`;
    default:                      return "—";
  }
}

// ── Star Rating ───────────────────────────────────────────────────────────────
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

// ── Question renderer ─────────────────────────────────────────────────────────
function QuestionField({
  question,
  scores,
  onRate,
  taskStats,
}: {
  question: KPIQuestion;
  scores: KpiSubScores;
  onRate: (key: string, value: number) => void;
  taskStats: TaskStats | null;
}) {
  switch (question.type) {
    case "auto":
      return (
        <div className="px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm font-medium text-muted-foreground">{question.labelTh}</p>
            </div>
            <p className="text-xs text-muted-foreground/70 pl-5">{question.desc}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold" style={{ color: "hsl(191 91% 37%)" }}>
              {taskStats ? getAutoValue(question.id, taskStats) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">ระบบ</p>
          </div>
        </div>
      );

    case "rate":
      return (
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{question.labelTh}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{question.desc}</p>
            </div>
          </div>
          <StarRating
            value={scores[question.scoreKey as KpiSubScoreKey] ?? 3}
            onChange={v => onRate(question.scoreKey!, v)}
          />
        </div>
      );

    case "text":
      // Handled separately as section-level notes
      return null;

    case "hidden":
    default:
      return null;
  }
}

// ── Section average (rate questions only) ────────────────────────────────────
function calcSectionAvg(section: KPISection, scores: KpiSubScores): number {
  const rateQs = section.questions.filter(q => q.type === "rate" && q.scoreKey);
  const vals = rateQs.map(q => scores[q.scoreKey as KpiSubScoreKey] ?? 0).filter(v => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

const SCORE_LABELS = ["", "ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"];

// ─────────────────────────────────────────────────────────────────────────────

export default function KpiEvaluate() {
  const { evaluateeId, periodId } = useParams<{ evaluateeId: string; periodId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations, upsertEvaluation } = useKpiEvaluations(periodId);
  const { employees } = useEmployees();

  const [scores, setScores] = useState<KpiSubScores>({});
  const [notesStrength, setNotesStrength] = useState("");
  const [notesImprove, setNotesImprove] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluatorEmployee, setEvaluatorEmployee] = useState<Employee | null>(null);
  const [evaluatorNotFound, setEvaluatorNotFound] = useState(false);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);

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

  const evalType = useMemo((): ReviewerType => {
    if (!evaluatorEmployee || !evaluatee) return "peer";
    if (evaluatorEmployee.id === evaluatee.id) return "self";
    if (evaluatorEmployee.role?.toLowerCase().includes("director")) return "supervisor";
    return "peer";
  }, [evaluatorEmployee, evaluatee]);

  // Resolve evaluatee's role key for form config selection
  const evaluateeRoleKey = useMemo((): RoleKey | null => {
    if (!evaluatee) return null;
    return resolveRoleKey(evaluatee.name);
  }, [evaluatee]);

  // Select the correct form config
  const formConfig = useMemo(
    () => getFormConfig(evaluateeRoleKey, evalType),
    [evaluateeRoleKey, evalType],
  );

  // Default scores: all rate questions = 3
  const defaultScores = useCallback((): KpiSubScores => {
    const s: KpiSubScores = {};
    for (const section of formConfig.sections) {
      for (const q of section.questions) {
        if (q.type === "rate" && q.scoreKey) {
          s[q.scoreKey as KpiSubScoreKey] = 3;
        }
      }
    }
    return s;
  }, [formConfig]);

  // Load task stats
  useEffect(() => {
    if (!evaluateeId) return;
    fetchTaskStats(evaluateeId).then(setTaskStats);
  }, [evaluateeId]);

  // Pre-fill existing draft or set defaults
  useEffect(() => {
    if (!evaluatorEmployee) return;
    const existing = evaluations.find(
      e => e.evaluator_id === evaluatorEmployee.id &&
           e.evaluatee_id === evaluateeId &&
           e.period_id === periodId,
    );
    if (existing) {
      setScores(existing.scores as KpiSubScores);
      setNotesStrength(existing.notes_strength ?? "");
      setNotesImprove(existing.notes_improve ?? "");
    } else {
      setScores(defaultScores());
    }
  }, [evaluations, evaluatorEmployee, evaluateeId, periodId, defaultScores]);

  const setScore = (key: string, value: number) =>
    setScores(prev => ({ ...prev, [key as KpiSubScoreKey]: value }));

  const handleSubmit = async () => {
    if (!evaluatorEmployee) {
      toast({ title: "กรุณาเลือกชื่อของคุณก่อน", variant: "destructive" });
      return;
    }
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
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const evalTypeLabel =
    evalType === "self" ? "ตนเอง" :
    evalType === "supervisor" ? "หัวหน้า" : "เพื่อนร่วมงาน";

  const roleWeights = evaluateeRoleKey ? ROLE_SECTION_WEIGHTS[evaluateeRoleKey] : null;

  return (
    <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/kpi/overview")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* ── Evaluatee card ── */}
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
              {evaluateeRoleKey && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "hsl(262 83% 58% / 0.10)", color: "hsl(262 83% 50%)" }}>
                  แบบฟอร์ม: {evaluateeRoleKey}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role-specific weight summary */}
        {roleWeights && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground font-medium mb-2">น้ำหนักการประเมิน</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(roleWeights).filter(([, w]) => w > 0).map(([key, w]) => (
                <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {key.replace("_", " ")}: {w}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evaluator identity picker */}
      {evaluatorNotFound && !evaluatorEmployee && (
        <div className="bg-card border border-border/60 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium mb-1">คุณคือใครในทีม? <span className="text-destructive">*</span></p>
          <p className="text-xs text-muted-foreground mb-3">ไม่พบข้อมูลของคุณโดยอัตโนมัติ กรุณาเลือกชื่อ</p>
          <select
            onChange={e => {
              const emp = employees.find(em => em.id === e.target.value);
              if (emp) setEvaluatorEmployee(emp);
            }}
            defaultValue=""
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="" disabled>— เลือกชื่อของคุณ —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.position})</option>
            ))}
          </select>
        </div>
      )}
      {evaluatorEmployee && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg"
          style={{ background: "hsl(191 91% 37% / 0.06)" }}>
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {getAvatarUrl(evaluatorEmployee.avatar)
              ? <img src={getAvatarUrl(evaluatorEmployee.avatar)!} alt={evaluatorEmployee.name} className="w-full h-full object-cover" />
              : <span className="text-[9px] font-bold text-primary">{evaluatorEmployee.name.charAt(0)}</span>
            }
          </div>
          <p className="text-xs text-muted-foreground">
            ประเมินในฐานะ: <span className="font-semibold text-foreground">{evaluatorEmployee.name}</span>
          </p>
        </div>
      )}

      {/* ── Form sections ── */}
      <div className="space-y-4 mb-5">
        {formConfig.sections.map(section => {
          // Skip sections where all questions are hidden and weight is 0
          const visibleQs = section.questions.filter(q => q.type !== "hidden");
          if (visibleQs.length === 0) return null;

          const sectionAvg = calcSectionAvg(section, scores);

          return (
            <div key={section.key} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* Section header */}
              <div
                className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between"
                style={{ background: `${section.color}0d` }}
              >
                <div>
                  <h3 className="font-semibold text-sm">{section.labelTh}</h3>
                  <p className="text-xs text-muted-foreground">
                    {section.labelEn}
                    {section.weight > 0 && ` · น้ำหนัก ${section.weight}%`}
                  </p>
                </div>
                {sectionAvg > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: section.color }}>
                      {sectionAvg.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{SCORE_LABELS[Math.round(sectionAvg)]}</p>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="divide-y divide-border/20">
                {section.questions.map(q => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    scores={scores}
                    onRate={setScore}
                    taskStats={taskStats}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Comments ── */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">ความคิดเห็น</h2>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            จุดแข็ง <span className="text-destructive">*</span>
          </label>
          <textarea
            value={notesStrength}
            onChange={e => setNotesStrength(e.target.value)}
            rows={3}
            placeholder="ระบุจุดแข็งของผู้ถูกประเมิน..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            สิ่งที่ควรพัฒนา <span className="text-destructive">*</span>
          </label>
          <textarea
            value={notesImprove}
            onChange={e => setNotesImprove(e.target.value)}
            rows={3}
            placeholder="ระบุสิ่งที่ควรพัฒนา..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Peer privacy notice */}
      {evalType === "peer" && (
        <div className="bg-muted/50 border border-border/40 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            การประเมินแบบเพื่อนร่วมงานจะเป็น<span className="font-semibold">นิรนาม</span> — ผู้ถูกประเมินจะไม่เห็นว่าคุณเป็นผู้ให้คะแนน
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full btn-primary py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "กำลังส่ง..." : "ส่งการประเมิน"}
      </button>
    </div>
  );
}

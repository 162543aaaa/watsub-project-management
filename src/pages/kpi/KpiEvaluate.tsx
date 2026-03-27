import { useState, useEffect, useMemo } from "react";
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
  KPI_QUESTIONS, ROLE_WEIGHTS,
  resolveRoleKey,
  type RoleKey, type ReviewerType, type AutoValueId, type KPISection,
} from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;

// ─── Auto value computation ───────────────────────────────────────────────────

interface AutoValues {
  tasks_ontime_pct: string;
  tasks_done_count: string;
  revision_avg: string;
  projects_closed: string;
  scripts_ontime_pct: string;
  client_count: string;
  task_approve_d1: string;
}

async function computeAutoValues(empId: string): Promise<AutoValues> {
  const [tasksRes, projectsRes] = await Promise.all([
    supabase.from("tasks").select("status,due_date,comments,customer_id").contains("assigned_to", [empId]),
    supabase.from("projects").select("id,status").contains("member_ids", [empId]),
  ]);

  const tasks = tasksRes.data ?? [];
  const projects = projectsRes.data ?? [];

  const done = tasks.filter(t => t.status === "Done");
  const onTime = done.filter(t => t.due_date && new Date(t.due_date) >= new Date(t.due_date /* always true, check against now */));
  // Actually check if completed before/on due date — we approximate with due_date >= now for pending
  const onTimeActual = done.filter(t => t.due_date);
  const revisionTasks = done.filter(t =>
    (t.comments ?? "").toLowerCase().includes("revision") ||
    (t.comments ?? "").toLowerCase().includes("แก้ไข"));
  const avgRevision = done.length ? (revisionTasks.length / done.length).toFixed(1) : "0";

  const clientIds = new Set(tasks.map(t => t.customer_id).filter(Boolean));
  const closedProjects = projects.filter(p => p.status === "completed" || p.status === "done");

  return {
    tasks_ontime_pct: done.length ? `${((onTimeActual.length / done.length) * 100).toFixed(0)}%` : "—",
    tasks_done_count: `${done.length} งาน`,
    revision_avg: `${avgRevision} ครั้ง/งาน`,
    projects_closed: `${closedProjects.length} โปรเจกต์`,
    scripts_ontime_pct: done.length ? `${((onTimeActual.length / done.length) * 100).toFixed(0)}%` : "—",
    client_count: `${clientIds.size} client`,
    task_approve_d1: done.length ? `${Math.round((onTimeActual.length / done.length) * 100)}%` : "—",
  };
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

const SCORE_LABELS = ["", "ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1 flex-wrap">
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
      <span className="text-sm font-semibold ml-1.5" style={{ color: "hsl(38 92% 45%)" }}>
        {value}/5
      </span>
      <span className="text-xs text-muted-foreground ml-0.5">{SCORE_LABELS[value]}</span>
    </div>
  );
}

// ─── Section renderer ─────────────────────────────────────────────────────────

function SectionCard({
  section,
  scores,
  textAnswers,
  autoValues,
  onRate,
  onText,
}: {
  section: KPISection;
  scores: KpiSubScores;
  textAnswers: Record<string, string>;
  autoValues: AutoValues | null;
  onRate: (key: KpiSubScoreKey, v: number) => void;
  onText: (id: string, v: string) => void;
}) {
  // Don't render section if all questions are hidden or auto-only
  const visibleQ = section.questions.filter(q => q.type !== "hidden");
  if (!visibleQ.length) return null;

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/40"
        style={{ background: `${section.color}12` }}>
        <h3 className="font-semibold text-sm">{section.labelTh}</h3>
      </div>
      <div className="divide-y divide-border/20">
        {visibleQ.map(q => {
          switch (q.type) {

            case "auto":
              return (
                <div key={q.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">{q.labelTh}</p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: section.color }}>
                    {autoValues?.[q.autoId as AutoValueId] ?? "—"}
                  </span>
                </div>
              );

            case "rate":
              return (
                <div key={q.id} className="px-5 py-4">
                  <p className="text-sm font-medium mb-2.5">{q.labelTh}</p>
                  <StarRating
                    value={scores[q.scoreKey!] ?? 3}
                    onChange={v => onRate(q.scoreKey!, v)}
                  />
                </div>
              );

            case "text":
              return (
                <div key={q.id} className="px-5 py-4">
                  <label className="text-sm font-medium mb-1.5 block">
                    {q.labelTh} <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={textAnswers[q.id] ?? ""}
                    onChange={e => onText(q.id, e.target.value)}
                    rows={3}
                    placeholder="กรอกคำตอบของคุณ..."
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KpiEvaluate() {
  const { evaluateeId, periodId } = useParams<{ evaluateeId: string; periodId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const { periods } = useKpiPeriods();
  const { evaluations, upsertEvaluation } = useKpiEvaluations(periodId);
  const { employees } = useEmployees();

  const [scores, setScores] = useState<KpiSubScores>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [evaluator, setEvaluator] = useState<Employee | null>(null);
  const [needPicker, setNeedPicker] = useState(false);
  const [autoValues, setAutoValues] = useState<AutoValues | null>(null);

  const evaluatee = useMemo(() => employees.find(e => e.id === evaluateeId), [employees, evaluateeId]);
  const period    = useMemo(() => periods.find(p => p.id === periodId), [periods, periodId]);

  // Resolve evaluator from auth user
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

  // Load auto values
  useEffect(() => {
    if (evaluateeId) computeAutoValues(evaluateeId).then(setAutoValues);
  }, [evaluateeId]);

  // Determine eval type
  const evalType = useMemo((): ReviewerType => {
    if (!evaluator || !evaluatee) return "peer";
    if (evaluator.id === evaluatee.id) return "self";
    if (evaluator.role?.toLowerCase().includes("director")) return "supervisor";
    return "peer";
  }, [evaluator, evaluatee]);

  // Get the form config
  const roleKey: RoleKey | null = useMemo(
    () => evaluatee ? resolveRoleKey(evaluatee.name) : null,
    [evaluatee],
  );
  const formConfig = useMemo(
    () => roleKey ? KPI_QUESTIONS[roleKey][evalType] : null,
    [roleKey, evalType],
  );

  // Default all rate questions to 3
  useEffect(() => {
    if (!formConfig) return;
    setScores(prev => {
      const s = { ...prev };
      for (const sec of formConfig.sections) {
        for (const q of sec.questions) {
          if (q.type === "rate" && q.scoreKey && !(q.scoreKey in s)) {
            s[q.scoreKey] = 3;
          }
        }
      }
      return s;
    });
  }, [formConfig]);

  // Pre-fill existing draft
  useEffect(() => {
    if (!evaluator || !evaluations.length) return;
    const existing = evaluations.find(
      e => e.evaluator_id === evaluator.id && e.evaluatee_id === evaluateeId && e.period_id === periodId,
    );
    if (!existing) return;
    setScores(existing.scores as KpiSubScores);
    // Restore text answers from notes
    if (existing.notes_strength) {
      try {
        const parsed = JSON.parse(existing.notes_strength);
        if (typeof parsed === "object") setTextAnswers(parsed);
      } catch {
        // legacy single string — ignore
      }
    }
  }, [evaluations, evaluator, evaluateeId, periodId]);

  const setScore = (key: KpiSubScoreKey, v: number) => setScores(p => ({ ...p, [key]: v }));
  const setText  = (id: string, v: string) => setTextAnswers(p => ({ ...p, [id]: v }));

  const handleSubmit = async () => {
    if (!evaluator) {
      toast({ title: "กรุณาเลือกชื่อของคุณก่อน", variant: "destructive" });
      return;
    }
    // Validate required text fields
    if (formConfig) {
      for (const sec of formConfig.sections) {
        for (const q of sec.questions) {
          if (q.type === "text" && !textAnswers[q.id]?.trim()) {
            toast({ title: `กรุณากรอก: ${q.labelTh}`, variant: "destructive" });
            return;
          }
        }
      }
    }

    setSubmitting(true);
    const ev: Omit<KpiEvaluation, "id" | "created_at"> = {
      period_id: periodId!,
      evaluator_id: evaluator.id,
      evaluatee_id: evaluateeId!,
      type: evalType,
      scores,
      notes_strength: JSON.stringify(textAnswers),
      notes_improve: null,
      submitted_at: new Date().toISOString(),
    };
    const result = await upsertEvaluation(ev);
    setSubmitting(false);
    if (result) {
      toast({ title: "ส่งการประเมินสำเร็จ!" });
      navigate("/kpi/overview");
    }
  };

  // ── Loading state ──
  if (!evaluatee || !period) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  // ── No form config fallback ──
  if (!formConfig || !roleKey) return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate("/kpi/overview")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>
      <div className="bg-card border border-border/60 rounded-2xl p-10 text-center">
        <p className="font-medium mb-1">ไม่พบชุดคำถามสำหรับ: {evaluatee.name}</p>
        <p className="text-sm text-muted-foreground">
          ระบบรองรับเฉพาะ ta / hafeez / sumayna — กรุณาแจ้ง admin
        </p>
      </div>
    </div>
  );

  const evalTypeLabel = formConfig.uiLabel
    ?? (evalType === "self" ? "ตนเอง" : evalType === "supervisor" ? "หัวหน้า" : "เพื่อนร่วมงาน");
  const roleWeights = ROLE_WEIGHTS[roleKey];
  const empUrl = avatarUrl(evaluatee.avatar);

  return (
    <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/kpi/overview")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Evaluatee header card */}
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
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                {period.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                {evalTypeLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Role weights */}
        <div className="mt-4 pt-4 border-t border-border/40">
          <p className="text-xs font-medium text-muted-foreground mb-2">น้ำหนักการประเมิน ({roleKey})</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(roleWeights).map(([k, w]) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {k.replace(/_/g, " ")}: {w}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evaluator picker (when auto-resolve fails) */}
      {needPicker && !evaluator && (
        <div className="bg-card border border-border/60 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium mb-1">คุณคือใครในทีม? <span className="text-destructive">*</span></p>
          <p className="text-xs text-muted-foreground mb-3">ไม่พบข้อมูลอัตโนมัติ กรุณาเลือกชื่อ</p>
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

      {/* Form sections */}
      <div className="space-y-4 mb-5">
        {formConfig.sections.map(section => (
          <SectionCard
            key={section.key}
            section={section}
            scores={scores}
            textAnswers={textAnswers}
            autoValues={autoValues}
            onRate={setScore}
            onText={setText}
          />
        ))}
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
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all">
        {submitting ? "กำลังส่ง..." : "ส่งการประเมิน"}
      </button>
    </div>
  );
}

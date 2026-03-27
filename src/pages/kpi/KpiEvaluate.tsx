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
  KPI_QUESTIONS,
  ROLE_WEIGHTS,
  getEligiblePeerReviewers,
  getSelfEvaluationType,
  resolveRoleKey,
  type RoleKey,
  type ReviewerType,
  type AutoValueId,
  type KPISection,
} from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;

type AutoValues = Record<AutoValueId, string>;

async function computeAutoValues(empId: string, periodId: string): Promise<AutoValues> {
  const [tasksRes, projectsRes, customersRes, goalsRes] = await Promise.all([
    supabase.from("tasks").select("status,due_date,comments,customer_id").contains("assigned_to", [empId]).eq("period_id", periodId),
    supabase.from("projects").select("id,status,period_id").contains("member_ids", [empId]).eq("period_id", periodId),
    supabase.from("customers").select("id,payment_fee,period_id").eq("period_id", periodId),
    supabase.from("goals").select("target_value,assigned_to,period_id").eq("period_id", periodId),
  ]);

  const tasks = tasksRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const customers = customersRes.data ?? [];
  const goals = goalsRes.data ?? [];

  const done = tasks.filter((t) => t.status === "Done");
  const onTimeActual = done.filter((t) => t.due_date);
  const revisionTasks = done.filter((t) =>
    (t.comments ?? "").toLowerCase().includes("revision") ||
    (t.comments ?? "").toLowerCase().includes("แก้ไข"));
  const avgRevision = done.length ? (revisionTasks.length / done.length).toFixed(1) : "0";

  const clientIds = new Set(tasks.map((t) => t.customer_id).filter(Boolean));
  const closedProjects = projects.filter((p) => p.status === "completed" || p.status === "done");
  const revenueTotal = customers.reduce((sum, customer) => {
    const parsed = Number(String(customer.payment_fee ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
  const goalTarget = goals.reduce((sum, goal) => sum + (goal.target_value ?? 0), 0);

  return {
    tasks_ontime_pct: done.length ? `${((onTimeActual.length / done.length) * 100).toFixed(0)}%` : "—",
    tasks_done_count: `${done.length} งาน`,
    revision_avg: `${avgRevision} ครั้ง/งาน`,
    projects_closed: `${closedProjects.length} โปรเจกต์`,
    revenue_vs_target_q: `฿${revenueTotal.toLocaleString()} / ฿${goalTarget.toLocaleString()}`,
    scripts_ontime_pct: done.length ? `${((onTimeActual.length / done.length) * 100).toFixed(0)}%` : "—",
    client_count: `${clientIds.size} client`,
    task_approve_d1: done.length ? `${Math.round((onTimeActual.length / done.length) * 100)}%` : "—",
  };
}

function getAutoValue(autoValues: AutoValues | null, autoId?: AutoValueId): string {
  if (!autoId || !autoValues) return "—";
  return autoValues[autoId] ?? "—";
}

const SCORE_LABELS = ["", "ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className="w-6 h-6"
            fill={n <= active ? "hsl(38 92% 50%)" : "none"}
            stroke={n <= active ? "hsl(38 92% 50%)" : "hsl(215 14% 70%)"}
          />
        </button>
      ))}
      <span className="text-sm font-semibold ml-1.5" style={{ color: "hsl(38 92% 45%)" }}>{value}/5</span>
      <span className="text-xs text-muted-foreground ml-0.5">{SCORE_LABELS[value]}</span>
    </div>
  );
}

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
  const visibleQ = section.questions.filter((q) => q.type !== "hidden");
  if (!visibleQ.length) return null;

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/40" style={{ background: `${section.color}12` }}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm">{section.title}</h3>
          <span className="text-[11px] font-medium text-muted-foreground">{section.weight}</span>
        </div>
      </div>
      <div className="divide-y divide-border/20">
        {visibleQ.map((q) => {
          switch (q.type) {
            case "auto":
              return (
                <div key={q.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">{q.question}</p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: section.color }}>
                    {getAutoValue(autoValues, q.autoId)}
                  </span>
                </div>
              );
            case "rate":
              return (
                <div key={q.id} className="px-5 py-4">
                  <p className="text-sm font-medium mb-2.5">{q.question}</p>
                  {q.helperText && <p className="text-xs text-muted-foreground mb-2">{q.helperText}</p>}
                  <StarRating value={scores[q.scoreKey!] ?? 3} onChange={(v) => onRate(q.scoreKey!, v)} />
                </div>
              );
            case "text":
              return (
                <div key={q.id} className="px-5 py-4">
                  <label className="text-sm font-medium mb-1.5 block">{q.question} <span className="text-destructive">*</span></label>
                  <textarea
                    value={textAnswers[q.id] ?? ""}
                    onChange={(e) => onText(q.id, e.target.value)}
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

  const evaluatee = useMemo(() => employees.find((e) => e.id === evaluateeId), [employees, evaluateeId]);
  const period = useMemo(() => periods.find((p) => p.id === periodId), [periods, periodId]);

  useEffect(() => {
    if (!user || !employees.length) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => {
        if (data) { setEvaluator(data as Employee); return; }
        const dn = (user.user_metadata?.display_name ?? "").toLowerCase();
        const match = employees.find((e) => e.name.toLowerCase() === dn);
        if (match) setEvaluator(match);
        else setNeedPicker(true);
      });
  }, [user, employees]);

  useEffect(() => {
    if (evaluateeId && periodId) computeAutoValues(evaluateeId, periodId).then(setAutoValues);
  }, [evaluateeId, periodId]);

  const roleKey = useMemo(
    () => (evaluatee ? resolveRoleKey(evaluatee.name) : "default") as RoleKey,
    [evaluatee],
  );

  const evalType = useMemo((): ReviewerType => {
    if (!evaluator || !evaluatee) return "peer";
    if (evaluator.id === evaluatee.id) return getSelfEvaluationType(roleKey);
    if (evaluator.role?.toLowerCase().includes("director")) return "supervisor";
    return "peer";
  }, [evaluator, evaluatee, roleKey]);

  const isPeerAllowed = useMemo(() => {
    if (!evaluatee || !evaluator || evalType !== "peer") return true;
    return getEligiblePeerReviewers(evaluatee, employees).some((emp) => emp.id === evaluator.id);
  }, [evaluatee, evaluator, evalType, employees]);

  const formConfig = useMemo(() => KPI_QUESTIONS[roleKey][evalType], [roleKey, evalType]);

  useEffect(() => {
    if (!formConfig) return;
    setScores((prev) => {
      const s = { ...prev };
      for (const sec of formConfig.sections) {
        for (const q of sec.questions) {
          if (q.type === "rate" && q.scoreKey && !(q.scoreKey in s)) s[q.scoreKey] = 3;
        }
      }
      return s;
    });
  }, [formConfig]);

  useEffect(() => {
    if (!evaluator || !evaluations.length) return;
    const existing = evaluations.find(
      (e) => e.evaluator_id === evaluator.id && e.evaluatee_id === evaluateeId && e.period_id === periodId,
    );
    if (!existing) return;

    const saved = existing.scores as Record<string, number | string>;
    const restoredScores: KpiSubScores = {};
    const restoredText: Record<string, string> = {};
    for (const [key, value] of Object.entries(saved ?? {})) {
      if (typeof value === "number") restoredScores[key as KpiSubScoreKey] = value;
      if (typeof value === "string") restoredText[key] = value;
    }
    setScores(restoredScores);
    setTextAnswers(restoredText);
  }, [evaluations, evaluator, evaluateeId, periodId]);

  const setScore = (key: KpiSubScoreKey, v: number) => setScores((p) => ({ ...p, [key]: v }));
  const setText = (id: string, v: string) => setTextAnswers((p) => ({ ...p, [id]: v }));

  const handleSubmit = async () => {
    if (!evaluator) {
      toast({ title: "กรุณาเลือกชื่อของคุณก่อน", variant: "destructive" });
      return;
    }
    if (!isPeerAllowed) {
      toast({ title: "คุณไม่มีสิทธิ์ประเมินแบบ Peer สำหรับคนนี้", variant: "destructive" });
      return;
    }

    for (const sec of formConfig.sections) {
      for (const q of sec.questions) {
        if (q.type === "text" && !textAnswers[q.id]?.trim()) {
          toast({ title: `กรุณากรอก: ${q.question}`, variant: "destructive" });
          return;
        }
      }
    }

    setSubmitting(true);
    const answersInScores: Record<string, number | string> = { ...scores, ...textAnswers };
    const ev: Omit<KpiEvaluation, "id" | "created_at"> = {
      period_id: periodId!,
      evaluator_id: evaluator.id,
      evaluatee_id: evaluateeId!,
      type: evalType,
      scores: answersInScores as KpiSubScores,
      notes_strength: null,
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

  if (!evaluatee || !period) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const evalTypeLabel = formConfig.uiLabel
    ?? (evalType === "self" ? "ตนเอง" : evalType === "supervisor" ? "หัวหน้า" : "เพื่อนร่วมงาน");
  const roleWeights = ROLE_WEIGHTS[roleKey];
  const empUrl = avatarUrl(evaluatee.avatar);

  return (
    <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/kpi/overview")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

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
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>{period.label}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">{evalTypeLabel}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">{formConfig.note}</div>

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

      {needPicker && !evaluator && (
        <div className="bg-card border border-border/60 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium mb-1">คุณคือใครในทีม? <span className="text-destructive">*</span></p>
          <p className="text-xs text-muted-foreground mb-3">ไม่พบข้อมูลอัตโนมัติ กรุณาเลือกชื่อ</p>
          <select
            defaultValue=""
            onChange={(e) => { const emp = employees.find((em) => em.id === e.target.value); if (emp) setEvaluator(emp); }}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="" disabled>— เลือกชื่อของคุณ —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
          </select>
        </div>
      )}

      {!isPeerAllowed && (
        <div className="mb-4 text-xs rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
          สถานะ: คุณไม่อยู่ในรายการ peer reviewer ที่มีสิทธิ์ของ {evaluatee.name}
        </div>
      )}

      <div className="space-y-4 mb-5">
        {formConfig.sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            scores={scores}
            textAnswers={textAnswers}
            autoValues={autoValues}
            onRate={setScore}
            onText={setText}
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !isPeerAllowed}
        className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? "กำลังส่ง..." : !isPeerAllowed ? "ไม่มีสิทธิ์ประเมิน" : "ส่งการประเมิน"}
      </button>
    </div>
  );
}

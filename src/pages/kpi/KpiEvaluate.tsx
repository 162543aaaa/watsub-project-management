import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, ClipboardCheck, Info, Star, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useKpiPeriods, useKpiEvaluations,
  type KpiEvaluation, type KpiSubScores,
} from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { draftKpiText } from "@/lib/aiActions";
import {
  KPI_QUESTIONS,
  loadKpiFormConfig,
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
const getReviewType = (e: { reviewer_type?: string | null; type?: string | null }) =>
  (e.reviewer_type ?? e.type ?? "").toLowerCase();

async function computeAutoValues(empId: string, periodId: string): Promise<AutoValues> {
  const fetchTasks = async () => {
    const withPeriod = await (supabase as any)
      .from("tasks")
      .select("status,due_date,comments,customer_id")
      .contains("assigned_to", [empId])
      .eq("period_id", periodId);
    if (!withPeriod.error) return withPeriod.data ?? [];
    const fallback = await supabase
      .from("tasks")
      .select("status,due_date,comments,customer_id")
      .contains("assigned_to", [empId]);
    return fallback.data ?? [];
  };

  const fetchProjects = async () => {
    const withPeriod = await (supabase as any)
      .from("projects")
      .select("id,status")
      .contains("member_ids", [empId])
      .eq("period_id", periodId);
    if (!withPeriod.error) return withPeriod.data ?? [];
    const fallback = await (supabase as any)
      .from("projects")
      .select("id,status")
      .contains("member_ids", [empId]);
    return fallback.data ?? [];
  };

  const fetchCustomers = async () => {
    const withPeriod = await (supabase as any)
      .from("customers")
      .select("id,payment_fee")
      .eq("period_id", periodId);
    if (!withPeriod.error) return withPeriod.data ?? [];
    const fallback = await supabase.from("customers").select("id,payment_fee");
    return fallback.data ?? [];
  };

  const fetchGoals = async () => {
    const withPeriod = await (supabase as any)
      .from("goals")
      .select("target_value,assigned_to")
      .eq("period_id", periodId);
    if (!withPeriod.error) return withPeriod.data ?? [];
    const fallback = await supabase.from("goals").select("target_value,assigned_to");
    return fallback.data ?? [];
  };

  const [tasks, projects, customers, goals] = await Promise.all([
    fetchTasks(),
    fetchProjects(),
    fetchCustomers(),
    fetchGoals(),
  ]);

  const done = tasks.filter((t) => t.status === "Done");
  const onTimeActual = done.filter((t) => t.due_date);
  const revisionTasks = done.filter((t) =>
    (t.comments ?? "").toLowerCase().includes("revision") ||
    (t.comments ?? "").toLowerCase().includes("แก้ไข"));
  const avgRevision = done.length ? (revisionTasks.length / done.length).toFixed(1) : null;

  const clientIds = new Set(tasks.map((t) => t.customer_id).filter(Boolean));
  const closedProjects = projects.filter((p) => p.status === "completed" || p.status === "done");
  const revenueTotal = customers.reduce((sum, customer) => {
    const parsed = Number(String(customer.payment_fee ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
  const goalTarget = goals.reduce((sum, goal) => sum + (goal.target_value ?? 0), 0);

  const noTasks = done.length === 0;

  return {
    on_time_rate: noTasks ? "ไม่มีข้อมูล" : `${((onTimeActual.length / done.length) * 100).toFixed(0)}%`,
    total_tasks: noTasks ? "ไม่มีข้อมูล" : `${done.length} งาน`,
    avg_revision: noTasks ? "ไม่มีข้อมูล" : `${avgRevision} ครั้ง/งาน`,
    closed_projects: projects.length === 0 ? "ไม่มีข้อมูล" : `${closedProjects.length} โปรเจกต์`,
    revenue_vs_target_q: customers.length === 0 && goals.length === 0 ? "ไม่มีข้อมูล" : `฿${revenueTotal.toLocaleString()} / ฿${goalTarget.toLocaleString()}`,
    script_on_time: noTasks ? "ไม่มีข้อมูล" : `${((onTimeActual.length / done.length) * 100).toFixed(0)}%`,
    total_clients: tasks.length === 0 ? "ไม่มีข้อมูล" : `${clientIds.size} client`,
    client_revision_avg: noTasks ? "ไม่มีข้อมูล" : `${avgRevision} ครั้ง/งาน`,
  };
}

function getAutoValue(autoValues: AutoValues | null, questionAutoId?: AutoValueId): string {
  if (!questionAutoId || !autoValues) return "ไม่มีข้อมูล";
  return autoValues[questionAutoId] ?? "ไม่มีข้อมูล";
}

const SCORE_LABELS = ["", "ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"];

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => !disabled && onChange(n)}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`transition-transform ${disabled ? "cursor-default opacity-70" : "hover:scale-110 active:scale-95"}`}
          disabled={disabled}
        >
          <Star
            className="w-6 h-6"
            fill={n <= active ? "hsl(38 92% 50%)" : "none"}
            stroke={n <= active ? "hsl(38 92% 50%)" : "hsl(215 14% 70%)"}
          />
        </button>
      ))}
      <span className="text-sm font-semibold ml-1.5" style={{ color: value > 0 ? "hsl(38 92% 45%)" : "hsl(215 14% 50%)" }}>
        {value > 0 ? `${value}/5` : "—"}
      </span>
      {value > 0 && <span className="text-xs text-muted-foreground ml-0.5">{SCORE_LABELS[value]}</span>}
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
  disabled,
}: {
  section: KPISection;
  scores: KpiSubScores;
  textAnswers: Record<string, string>;
  autoValues: AutoValues | null;
  onRate: (key: string, v: number) => void;
  onText: (id: string, v: string) => void;
  disabled?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleQ = section.questions.filter((q) => q.type !== "hidden");
  if (!visibleQ.length) return null;

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full px-5 py-3.5 border-b border-border/40 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
        style={{ background: `${section.color}12` }}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          <h3 className="font-semibold text-sm">{section.title}</h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{section.weight}</span>
      </button>
      {!collapsed && (
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
                    <p className="text-sm font-medium mb-2.5">
                      {q.question} <span className="text-destructive">*</span>
                    </p>
                    {q.helperText && <p className="text-xs text-muted-foreground mb-2">{q.helperText}</p>}
                    <StarRating value={Number(scores[q.scoreKey!]) || 0} onChange={(v) => onRate(q.scoreKey!, v)} disabled={disabled} />
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
                      disabled={disabled}
                      className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">ความคืบหน้าการกรอกฟอร์ม</span>
        <span className="text-xs font-bold" style={{ color: percent === 100 ? "hsl(142 71% 45%)" : "hsl(191 91% 37%)" }}>
          {percent}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: percent === 100 ? "hsl(142 71% 45%)" : "hsl(191 91% 37%)",
          }}
        />
      </div>
    </div>
  );
}

export default function KpiEvaluate() {
  const { evaluateeId, periodId } = useParams<{ evaluateeId: string; periodId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeOverride = searchParams.get("type") as ReviewerType | null;

  const { periods } = useKpiPeriods();
  const { evaluations, upsertEvaluation } = useKpiEvaluations(periodId);
  const { employees } = useEmployees();
  const { user } = useAuthContext();

  const [scores, setScores] = useState<KpiSubScores>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftingKpi, setDraftingKpi] = useState(false);
  const [evaluator, setEvaluator] = useState<Employee | null>(null);
  const [needPicker, setNeedPicker] = useState(false);
  const [autoValues, setAutoValues] = useState<AutoValues | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [formConfig, setFormConfig] = useState(KPI_QUESTIONS.default.peer);

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
    () => (evaluatee ? resolveRoleKey(evaluatee) : "default") as RoleKey,
    [evaluatee],
  );

  const isDirector = evaluator ? resolveRoleKey(evaluator) === "ta" : false;

  const evalType = useMemo((): ReviewerType => {
    if (!evaluator || !evaluatee) return "peer";
    if (evaluator.id === evaluatee.id) return getSelfEvaluationType(roleKey);
    if (isDirector) {
      // Director can evaluate as either peer or supervisor — honour URL param
      if (typeOverride === "peer" || typeOverride === "supervisor") return typeOverride;
      return "supervisor";
    }
    return "peer";
  }, [evaluator, evaluatee, roleKey, isDirector, typeOverride]);

  const isPeerAllowed = useMemo(() => {
    if (!evaluatee || !evaluator || evalType !== "peer") return true;
    return getEligiblePeerReviewers(evaluatee, employees).some((emp) => emp.id === evaluator.id);
  }, [evaluatee, evaluator, evalType, employees]);

  useEffect(() => {
    let mounted = true;
    loadKpiFormConfig(roleKey, evalType).then((cfg) => {
      if (mounted) setFormConfig(cfg);
    });
    return () => { mounted = false; };
  }, [roleKey, evalType]);

  // Initialize scores to 0 (not 3) so user must explicitly rate
  useEffect(() => {
    if (!formConfig) return;
    setScores((prev) => {
      const s = { ...prev };
      for (const sec of formConfig.sections) {
        for (const q of sec.questions) {
          if (q.type === "rate" && q.scoreKey && !(q.scoreKey in s)) s[q.scoreKey] = 0;
        }
      }
      return s;
    });
  }, [formConfig]);

  // Restore existing evaluation + set read-only if already submitted
  useEffect(() => {
    if (!evaluator || !evaluations.length) return;
    const existing = evaluations.find(
      (e) => e.evaluator_id === evaluator.id
        && e.evaluatee_id === evaluateeId
        && e.period_id === periodId
        && getReviewType(e) === evalType,
    );
    if (!existing) return;

    const saved = existing.scores as Record<string, number | string>;
    const restoredScores: KpiSubScores = {};
    const restoredText: Record<string, string> = {};
    for (const [key, value] of Object.entries(saved ?? {})) {
      if (typeof value === "number") restoredScores[key] = value;
      if (typeof value === "string") restoredText[key] = value;
    }
    setScores(restoredScores);
    setTextAnswers(restoredText);

    if (existing.submitted_at) setIsReadOnly(true);
  }, [evaluations, evaluator, evaluateeId, periodId, evalType]);

  const setScore = (key: string, v: number) => {
    if (isReadOnly) return;
    setScores((p) => ({ ...p, [key]: v }));
  };
  const setText = (id: string, v: string) => {
    if (isReadOnly) return;
    setTextAnswers((p) => ({ ...p, [id]: v }));
  };

  const handleDraftKpi = async () => {
    if (!autoValues || !evaluatee) return;
    setDraftingKpi(true);
    try {
      const stats: Record<string, string> = {
        on_time_rate: autoValues.on_time_rate,
        total_tasks: autoValues.total_tasks,
        avg_revision: autoValues.avg_revision,
        closed_projects: autoValues.closed_projects,
        revenue_vs_target: autoValues.revenue_vs_target_q,
      };
      const draft = await draftKpiText(stats, evaluatee.name);
      for (const section of formConfig.sections) {
        for (const q of section.questions) {
          if (q.type === "text") {
            setText(q.id, draft);
            toast({ title: "✨ Auto-Draft สำเร็จ! กรุณาตรวจสอบและแก้ไขก่อนส่ง" });
            setDraftingKpi(false);
            return;
          }
        }
      }
    } catch (e) {
      toast({ title: "ไม่สามารถสร้าง Draft ได้", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
    setDraftingKpi(false);
  };

  // Calculate progress %
  const progressPercent = useMemo(() => {
    if (!formConfig) return 0;
    let total = 0;
    let filled = 0;
    for (const sec of formConfig.sections) {
      for (const q of sec.questions) {
        if (q.type === "rate" && q.scoreKey) {
          total++;
          if ((Number(scores[q.scoreKey]) || 0) > 0) filled++;
        }
        if (q.type === "text") {
          total++;
          if ((textAnswers[q.id] ?? "").trim()) filled++;
        }
      }
    }
    return total === 0 ? 100 : Math.round((filled / total) * 100);
  }, [formConfig, scores, textAnswers]);

  const handleSubmit = async () => {
    if (!evaluator) {
      toast({ title: "กรุณาเลือกชื่อของคุณก่อน", variant: "destructive" });
      return;
    }
    if (!isPeerAllowed) {
      toast({ title: "คุณไม่มีสิทธิ์ประเมินแบบ Peer สำหรับคนนี้", variant: "destructive" });
      return;
    }

    // Validate all rate fields
    for (const sec of formConfig.sections) {
      for (const q of sec.questions) {
        if (q.type === "rate" && q.scoreKey && (scores[q.scoreKey] ?? 0) === 0) {
          toast({ title: `กรุณาให้คะแนน: ${q.question}`, variant: "destructive" });
          return;
        }
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
      reviewer_type: evalType,
      scores: answersInScores,
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

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="mb-4 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          การประเมินนี้ถูกส่งแล้ว — ดูได้อย่างเดียว (read-only)
        </div>
      )}

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

        {!isReadOnly && autoValues && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleDraftKpi}
              disabled={draftingKpi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 hover:bg-violet-500/10 text-violet-500 border border-violet-500/30"
            >
              {draftingKpi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Auto-Draft KPI Review
            </button>
          </div>
        )}

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

      {/* Progress bar */}
      <ProgressBar percent={progressPercent} />

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
            disabled={isReadOnly}
          />
        ))}
      </div>

      {!isReadOnly && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !isPeerAllowed}
          className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? "กำลังส่ง..." : !isPeerAllowed ? "ไม่มีสิทธิ์ประเมิน" : "ส่งการประเมิน"}
        </button>
      )}
    </div>
  );
}

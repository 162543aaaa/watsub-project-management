import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Star, Download } from "lucide-react";

import { useKpiPeriods, useKpiEvaluations, KPI_CATEGORIES, type KpiEvaluation } from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  loadKpiFormConfig, resolveRoleKey,
  type RoleKey, type ReviewerType, type KPIFormConfig,
} from "@/config/kpiQuestions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const avatarUrl = (p?: string) =>
  !p ? null : p.startsWith("http") ? p : `${SUPABASE_URL}/storage/v1/object/public/employee-assets/${p}`;

// Bug fix: use || not ?? so empty string "" falls through to the next value
const getReviewType = (e: KpiEvaluation): ReviewerType =>
  ((e.reviewer_type || e.type || "").toLowerCase()) as ReviewerType;

const TYPE_LABEL: Record<string, string> = {
  self: "ตนเอง",
  peer: "เพื่อนร่วมงาน",
  supervisor: "หัวหน้า",
};

const TYPE_COLOR: Record<string, string> = {
  self: "hsl(191 91% 37%)",
  peer: "hsl(142 71% 45%)",
  supervisor: "hsl(38 92% 50%)",
};

// Label for old-format score keys (e.g. "communication" → "การสื่อสาร")
function labelForOldKey(key: string): string {
  for (const cat of KPI_CATEGORIES) {
    const item = cat.items.find((i) => i.key === key);
    if (item) return item.labelTh;
  }
  return key.replace(/_/g, " ");
}

// Parse notes_strength / notes_improve which may be a JSON object from old format
function parseNotesField(raw: string | null): Array<{ key: string; text: string }> {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => typeof v === "string" && (v as string).trim())
      .map(([k, v]) => ({ key: k, text: (v as string).trim() }));
  } catch {
    // plain text
    return raw.trim() ? [{ key: "", text: raw.trim() }] : [];
  }
}

// ─── Build Q&A pairs (pure, reused by EvalBlock and CSV export) ───────────────

type QAPair = { question: string; answer: number | string; type: "rate" | "text" };

function buildQAPairs(eval_: KpiEvaluation, formConfig: KPIFormConfig | undefined): QAPair[] {
  const pairs: QAPair[] = [];
  const scores = eval_.scores as Record<string, number | string>;

  // 1. Match via form config (new format keys)
  if (formConfig) {
    for (const sec of formConfig.sections) {
      for (const q of sec.questions) {
        if (q.type === "hidden" || q.type === "auto") continue;
        const val = q.type === "rate" && q.scoreKey ? scores[q.scoreKey] : scores[q.id];
        if (val !== undefined && val !== null && val !== "" && val !== 0) {
          pairs.push({ question: q.question, answer: val, type: q.type as "rate" | "text" });
        }
      }
    }
  }

  // 2. Fallback: raw old-format numeric scores
  const hasMatchedScores = pairs.some((p) => p.type === "rate");
  const rawScoreKeys = Object.entries(scores).filter(([, v]) => typeof v === "number" && (v as number) > 0);
  if (!hasMatchedScores && rawScoreKeys.length > 0) {
    for (const [key, val] of rawScoreKeys) {
      if (key === "communication" && (val as number) === 0) continue;
      pairs.push({ question: labelForOldKey(key), answer: val as number, type: "rate" });
    }
  }

  // Also show text strings stored in scores
  const matchedTextIds = new Set(
    formConfig?.sections.flatMap((s) => s.questions.filter((q) => q.type === "text").map((q) => q.id)) ?? [],
  );
  for (const [key, val] of Object.entries(scores)) {
    if (typeof val !== "string" || !val.trim()) continue;
    if (matchedTextIds.has(key)) continue;
    pairs.push({ question: labelForOldKey(key), answer: val, type: "text" });
  }

  // 3. Parse notes_strength / notes_improve (old text storage)
  const notesStrength = parseNotesField((eval_ as KpiEvaluation & { notes_strength?: string | null }).notes_strength ?? null);
  const notesImprove = parseNotesField((eval_ as KpiEvaluation & { notes_improve?: string | null }).notes_improve ?? null);
  for (const { text } of notesStrength) {
    if (!pairs.some((p) => p.answer === text))
      pairs.push({ question: "สิ่งที่ทำได้ดี / ข้อดี", answer: text, type: "text" });
  }
  for (const { text } of notesImprove) {
    if (!pairs.some((p) => p.answer === text))
      pairs.push({ question: "สิ่งที่ควรพัฒนา", answer: text, type: "text" });
  }

  return pairs;
}

// ─── CSV export ────────────────────────────────────────────────────────────────

function exportToCsv(
  evaluatees: Employee[],
  evalsByEvaluatee: Map<string, KpiEvaluation[]>,
  employees: Employee[],
  formConfigs: Map<string, KPIFormConfig>,
  periodLabel: string,
) {
  const BOM = "\uFEFF";
  const header = ["ผู้ถูกประเมิน", "ตำแหน่ง", "ประเภท", "ผู้ประเมิน", "คำถาม", "คำตอบ", "สถานะ"];
  const rows: string[][] = [header];

  for (const emp of evaluatees) {
    const evals = evalsByEvaluatee.get(emp.id) ?? [];
    const roleKey = resolveRoleKey(emp);
    const ORDER: Record<string, number> = { self: 0, peer: 1, supervisor: 2 };
    const sorted = [...evals].sort((a, b) => (ORDER[getReviewType(a)] ?? 9) - (ORDER[getReviewType(b)] ?? 9));

    for (const ev of sorted) {
      const evalType = getReviewType(ev);
      const cfg = formConfigs.get(`${roleKey}:${evalType}`);
      const evaluator = employees.find((e) => e.id === ev.evaluator_id);
      const evaluatorName = evalType === "self" ? emp.name : (evaluator?.name ?? "");
      const typeLabel = TYPE_LABEL[evalType] ?? evalType;
      const status = ev.submitted_at ? "ส่งแล้ว" : "draft";
      const pairs = buildQAPairs(ev, cfg);

      if (pairs.length === 0) {
        rows.push([emp.name, emp.position ?? "", typeLabel, evaluatorName, "", "", status]);
      } else {
        for (const pair of pairs) {
          rows.push([
            emp.name,
            emp.position ?? "",
            typeLabel,
            evaluatorName,
            pair.question,
            typeof pair.answer === "number" ? String(pair.answer) : pair.answer,
            status,
          ]);
        }
      }
    }
  }

  const csv = BOM + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpi-summary-${periodLabel.replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Star display ─────────────────────────────────────────────────────────────
function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="w-4 h-4"
          fill={n <= value ? "hsl(38 92% 50%)" : "none"}
          stroke={n <= value ? "hsl(38 92% 50%)" : "hsl(215 14% 70%)"}
        />
      ))}
      <span className="text-xs font-bold ml-1.5" style={{ color: "hsl(38 92% 45%)" }}>
        {value}/5
      </span>
    </div>
  );
}

// ─── Single evaluation accordion block ───────────────────────────────────────

function EvalBlock({
  eval_,
  evaluator,
  formConfig,
  defaultOpen,
}: {
  eval_: KpiEvaluation;
  evaluator?: Employee;
  formConfig?: KPIFormConfig;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const evalType = getReviewType(eval_);
  const color = TYPE_COLOR[evalType] ?? "hsl(215 14% 45%)";
  const typeLabel = TYPE_LABEL[evalType] ?? evalType ?? "ไม่ระบุ";

  const qaPairs = useMemo(() => buildQAPairs(eval_, formConfig), [eval_, formConfig]);

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open
            ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <span
            className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${color}18`, color }}
          >
            {typeLabel}
          </span>
          {evaluator && evalType !== "self" && (
            <span className="text-sm font-medium text-foreground truncate">{evaluator.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {eval_.submitted_at ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
              ส่งแล้ว
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              draft
            </span>
          )}
          <span className="text-xs text-muted-foreground">{qaPairs.length} คำตอบ</span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border/20">
          {qaPairs.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground italic">ไม่มีคำตอบที่บันทึกไว้</p>
          )}
          {qaPairs.map((pair, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 leading-relaxed">{pair.question}</p>
              {pair.type === "rate" && typeof pair.answer === "number" ? (
                <StarDisplay value={pair.answer} />
              ) : (
                <p className="text-sm bg-muted/40 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                  {pair.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card for one evaluatee ───────────────────────────────────────────────────

function EvaluateeCard({
  evaluatee,
  evals,
  employees,
  formConfigs,
}: {
  evaluatee: Employee;
  evals: KpiEvaluation[];
  employees: Employee[];
  formConfigs: Map<string, KPIFormConfig>;
}) {
  const [open, setOpen] = useState(true);
  const roleKey = resolveRoleKey(evaluatee);
  const url = avatarUrl(evaluatee.avatar);

  const ORDER: Record<string, number> = { self: 0, peer: 1, supervisor: 2 };
  const sorted = [...evals].sort(
    (a, b) => (ORDER[getReviewType(a)] ?? 9) - (ORDER[getReviewType(b)] ?? 9),
  );

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left border-b border-border/40"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
          {url
            ? <img src={url} alt={evaluatee.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-primary">{evaluatee.name.charAt(0)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{evaluatee.name}</p>
          <p className="text-xs text-muted-foreground">{evaluatee.position}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {sorted.filter((e) => e.submitted_at).length}/{sorted.length} ส่งแล้ว
          </span>
          {open
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มีการประเมิน</p>
          )}
          {sorted.map((ev) => {
            const evalType = getReviewType(ev);
            const cfgKey = `${roleKey}:${evalType}`;
            const cfg = formConfigs.get(cfgKey);
            const evaluator = employees.find((e) => e.id === ev.evaluator_id);
            return (
              <EvalBlock
                key={ev.id}
                eval_={ev}
                evaluator={evaluator}
                formConfig={cfg}
                defaultOpen={evalType === "self"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KpiPeriodSummary() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuthContext();
  const { periods } = useKpiPeriods();
  const { evaluations, loading: evLoading } = useKpiEvaluations(periodId);
  const { employees } = useEmployees();

  const [formConfigs, setFormConfigs] = useState<Map<string, KPIFormConfig>>(new Map());
  const [cfgLoading, setCfgLoading] = useState(true);

  const period = useMemo(() => periods.find((p) => p.id === periodId), [periods, periodId]);

  // Preload all needed form configs (roleKey × evalType)
  useEffect(() => {
    if (!employees.length) return;
    const roleKeys = [...new Set(employees.map((e) => resolveRoleKey(e)))] as RoleKey[];
    const evalTypes: ReviewerType[] = ["self", "peer", "supervisor"];

    setCfgLoading(true);
    Promise.all(
      roleKeys.flatMap((roleKey) =>
        evalTypes.map(async (evalType) => {
          const cfg = await loadKpiFormConfig(roleKey, evalType);
          return { key: `${roleKey}:${evalType}`, cfg };
        }),
      ),
    ).then((results) => {
      const map = new Map<string, KPIFormConfig>();
      for (const { key, cfg } of results) map.set(key, cfg);
      setFormConfigs(map);
      setCfgLoading(false);
    });
  }, [employees]);

  // Group all evaluations with at least one answer by evaluatee
  const evalsByEvaluatee = useMemo(() => {
    const map = new Map<string, KpiEvaluation[]>();
    for (const ev of evaluations) {
      const scores = ev.scores as Record<string, unknown>;
      if (!scores || Object.keys(scores).length === 0) continue;
      const arr = map.get(ev.evaluatee_id) ?? [];
      arr.push(ev);
      map.set(ev.evaluatee_id, arr);
    }
    return map;
  }, [evaluations]);

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/kpi/overview" replace />;

  const loading = evLoading || cfgLoading;

  return (
    <div className="p-4 md:p-6 page-enter max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/kpi/admin")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> กลับ KPI Admin
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">สรุปคำตอบทั้งหมด</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {period ? period.label : periodId}
            {period?.type === "project" ? " · ตามโปรเจกต์" : " · รายไตรมาส"}
          </p>
        </div>
        <button
          onClick={() => exportToCsv(employees, evalsByEvaluatee, employees, formConfigs, period?.label ?? periodId ?? "kpi")}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!loading && (
        <div className="space-y-5">
          {employees.map((emp) => (
            <EvaluateeCard
              key={emp.id}
              evaluatee={emp}
              evals={evalsByEvaluatee.get(emp.id) ?? []}
              employees={employees}
              formConfigs={formConfigs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

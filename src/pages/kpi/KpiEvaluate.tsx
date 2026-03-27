import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKpiPeriods, useKpiEvaluations, useKpiRoleWeights, type KpiEvaluation } from "@/hooks/useKpi";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SCORE_LABELS: Record<string, { th: string; desc: string[] }> = {
  job_performance: {
    th: "ผลการปฏิบัติงาน",
    desc: ["ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"],
  },
  competency: {
    th: "ความสามารถ / ทักษะ",
    desc: ["ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"],
  },
  teamwork: {
    th: "การทำงานเป็นทีม",
    desc: ["ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"],
  },
  leadership: {
    th: "ภาวะผู้นำ",
    desc: ["ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"],
  },
  creativity: {
    th: "ความคิดสร้างสรรค์",
    desc: ["ต่ำมาก", "ต่ำ", "ปานกลาง", "ดี", "ดีเยี่ยม"],
  },
};

const SCORE_KEYS = ["job_performance", "competency", "teamwork", "leadership", "creativity"] as const;

function ScoreSlider({
  label,
  thLabel,
  desc,
  value,
  onChange,
}: {
  label: string;
  thLabel: string;
  desc: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{thLabel}</label>
        <span className="text-sm font-bold" style={{ color: "hsl(191 91% 40%)" }}>{value} / 5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(191 91% 37%) ${(value - 1) * 25}%, hsl(220 13% 88%) ${(value - 1) * 25}%)`,
          accentColor: "hsl(191 91% 37%)",
        }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        {desc.map((d, i) => (
          <span key={i} className={value === i + 1 ? "font-semibold text-primary" : ""}>{d}</span>
        ))}
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
  const { getWeightForRole } = useKpiRoleWeights();

  const [scores, setScores] = useState<Record<string, number>>({
    job_performance: 3,
    competency: 3,
    teamwork: 3,
    leadership: 3,
    creativity: 3,
  });
  const [notesStrength, setNotesStrength] = useState("");
  const [notesImprove, setNotesImprove] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluatorEmployee, setEvaluatorEmployee] = useState<Employee | null>(null);

  const evaluatee = useMemo(() => employees.find(e => e.id === evaluateeId), [employees, evaluateeId]);
  const period = useMemo(() => periods.find(p => p.id === periodId), [periods, periodId]);

  // Find current user's employee record
  useEffect(() => {
    if (!user) return;
    supabase.from("employees").select("*").eq("email", user.email ?? "").maybeSingle()
      .then(({ data }) => { if (data) setEvaluatorEmployee(data as Employee); });
  }, [user]);

  // Determine evaluation type
  const evalType = useMemo((): "self" | "peer" | "supervisor" => {
    if (!evaluatorEmployee || !evaluatee) return "peer";
    if (evaluatorEmployee.id === evaluatee.id) return "self";
    // ต้า = director role -> supervisor
    if (evaluatorEmployee.role?.toLowerCase().includes("director")) return "supervisor";
    return "peer";
  }, [evaluatorEmployee, evaluatee]);

  // Pre-fill if draft exists
  useEffect(() => {
    if (!evaluatorEmployee) return;
    const existing = evaluations.find(
      e => e.evaluator_id === evaluatorEmployee.id &&
        e.evaluatee_id === evaluateeId &&
        e.period_id === periodId
    );
    if (existing) {
      setScores(existing.scores as Record<string, number>);
      setNotesStrength(existing.notes_strength ?? "");
      setNotesImprove(existing.notes_improve ?? "");
    }
  }, [evaluations, evaluatorEmployee, evaluateeId, periodId]);

  // Auto-score: task stats for evaluatee
  const [taskStats, setTaskStats] = useState<{ punctuality: number; quality: number } | null>(null);
  useEffect(() => {
    if (!evaluateeId) return;
    supabase
      .from("tasks")
      .select("status, due_date, comments")
      .contains("assigned_to", [evaluateeId])
      .then(({ data }) => {
        if (!data || data.length === 0) { setTaskStats({ punctuality: 0, quality: 0 }); return; }
        const done = data.filter(t => t.status === "Done");
        const onTime = done.filter(t => {
          if (!t.due_date) return false;
          return new Date(t.due_date) >= new Date();
        });
        const punctuality = done.length > 0 ? (onTime.length / done.length) * 100 : 0;
        // Quality: tasks approved first pass (no revision comment — approximation)
        const firstPass = done.filter(t => !t.comments?.toLowerCase().includes("revision") && !t.comments?.toLowerCase().includes("แก้ไข"));
        const quality = done.length > 0 ? (firstPass.length / done.length) * 100 : 0;
        setTaskStats({ punctuality, quality });
      });
  }, [evaluateeId]);

  const roleWeights = evaluatee ? getWeightForRole(evaluatee.role ?? "") : null;

  const handleSubmit = async () => {
    if (!evaluatorEmployee) { toast({ title: "ไม่พบข้อมูลผู้ประเมิน", variant: "destructive" }); return; }
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

  return (
    <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/kpi/overview")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">ประเมิน: {evaluatee.name}</h1>
          <p className="text-sm text-muted-foreground">{evaluatee.position} · {period.label} · ประเภท: {evalType === "self" ? "ตนเอง" : evalType === "supervisor" ? "หัวหน้า" : "เพื่อนร่วมงาน"}</p>
        </div>
      </div>

      {/* Auto stats card */}
      {taskStats !== null && (
        <div className="bg-card border border-border/60 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">ข้อมูลอ้างอิงจากงาน (อัตโนมัติ)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">ความตรงต่อเวลา</p>
              <p className="text-lg font-bold">{taskStats.punctuality.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">งานที่ส่งก่อน due date</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">คุณภาพงาน</p>
              <p className="text-lg font-bold">{taskStats.quality.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">ผ่านการอนุมัติรอบแรก</p>
            </div>
          </div>
        </div>
      )}

      {/* Sliders */}
      <div className="bg-card border border-border/60 rounded-xl p-5 mb-5 space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">คะแนนประเมิน</h2>
        {SCORE_KEYS.map(key => {
          const info = SCORE_LABELS[key];
          const weight = roleWeights ? roleWeights[key] : 0;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{info.th}</span>
                {weight > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: "hsl(191 91% 37% / 0.12)", color: "hsl(191 91% 40%)" }}>
                    น้ำหนัก {weight}%
                  </span>
                )}
              </div>
              <ScoreSlider
                label={key}
                thLabel=""
                desc={info.desc}
                value={scores[key] ?? 3}
                onChange={v => setScores(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          );
        })}
      </div>

      {/* Text fields */}
      <div className="bg-card border border-border/60 rounded-xl p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">ความคิดเห็น</h2>
        <div>
          <label className="text-sm font-medium mb-1.5 block">จุดแข็ง <span className="text-destructive">*</span></label>
          <textarea
            value={notesStrength}
            onChange={e => setNotesStrength(e.target.value)}
            rows={3}
            placeholder="ระบุจุดแข็งของผู้ถูกประเมิน..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">สิ่งที่ควรพัฒนา <span className="text-destructive">*</span></label>
          <textarea
            value={notesImprove}
            onChange={e => setNotesImprove(e.target.value)}
            rows={3}
            placeholder="ระบุสิ่งที่ควรพัฒนา..."
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

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

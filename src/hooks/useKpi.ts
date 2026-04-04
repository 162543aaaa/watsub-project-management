import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── KPI Categories ───────────────────────────────────────────────────────────

export const KPI_CATEGORIES = [
  {
    key: "job_performance" as const,
    labelTh: "ผลการปฏิบัติงาน",
    labelEn: "Job Performance",
    weight: 30,
    color: "hsl(191 91% 37%)",
    items: [
      { key: "quality" as const,        labelTh: "คุณภาพงาน",       desc: "งานได้มาตรฐานตามบรีฟของลูกค้า" },
      { key: "quantity" as const,       labelTh: "ปริมาณงาน",       desc: "จัดการจำนวนโปรเจกต์ได้ตามเป้า" },
      { key: "punctuality" as const,    labelTh: "ตรงต่อเวลา",      desc: "ส่งงานตาม Production Timeline" },
      { key: "accountability" as const, labelTh: "ความรับผิดชอบ",   desc: "ดูแลอุปกรณ์และจัดการไฟล์งาน" },
    ],
  },
  {
    key: "competency" as const,
    labelTh: "ความสามารถ / ทักษะ",
    labelEn: "Competency",
    weight: 30,
    color: "hsl(262 83% 58%)",
    items: [
      { key: "technical" as const,       labelTh: "ทักษะเฉพาะทาง",     desc: "ใช้กล้อง, ตัดต่อ, เขียนสคริปต์" },
      { key: "problem_solving" as const, labelTh: "การแก้ปัญหา",       desc: "จัดการปัญหาเฉพาะหน้าในกองถ่าย" },
      { key: "creativity" as const,      labelTh: "ความคิดสร้างสรรค์", desc: "นำเสนอไอเดียคอนเทนต์ใหม่ๆ" },
      { key: "learning" as const,        labelTh: "การเรียนรู้",        desc: "อัปเดตเทรนด์และเครื่องมือใหม่" },
    ],
  },
  {
    key: "teamwork" as const,
    labelTh: "การทำงานเป็นทีม",
    labelEn: "Teamwork",
    weight: 20,
    color: "hsl(142 71% 45%)",
    items: [
      { key: "communication" as const, labelTh: "การสื่อสาร",   desc: "ประสานงานระหว่างลูกค้าและทีม" },
      { key: "support" as const,       labelTh: "การช่วยเหลือ", desc: "ซัพพอร์ตเพื่อนร่วมทีมในกองถ่าย" },
      { key: "openness" as const,      labelTh: "การรับฟัง",    desc: "รับคำวิจารณ์จากลูกค้าและหัวหน้า" },
      { key: "collaboration" as const, labelTh: "ความร่วมมือ",  desc: "ทำงานร่วมกันตามวิสัยทัศน์ลูกค้า" },
    ],
  },
  {
    key: "leadership" as const,
    labelTh: "ภาวะผู้นำ / ธุรกิจ",
    labelEn: "Leadership",
    weight: 20,
    color: "hsl(38 92% 50%)",
    items: [
      { key: "presentation" as const,    labelTh: "การนำเสนอ",   desc: "ขายไอเดียและบรีฟให้ลูกค้าเข้าใจ" },
      { key: "decision_making" as const, labelTh: "การตัดสินใจ", desc: "ตัดสินใจด้านกลยุทธ์รายวัน" },
      { key: "management" as const,      labelTh: "การจัดการ",   desc: "จัดตารางงานและคุมงบประมาณ" },
      { key: "strategic" as const,       labelTh: "ทิศทางธุรกิจ",desc: "สร้างความสัมพันธ์กับพาร์ทเนอร์" },
    ],
  },
] as const;

export type KpiCategoryKey = typeof KPI_CATEGORIES[number]["key"];
export type KpiSubScoreKey =
  | "quality" | "quantity" | "punctuality" | "accountability"
  | "technical" | "problem_solving" | "creativity" | "learning"
  | "communication" | "support" | "openness" | "collaboration"
  | "presentation" | "decision_making" | "management" | "strategic";

export type KpiSubScores = Record<string, number | string>;

// ─── Score calculations ───────────────────────────────────────────────────────

export function calcCategoryScore(scores: KpiSubScores, catKey: KpiCategoryKey): number {
  // New format: keys encoded as "${catKey}__${questionId}"
  const prefix = `${catKey}__`;
  const newVals = Object.entries(scores)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => Number(v)) // FIX: Parse string to Number before calculating
    .filter(v => !isNaN(v) && v > 0);
    
  if (newVals.length > 0) {
    return newVals.reduce((a, b) => a + b, 0) / newVals.length;
  }
  
  // Old format: specific sub-score keys e.g. "quality", "technical" (backward compat)
  const cat = KPI_CATEGORIES.find(c => c.key === catKey);
  if (!cat) return 0;
  
  const oldVals = cat.items
    .map(i => Number(scores[i.key]) || 0) // FIX: Parse string to Number
    .filter(v => !isNaN(v) && v > 0);
    
  if (!oldVals.length) return 0;
  return oldVals.reduce((a, b) => a + b, 0) / oldVals.length;
}

export function calcWeightedScore(scores: KpiSubScores): number {
  let total = 0, wSum = 0;
  for (const cat of KPI_CATEGORIES) {
    const avg = calcCategoryScore(scores, cat.key);
    if (avg === 0) continue;
    total += avg * cat.weight;
    wSum += cat.weight;
  }
  return wSum === 0 ? 0 : total / wSum;
}

/** auto×0.30 + self×0.10 + peer×0.20 + supervisor×0.40 */
export function calcFinalScore(
  auto: number,
  self: number | null,
  peer: number | null,
  sup: number | null,
): number {
  // FIX: Dynamic weight normalization to prevent score loss if an evaluation is missing
  let s = auto * 0.3;
  let totalWeight = 0.3; // Base weight

  if (self !== null) { s += self * 0.1; totalWeight += 0.1; }
  if (peer !== null) { s += peer * 0.2; totalWeight += 0.2; }
  if (sup !== null)  { s += sup  * 0.4; totalWeight += 0.4; }
  
  return totalWeight > 0 ? s / totalWeight : 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiPeriod {
  id: string;
  label: string;
  project_id: string | null;
  type: "project" | "quarter";
  status: "open" | "closed";
  created_at: string;
}

export interface KpiEvaluation {
  id: string;
  period_id: string;
  evaluator_id: string;
  evaluatee_id: string;
  reviewer_type: "self" | "peer" | "supervisor";
  type?: "self" | "peer" | "supervisor";
  scores: Record<string, number | string>;
  notes_strength: string | null;
  notes_improve: string | null;
  submitted_at: string | null;
  created_at: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useKpiPeriods() {
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("kpi_periods").select("*").order("created_at", { ascending: false });
    setPeriods((data ?? []) as KpiPeriod[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addPeriod = async (p: Omit<KpiPeriod, "id" | "created_at">) => {
    const { data, error } = await supabase.from("kpi_periods").insert(p).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setPeriods(prev => [data as KpiPeriod, ...prev]);
    toast({ title: "สร้างรอบประเมินสำเร็จ!" });
    return data as KpiPeriod;
  };

  const updatePeriod = async (id: string, updates: Partial<KpiPeriod>) => {
    const { data, error } = await supabase.from("kpi_periods").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setPeriods(prev => prev.map(p => p.id === id ? data as KpiPeriod : p));
  };

  const deletePeriod = async (id: string) => {
    const { error } = await supabase.from("kpi_periods").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    setPeriods((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "ลบรอบประเมินสำเร็จ" });
    return true;
  };

  return { periods, loading, addPeriod, updatePeriod, deletePeriod, refetch: fetch };
}

export function useKpiEvaluations(periodId?: string) {
  const [evaluations, setEvaluations] = useState<KpiEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let q = supabase.from("kpi_evaluations").select("*");
    if (periodId) q = q.eq("period_id", periodId);
    const { data } = await q.order("created_at", { ascending: true });
    setEvaluations((data ?? []) as KpiEvaluation[]);
    setLoading(false);
  }, [periodId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertEvaluation = async (ev: Omit<KpiEvaluation, "id" | "created_at">) => {
    const reviewerType = ev.reviewer_type ?? ev.type;
    const { data: existing } = await supabase
      .from("kpi_evaluations").select("id")
      .eq("period_id", ev.period_id)
      .eq("evaluator_id", ev.evaluator_id)
      .eq("evaluatee_id", ev.evaluatee_id)
      .eq("reviewer_type", reviewerType)
      .maybeSingle();

    const payload = {
      ...ev,
      reviewer_type: reviewerType,
      type: reviewerType,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("kpi_evaluations").update(payload).eq("id", existing.id).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
      setEvaluations(prev => prev.map(e => e.id === existing.id ? data as KpiEvaluation : e));
      return data as KpiEvaluation;
    } else {
      const { data, error } = await supabase.from("kpi_evaluations").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
      setEvaluations(prev => [...prev, data as KpiEvaluation]);
      return data as KpiEvaluation;
    }
  };

  return { evaluations, loading, upsertEvaluation, refetch: fetch };
}

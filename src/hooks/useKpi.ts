import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Assessment Framework ───────────────────────────────────────────────────

export const KPI_CATEGORIES = [
  {
    key: "job_performance",
    label: "Job Performance",
    labelTh: "ผลการปฏิบัติงาน",
    weight: 30,
    color: "hsl(191 91% 37%)",
    items: [
      { key: "quality",        labelTh: "คุณภาพงาน",        desc: "งานตัดต่อ / กราฟิกได้มาตรฐานตามบรีฟ" },
      { key: "quantity",       labelTh: "ปริมาณงาน",        desc: "จัดการจำนวนโปรเจกต์ได้ตามเป้าหมาย" },
      { key: "punctuality",    labelTh: "การตรงต่อเวลา",    desc: "ส่งงานตามตารางผลิต (Production Timeline)" },
      { key: "accountability", labelTh: "ความรับผิดชอบ",    desc: "การดูแลอุปกรณ์และการจัดการไฟล์งาน" },
    ],
  },
  {
    key: "competency",
    label: "Competency",
    labelTh: "ความสามารถ / ทักษะ",
    weight: 30,
    color: "hsl(262 83% 58%)",
    items: [
      { key: "technical",       labelTh: "ทักษะเฉพาะทาง",       desc: "การใช้กล้อง, โปรแกรมตัดต่อ, การเขียนสคริปต์" },
      { key: "problem_solving", labelTh: "การแก้ปัญหา",         desc: "การจัดการปัญหาเฉพาะหน้าในกองถ่ายหรือกับลูกค้า" },
      { key: "creativity",      labelTh: "ความคิดสร้างสรรค์",   desc: "การนำเสนอไอเดียคอนเทนต์ใหม่ๆ" },
      { key: "learning",        labelTh: "การเรียนรู้",          desc: "การอัปเดตเทรนด์วิดีโอหรือเครื่องมือ AI ใหม่ๆ" },
    ],
  },
  {
    key: "teamwork",
    label: "Teamwork",
    labelTh: "การทำงานเป็นทีม",
    weight: 20,
    color: "hsl(142 71% 45%)",
    items: [
      { key: "communication", labelTh: "การสื่อสาร",   desc: "การประสานงานระหว่างลูกค้าและทีมภายใน" },
      { key: "support",       labelTh: "การช่วยเหลือ", desc: "การซัพพอร์ตเพื่อนร่วมทีมในกองถ่าย" },
      { key: "openness",      labelTh: "การรับฟัง",    desc: "การยอมรับคำวิจารณ์งานจากลูกค้า / หัวหน้า" },
      { key: "collaboration", labelTh: "ความร่วมมือ",  desc: "ทำงานร่วมกันเพื่อให้ได้วิสัยทัศน์ตามที่ลูกค้าต้องการ" },
    ],
  },
  {
    key: "leadership",
    label: "Leadership / Business",
    labelTh: "ภาวะผู้นำ / ธุรกิจ",
    weight: 20,
    color: "hsl(38 92% 50%)",
    items: [
      { key: "presentation",   labelTh: "การนำเสนอ",       desc: "การขายไอเดียหรือบรีฟงานให้ลูกค้าเข้าใจ" },
      { key: "decision_making",labelTh: "การตัดสินใจ",     desc: "การตัดสินใจด้านกลยุทธ์และการดำเนินงานรายวัน" },
      { key: "management",     labelTh: "การจัดการ",       desc: "การจัดตารางงานและการคุมงบประมาณการเงิน" },
      { key: "strategic",      labelTh: "ทิศทางธุรกิจ",   desc: "การสร้างความสัมพันธ์กับพาร์ทเนอร์ภายนอก" },
    ],
  },
] as const;

export type KpiCategoryKey = typeof KPI_CATEGORIES[number]["key"];
export type KpiSubScoreKey =
  | "quality" | "quantity" | "punctuality" | "accountability"
  | "technical" | "problem_solving" | "creativity" | "learning"
  | "communication" | "support" | "openness" | "collaboration"
  | "presentation" | "decision_making" | "management" | "strategic";

export type KpiSubScores = Partial<Record<KpiSubScoreKey, number>>;

/** Average of sub-items for one category */
export function calcCategoryScore(scores: KpiSubScores, categoryKey: KpiCategoryKey): number {
  const cat = KPI_CATEGORIES.find(c => c.key === categoryKey);
  if (!cat) return 0;
  const vals = cat.items.map(item => scores[item.key as KpiSubScoreKey] ?? 0);
  const filled = vals.filter(v => v > 0);
  if (filled.length === 0) return 0;
  return filled.reduce((a, b) => a + b, 0) / filled.length;
}

/** Overall weighted score across all 4 categories */
export function calcWeightedScore(scores: KpiSubScores): number {
  let total = 0;
  let weightSum = 0;
  for (const cat of KPI_CATEGORIES) {
    const avg = calcCategoryScore(scores, cat.key);
    if (avg === 0) continue;
    total += avg * cat.weight;
    weightSum += cat.weight;
  }
  return weightSum === 0 ? 0 : total / weightSum;
}

/** Final combined score: auto×0.30 + self×0.10 + peer×0.20 + supervisor×0.40 */
export function calcFinalScore(
  autoScore: number,
  selfScore: number | null,
  peerScore: number | null,
  supervisorScore: number | null
): number {
  let score = autoScore * 0.3;
  if (selfScore !== null) score += selfScore * 0.1;
  if (peerScore !== null) score += peerScore * 0.2;
  if (supervisorScore !== null) score += supervisorScore * 0.4;
  return score;
}

// ─── Types ──────────────────────────────────────────────────────────────────

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
  type: "self" | "peer" | "supervisor";
  scores: KpiSubScores;
  notes_strength: string | null;
  notes_improve: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface KpiRoleWeight {
  role: string;
  job_performance: number;
  competency: number;
  teamwork: number;
  leadership: number;
  creativity: number;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useKpiPeriods() {
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPeriods = useCallback(async () => {
    const { data, error } = await supabase
      .from("kpi_periods")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setPeriods((data ?? []) as KpiPeriod[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

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

  return { periods, loading, addPeriod, updatePeriod, refetch: fetchPeriods };
}

export function useKpiEvaluations(periodId?: string) {
  const [evaluations, setEvaluations] = useState<KpiEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvaluations = useCallback(async () => {
    let query = supabase.from("kpi_evaluations").select("*");
    if (periodId) query = query.eq("period_id", periodId);
    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setEvaluations((data ?? []) as KpiEvaluation[]);
    setLoading(false);
  }, [periodId]);

  useEffect(() => { fetchEvaluations(); }, [fetchEvaluations]);

  const upsertEvaluation = async (ev: Omit<KpiEvaluation, "id" | "created_at">) => {
    const { data: existing } = await supabase
      .from("kpi_evaluations")
      .select("id")
      .eq("period_id", ev.period_id)
      .eq("evaluator_id", ev.evaluator_id)
      .eq("evaluatee_id", ev.evaluatee_id)
      .eq("type", ev.type)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("kpi_evaluations").update(ev).eq("id", existing.id).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
      setEvaluations(prev => prev.map(e => e.id === existing.id ? data as KpiEvaluation : e));
      return data as KpiEvaluation;
    } else {
      const { data, error } = await supabase.from("kpi_evaluations").insert(ev).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
      setEvaluations(prev => [...prev, data as KpiEvaluation]);
      return data as KpiEvaluation;
    }
  };

  return { evaluations, loading, upsertEvaluation, refetch: fetchEvaluations };
}

export function useKpiRoleWeights() {
  const [weights, setWeights] = useState<KpiRoleWeight[]>([]);

  useEffect(() => {
    supabase.from("kpi_role_weights").select("*").then(({ data }) => {
      if (data) setWeights(data as KpiRoleWeight[]);
    });
  }, []);

  return { weights };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  scores: {
    job_performance?: number;
    competency?: number;
    teamwork?: number;
    leadership?: number;
    creativity?: number;
  };
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

export type KpiScoreKey = "job_performance" | "competency" | "teamwork" | "leadership" | "creativity";

/** Weighted average of scores using role weights (skips keys with weight=0) */
export function calcWeightedScore(scores: KpiEvaluation["scores"], weights: KpiRoleWeight): number {
  const keys: KpiScoreKey[] = ["job_performance", "competency", "teamwork", "leadership", "creativity"];
  let total = 0;
  let weightSum = 0;
  for (const key of keys) {
    const w = weights[key];
    if (w === 0) continue;
    const v = scores[key] ?? 0;
    total += v * w;
    weightSum += w;
  }
  return weightSum === 0 ? 0 : total / weightSum;
}

/** Final combined score from all evaluation types */
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
    // Check if a draft already exists for this evaluator/evaluatee/period
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
        .from("kpi_evaluations")
        .update(ev)
        .eq("id", existing.id)
        .select()
        .single();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("kpi_role_weights").select("*").then(({ data, error }) => {
      if (!error) setWeights((data ?? []) as KpiRoleWeight[]);
      setLoading(false);
    });
  }, []);

  const getWeightForRole = (role: string): KpiRoleWeight => {
    const found = weights.find(w => role.toLowerCase().includes(w.role));
    return found ?? { role: "default", job_performance: 25, competency: 25, teamwork: 25, leadership: 25, creativity: 0 };
  };

  return { weights, loading, getWeightForRole };
}

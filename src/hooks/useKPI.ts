import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const MEASUREMENT_TYPES = [
  { value: "goal", label: "วัดตามเป้าหมายของการปฏิบัติงาน" },
  { value: "job_desc", label: "ให้คะแนนตาม Job Description" },
  { value: "efficiency", label: "วัดจากประสิทธิภาพในการทำงาน" },
  { value: "self_eval", label: "ให้พนักงานให้คะแนนความพึงพอใจในงาน" },
  { value: "team", label: "วัดจากผลงานของทีม" },
  { value: "peer", label: "วัดจากความคิดเห็นของเพื่อนร่วมงาน" },
  { value: "cost", label: "วัดจากความคุ้มค่า" },
  { value: "attendance", label: "วัดจากการขาด ลา มาสาย" },
  { value: "creativity", label: "วัดจากความคิดสร้างสรรค์" },
  { value: "customer", label: "วัดจากความพึงพอใจของลูกค้า" },
] as const;

export interface KpiCriteria {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  measurement_type: string;
  weight: number;
  max_score: number;
  sort_order: number;
  created_at?: string;
}

export interface KpiTemplate {
  id: string;
  name: string;
  position: string;
  description?: string;
  period_months: number;
  created_at?: string;
  updated_at?: string;
  criteria?: KpiCriteria[];
}

export interface KpiScore {
  id: string;
  evaluation_id: string;
  criteria_id: string;
  score: number;
  comment?: string;
  created_at?: string;
}

export interface KpiEvaluation {
  id: string;
  employee_id: string;
  template_id: string;
  evaluator_name: string;
  period_start: string;
  period_end: string;
  status: "draft" | "completed";
  total_score?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  scores?: KpiScore[];
  template?: KpiTemplate;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function useKpiTemplates() {
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from("kpi_templates")
      .select("*, criteria:kpi_criteria(*)")
      .order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setTemplates((data || []) as unknown as KpiTemplate[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addTemplate = async (template: Omit<KpiTemplate, "id" | "created_at" | "updated_at" | "criteria">) => {
    const { data, error } = await supabase.from("kpi_templates").insert(template).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    await fetchTemplates();
    toast({ title: "สร้าง Template KPI สำเร็จ!" });
    return data;
  };

  const updateTemplate = async (id: string, updates: Partial<KpiTemplate>) => {
    const { error } = await supabase.from("kpi_templates").update(updates).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await fetchTemplates();
    toast({ title: "อัปเดต Template KPI สำเร็จ!" });
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("kpi_templates").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: "ลบ Template KPI สำเร็จ!" });
  };

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}

// ─── Criteria ─────────────────────────────────────────────────────────────────

export function useKpiCriteria(templateId: string | null) {
  const [criteria, setCriteria] = useState<KpiCriteria[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCriteria = useCallback(async () => {
    if (!templateId) { setCriteria([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("kpi_criteria")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setCriteria((data || []) as KpiCriteria[]);
    setLoading(false);
  }, [templateId]);

  useEffect(() => { fetchCriteria(); }, [fetchCriteria]);

  const addCriteria = async (c: Omit<KpiCriteria, "id" | "created_at">) => {
    const { data, error } = await supabase.from("kpi_criteria").insert(c).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setCriteria(prev => [...prev, data as KpiCriteria]);
    toast({ title: "เพิ่มเกณฑ์ KPI สำเร็จ!" });
    return data;
  };

  const updateCriteria = async (id: string, updates: Partial<KpiCriteria>) => {
    const { data, error } = await supabase.from("kpi_criteria").update(updates).eq("id", id).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCriteria(prev => prev.map(c => c.id === id ? data as KpiCriteria : c));
    toast({ title: "อัปเดตเกณฑ์ KPI สำเร็จ!" });
  };

  const deleteCriteria = async (id: string) => {
    const { error } = await supabase.from("kpi_criteria").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast({ title: "ลบเกณฑ์ KPI สำเร็จ!" });
  };

  return { criteria, loading, addCriteria, updateCriteria, deleteCriteria, refetch: fetchCriteria };
}

// ─── Evaluations ──────────────────────────────────────────────────────────────

export function useKpiEvaluations() {
  const [evaluations, setEvaluations] = useState<KpiEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvaluations = useCallback(async () => {
    const { data, error } = await supabase
      .from("kpi_evaluations")
      .select("*, scores:kpi_scores(*), template:kpi_templates(*, criteria:kpi_criteria(*))")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setEvaluations((data || []) as unknown as KpiEvaluation[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvaluations(); }, [fetchEvaluations]);

  const addEvaluation = async (ev: Omit<KpiEvaluation, "id" | "created_at" | "updated_at" | "scores" | "template">) => {
    const { data, error } = await supabase.from("kpi_evaluations").insert(ev).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    await fetchEvaluations();
    toast({ title: "สร้างการประเมิน KPI สำเร็จ!" });
    return data;
  };

  const saveScores = async (evaluationId: string, scores: { criteria_id: string; score: number; comment?: string }[]) => {
    // Upsert scores
    const rows = scores.map(s => ({ evaluation_id: evaluationId, ...s }));
    const { error } = await supabase.from("kpi_scores").upsert(rows, { onConflict: "evaluation_id,criteria_id" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }

    // Calculate total weighted score
    const evaluation = evaluations.find(e => e.id === evaluationId);
    if (evaluation?.template?.criteria) {
      const criteria = evaluation.template.criteria;
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      let weightedSum = 0;
      for (const c of criteria) {
        const s = scores.find(s => s.criteria_id === c.id);
        if (s) {
          weightedSum += (s.score / c.max_score) * c.weight;
        }
      }
      const totalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
      await supabase.from("kpi_evaluations")
        .update({ total_score: Math.round(totalScore * 100) / 100, status: "completed" })
        .eq("id", evaluationId);
    }

    await fetchEvaluations();
    toast({ title: "บันทึกคะแนน KPI สำเร็จ!" });
    return true;
  };

  const deleteEvaluation = async (id: string) => {
    const { error } = await supabase.from("kpi_evaluations").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setEvaluations(prev => prev.filter(e => e.id !== id));
    toast({ title: "ลบการประเมิน KPI สำเร็จ!" });
  };

  return { evaluations, loading, addEvaluation, saveScores, deleteEvaluation, refetch: fetchEvaluations };
}

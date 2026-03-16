-- KPI System Migration
-- Tables: kpi_templates, kpi_criteria, kpi_evaluations, kpi_scores

-- KPI Templates: define a set of KPI criteria for a job position
CREATE TABLE public.kpi_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT,
  period_months INTEGER NOT NULL DEFAULT 3, -- evaluation period: 3 or 6 months
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KPI Criteria: individual measurement items within a template
CREATE TABLE public.kpi_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.kpi_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  measurement_type TEXT NOT NULL DEFAULT 'goal',
  -- measurement_type values:
  -- goal         = วัดตามเป้าหมายของการปฏิบัติงาน
  -- job_desc     = ให้คะแนนตาม Job Description
  -- efficiency   = วัดจากประสิทธิภาพในการทำงาน
  -- self_eval    = ให้พนักงานให้คะแนนความพึงพอใจในงานของตนเอง
  -- team         = วัดจากผลงานของทีม
  -- peer         = วัดจากความคิดเห็นของเพื่อนร่วมงาน
  -- cost         = วัดจากความคุ้มค่า
  -- attendance   = วัดจากการขาด ลา มาสาย
  -- creativity   = วัดจากความคิดสร้างสรรค์
  -- customer     = วัดจากความพึงพอใจของลูกค้า
  weight NUMERIC(5,2) NOT NULL DEFAULT 10, -- weight as percentage (0-100)
  max_score NUMERIC(5,2) NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KPI Evaluations: one evaluation record per employee per period
CREATE TABLE public.kpi_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.kpi_templates(id) ON DELETE RESTRICT,
  evaluator_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | completed
  total_score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KPI Scores: individual criterion scores within an evaluation
CREATE TABLE public.kpi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.kpi_evaluations(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.kpi_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(evaluation_id, criteria_id)
);

-- Auto-update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_kpi_templates_updated_at
  BEFORE UPDATE ON public.kpi_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_evaluations_updated_at
  BEFORE UPDATE ON public.kpi_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated approved users can manage kpi_templates"
  ON public.kpi_templates FOR ALL
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

CREATE POLICY "Authenticated approved users can manage kpi_criteria"
  ON public.kpi_criteria FOR ALL
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

CREATE POLICY "Authenticated approved users can manage kpi_evaluations"
  ON public.kpi_evaluations FOR ALL
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

CREATE POLICY "Authenticated approved users can manage kpi_scores"
  ON public.kpi_scores FOR ALL
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

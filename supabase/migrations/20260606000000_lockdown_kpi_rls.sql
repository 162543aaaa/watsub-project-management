-- Drop permissive policies on KPI tables
DROP POLICY IF EXISTS "Allow all on kpi_periods" ON public.kpi_periods;
DROP POLICY IF EXISTS "Allow all on kpi_evaluations" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "Allow all on kpi_role_weights" ON public.kpi_role_weights;
DROP POLICY IF EXISTS "Allow all on kpi_question_templates" ON public.kpi_question_templates;

-- Create authenticated policies utilizing the is_approved() check

-- KPI PERIODS
CREATE POLICY "Authenticated users can access kpi_periods"
  ON public.kpi_periods FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- KPI EVALUATIONS
CREATE POLICY "Authenticated users can access kpi_evaluations"
  ON public.kpi_evaluations FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- KPI ROLE WEIGHTS
CREATE POLICY "Authenticated users can access kpi_role_weights"
  ON public.kpi_role_weights FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- KPI QUESTION TEMPLATES
CREATE POLICY "Authenticated users can access kpi_question_templates"
  ON public.kpi_question_templates FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

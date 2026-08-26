-- kpi_evaluations: evaluator_id references employees.id, not auth.users.id.
-- Use current_employee_id() so members can manage their own evaluations.
DROP POLICY IF EXISTS "Users can insert own kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Users can insert own kpi_evaluations" ON public.kpi_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (is_approved(auth.uid()) AND evaluator_id = public.current_employee_id());

DROP POLICY IF EXISTS "Users can update own kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Users can update own kpi_evaluations" ON public.kpi_evaluations
  FOR UPDATE TO authenticated
  USING (is_approved(auth.uid()) AND evaluator_id = public.current_employee_id())
  WITH CHECK (is_approved(auth.uid()) AND evaluator_id = public.current_employee_id());

DROP POLICY IF EXISTS "Users can view own kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Users can view own kpi_evaluations" ON public.kpi_evaluations
  FOR SELECT TO authenticated
  USING (is_approved(auth.uid()) AND (evaluator_id = public.current_employee_id() OR evaluatee_id = public.current_employee_id()));

-- kpi_periods: read for all approved users, writes admin-only.
DROP POLICY IF EXISTS "Approved users can access kpi_periods" ON public.kpi_periods;
CREATE POLICY "Approved users can read kpi_periods" ON public.kpi_periods
  FOR SELECT TO authenticated
  USING (is_approved(auth.uid()));
CREATE POLICY "Admins can manage kpi_periods" ON public.kpi_periods
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
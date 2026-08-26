-- KPI-only identity fallback for approved legacy accounts. Some employee roster
-- emails predate the login email, while profiles retain the member's display name.
-- Keep this scope limited to KPI rather than changing organization-wide RLS.
CREATE OR REPLACE FUNCTION public.current_kpi_evaluator_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  LEFT JOIN public.profiles p ON p.user_id = auth.uid()
  WHERE lower(btrim(e.email)) = lower(btrim(COALESCE(auth.jwt() ->> 'email', '')))
     OR (
       lower(btrim(e.name)) = lower(btrim(COALESCE(p.display_name, '')))
       AND 1 = (
         SELECT count(*)
         FROM public.employees named_employee
         WHERE lower(btrim(named_employee.name)) = lower(btrim(COALESCE(p.display_name, '')))
       )
     )
  ORDER BY CASE
    WHEN lower(btrim(e.email)) = lower(btrim(COALESCE(auth.jwt() ->> 'email', ''))) THEN 0
    ELSE 1
  END
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_kpi_evaluator_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_kpi_evaluator_employee_id() TO authenticated;

DROP POLICY IF EXISTS "Users can insert own kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Users can insert own kpi_evaluations" ON public.kpi_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_approved(auth.uid())
    AND evaluator_id = public.current_kpi_evaluator_employee_id()
  );

DROP POLICY IF EXISTS "Users can update own kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Users can update own kpi_evaluations" ON public.kpi_evaluations
  FOR UPDATE TO authenticated
  USING (
    is_approved(auth.uid())
    AND evaluator_id = public.current_kpi_evaluator_employee_id()
  )
  WITH CHECK (
    is_approved(auth.uid())
    AND evaluator_id = public.current_kpi_evaluator_employee_id()
  );

DROP POLICY IF EXISTS "Users can view own kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Users can view own kpi_evaluations" ON public.kpi_evaluations
  FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid())
    AND (
      evaluator_id = public.current_kpi_evaluator_employee_id()
      OR evaluatee_id = public.current_kpi_evaluator_employee_id()
    )
  );


DROP POLICY IF EXISTS "Authenticated users can access projects" ON public.projects;
CREATE POLICY "Authenticated users can access projects" ON public.projects
  FOR ALL USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can access tasks" ON public.tasks;
CREATE POLICY "Authenticated users can access tasks" ON public.tasks
  FOR ALL USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can access customers" ON public.customers;
CREATE POLICY "Authenticated users can access customers" ON public.customers
  FOR ALL USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can access employees" ON public.employees;
CREATE POLICY "Authenticated users can access employees" ON public.employees
  FOR ALL USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

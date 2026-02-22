
-- Update existing tables: replace permissive "true" policies with auth-required ones

-- CUSTOMERS
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
CREATE POLICY "Authenticated users can access customers"
  ON public.customers FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- EMPLOYEES
DROP POLICY IF EXISTS "Allow all operations on employees" ON public.employees;
CREATE POLICY "Authenticated users can access employees"
  ON public.employees FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- GOALS
DROP POLICY IF EXISTS "Allow all operations on goals" ON public.goals;
CREATE POLICY "Authenticated users can access goals"
  ON public.goals FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- LEAVE_REQUESTS
DROP POLICY IF EXISTS "Allow all operations on leave_requests" ON public.leave_requests;
CREATE POLICY "Authenticated users can access leave_requests"
  ON public.leave_requests FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Allow all operations on notifications" ON public.notifications;
CREATE POLICY "Authenticated users can access notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- PROJECTS
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
CREATE POLICY "Authenticated users can access projects"
  ON public.projects FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
CREATE POLICY "Authenticated users can access tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

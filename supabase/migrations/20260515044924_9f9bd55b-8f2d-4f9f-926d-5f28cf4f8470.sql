
-- 1. audit_logs: enable RLS, admin-only
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can manage audit_logs"
  ON public.audit_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
-- Allow approved users to insert their own audit entries (app writes audit on actions)
DROP POLICY IF EXISTS "Approved users can insert own audit_logs" ON public.audit_logs;
CREATE POLICY "Approved users can insert own audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_approved(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 2. employee-assets storage: restrict writes to approved authenticated users
DROP POLICY IF EXISTS "Public can upload employee assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can update employee assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete employee assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload employee assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update employee assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete employee assets" ON storage.objects;
DROP POLICY IF EXISTS "Approved users can upload employee-assets" ON storage.objects;
DROP POLICY IF EXISTS "Approved users can update employee-assets" ON storage.objects;
DROP POLICY IF EXISTS "Approved users can delete employee-assets" ON storage.objects;

CREATE POLICY "Approved users can upload employee-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-assets' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved users can update employee-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-assets' AND public.is_approved(auth.uid()))
  WITH CHECK (bucket_id = 'employee-assets' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved users can delete employee-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-assets' AND public.is_approved(auth.uid()));

-- 3. kpi_evaluations: scope by evaluator/evaluatee
DROP POLICY IF EXISTS "Approved users can access kpi_evaluations" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "Users can view own kpi_evaluations" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "Users can insert own kpi_evaluations" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "Users can update own kpi_evaluations" ON public.kpi_evaluations;
DROP POLICY IF EXISTS "Admins can manage kpi_evaluations" ON public.kpi_evaluations;

CREATE POLICY "Admins can manage kpi_evaluations"
  ON public.kpi_evaluations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own kpi_evaluations"
  ON public.kpi_evaluations FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND (evaluator_id = auth.uid() OR evaluatee_id = auth.uid())
  );
CREATE POLICY "Users can insert own kpi_evaluations"
  ON public.kpi_evaluations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_approved(auth.uid()) AND evaluator_id = auth.uid()
  );
CREATE POLICY "Users can update own kpi_evaluations"
  ON public.kpi_evaluations FOR UPDATE TO authenticated
  USING (public.is_approved(auth.uid()) AND evaluator_id = auth.uid())
  WITH CHECK (public.is_approved(auth.uid()) AND evaluator_id = auth.uid());

-- 4. leave_requests: scope by display_name (requested_by is text)
DROP POLICY IF EXISTS "Authenticated users can access leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can manage leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can view own leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can update own leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can delete own leave_requests" ON public.leave_requests;

CREATE POLICY "Admins can manage leave_requests"
  ON public.leave_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own leave_requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND requested_by = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own leave_requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.is_approved(auth.uid())
    AND requested_by = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own leave_requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND requested_by = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    requested_by = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own leave_requests"
  ON public.leave_requests FOR DELETE TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND requested_by = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
  );

-- 5. company_info: require approval
DROP POLICY IF EXISTS "Anyone can view company info" ON public.company_info;
CREATE POLICY "Approved users can view company info"
  ON public.company_info FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

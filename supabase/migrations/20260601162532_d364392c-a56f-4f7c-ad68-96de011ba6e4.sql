
ALTER FUNCTION public.match_tasks(vector, double precision, integer, uuid) SET search_path = public;
ALTER FUNCTION public.get_project_health_summary() SET search_path = public;

DROP FUNCTION IF EXISTS public.get_team_workload_heatmap(date, date);
CREATE OR REPLACE FUNCTION public.get_team_workload_heatmap(start_date date, end_date date)
RETURNS TABLE(employee_id uuid, employee_name text, date date, task_count integer, is_on_leave boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS employee_id,
    e.name AS employee_name,
    d.day::date AS date,
    COUNT(t.id)::int AS task_count,
    EXISTS(
      SELECT 1 FROM public.leave_requests l
      WHERE l.requested_by = e.name
        AND l.status = 'Approved'
        AND d.day::date >= l.leave_start::date
        AND d.day::date <= l.leave_end::date
    ) AS is_on_leave
  FROM public.employees e
  CROSS JOIN generate_series(get_team_workload_heatmap.start_date, get_team_workload_heatmap.end_date, '1 day'::interval) AS d(day)
  LEFT JOIN public.tasks t
    ON e.name = ANY(t.assigned_to)
    AND t.due_date::date = d.day::date
    AND t.status != 'Done'
  GROUP BY e.id, e.name, d.day
  ORDER BY e.name, d.day;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_confirm_emails() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_intern(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_intern(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;

REVOKE ALL ON FUNCTION public.current_employee_name() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_name() TO authenticated;

REVOKE ALL ON FUNCTION public.intern_visible_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intern_visible_names() TO authenticated;

REVOKE ALL ON FUNCTION public.get_team_workload_heatmap(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_workload_heatmap(date, date) TO authenticated;

DO $$
DECLARE
  fn_sig text;
BEGIN
  FOR fn_sig IN
    SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_team_workload_heatmap', 'match_tasks_global')
      AND pg_get_function_identity_arguments(p.oid) <> 'start_date date, end_date date'
      AND pg_get_function_identity_arguments(p.oid) <> 'query_embedding vector, match_threshold double precision, match_count integer, caller_id uuid'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn_sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn_sig);
    IF fn_sig LIKE 'public.get_team_workload_heatmap%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_sig);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.match_tasks(vector, double precision, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_tasks(vector, double precision, integer, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_project_health_summary() FROM PUBLIC, anon, authenticated;

-- Restrict employee-assets bucket listing
DROP POLICY IF EXISTS "Employee assets are publicly accessible" ON storage.objects;

CREATE POLICY "Approved users can read employee-assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-assets' AND public.is_approved(auth.uid()));

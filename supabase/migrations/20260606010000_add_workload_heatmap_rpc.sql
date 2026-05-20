-- Drop the function if it already exists
DROP FUNCTION IF EXISTS get_team_workload_heatmap(date, date);
DROP FUNCTION IF EXISTS get_team_workload_heatmap(text, text);

-- Create the function with TEXT parameters to match what Supabase RPC typically sends
CREATE OR REPLACE FUNCTION get_team_workload_heatmap(start_date text, end_date text)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  date text,
  task_count integer,
  is_on_leave boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH dates AS (
    SELECT generate_series(start_date::timestamp, end_date::timestamp, '1 day'::interval)::date AS d
  ),
  emps AS (
    SELECT id, name FROM public.employees 
    WHERE is_archived IS NOT TRUE
      AND active IS NOT FALSE
  )
  SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    dt.d::text AS date,
    (
      SELECT count(*)::integer 
      FROM public.tasks t
      WHERE t.due_date = dt.d::text 
        AND t.status != 'Done'
        AND e.name = ANY(t.assigned_to)
    ) AS task_count,
    EXISTS (
      SELECT 1 
      FROM public.leave_requests lr 
      WHERE lr.requested_by = e.name 
        AND lr.status = 'Approved'
        AND dt.d >= lr.leave_start::date 
        AND dt.d <= lr.leave_end::date
    ) AS is_on_leave
  FROM emps e
  CROSS JOIN dates dt;
$$;

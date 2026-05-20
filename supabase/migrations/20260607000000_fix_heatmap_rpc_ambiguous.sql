CREATE OR REPLACE FUNCTION public.get_team_workload_heatmap(start_date date, end_date date)
 RETURNS TABLE(employee_id uuid, employee_name text, date date, task_count integer, is_on_leave boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

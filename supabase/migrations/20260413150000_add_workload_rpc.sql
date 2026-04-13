-- =============================================================
-- Migration: 20260413150000_add_workload_rpc.sql
-- Adds estimated_hours to tasks + get_team_workload RPC
-- =============================================================

-- 1. Add estimated_hours column to tasks (0 = not yet estimated)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0 NOT NULL;

-- 2. Create get_team_workload aggregate function
--    Returns one row per employee with active task count + estimated hours
--    for tasks whose due_date falls within [start_date, end_date].
--    Tasks without a due_date are always included.
CREATE OR REPLACE FUNCTION public.get_team_workload(
  start_date date,
  end_date   date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(w)::jsonb), '[]'::jsonb)
  FROM (
    SELECT
      e.id::text                                     AS employee_id,
      e.name                                         AS display_name,
      e.avatar                                       AS avatar_url,
      COUNT(t.id)::int                               AS active_tasks_count,
      COALESCE(SUM(t.estimated_hours), 0)::numeric   AS total_estimated_hours
    FROM public.employees e
    LEFT JOIN public.tasks t
      ON  t.assigned_to @> ARRAY[e.name]
      AND t.status != 'Done'
      AND (
            t.due_date IS NULL
            OR (t.due_date >= start_date::text AND t.due_date <= end_date::text)
          )
    -- Only internal, active team members; excludes outsource / external workers
    WHERE e.active = true
      AND COALESCE(e.type, 'fulltime') = 'fulltime'
    GROUP BY e.id, e.name, e.avatar
    ORDER BY total_estimated_hours DESC, active_tasks_count DESC
  ) w
$$;

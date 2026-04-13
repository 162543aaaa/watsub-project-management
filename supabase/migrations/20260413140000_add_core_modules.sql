-- =============================================================
-- Migration: 20260413140000_add_core_modules.sql
-- Features: Activity Log (audit_logs), Company Wiki (wiki_pages),
--           Resource Workload RPC (get_resource_workload)
-- =============================================================

-- =============================================================
-- 1. ACTIVITY LOG: audit_logs table
-- =============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   text        NOT NULL,
  old_values  jsonb,
  new_values  jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins may read logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role('admin'::public.app_role, auth.uid()));

-- Any authenticated user can write (trigger runs as SECURITY DEFINER)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Generic trigger function – fires for any table attached to it
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id::text, row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSE
    -- UPDATE
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$;

-- Attach trigger to tasks
DROP TRIGGER IF EXISTS tasks_audit_trigger ON public.tasks;
CREATE TRIGGER tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- Attach trigger to projects
DROP TRIGGER IF EXISTS projects_audit_trigger ON public.projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- =============================================================
-- 2. COMPANY WIKI: wiki_pages table
-- =============================================================
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text        NOT NULL,
  slug         text        UNIQUE NOT NULL,
  content      text,
  category     text        NOT NULL DEFAULT 'General',
  author_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published boolean     NOT NULL DEFAULT true,
  view_count   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read published pages
CREATE POLICY "Authenticated users can read published wiki pages"
  ON public.wiki_pages FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = true);

-- Admin or the page's author may insert
CREATE POLICY "Authors and admins can insert wiki pages"
  ON public.wiki_pages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.has_role('admin'::public.app_role, auth.uid())
      OR auth.uid() = author_id
    )
  );

-- Admin or the page's author may update
CREATE POLICY "Authors and admins can update wiki pages"
  ON public.wiki_pages FOR UPDATE
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR auth.uid() = author_id
  );

-- Only admins may delete
CREATE POLICY "Admins can delete wiki pages"
  ON public.wiki_pages FOR DELETE
  USING (public.has_role('admin'::public.app_role, auth.uid()));

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.wiki_pages_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wiki_pages_updated_at ON public.wiki_pages;
CREATE TRIGGER wiki_pages_updated_at
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION public.wiki_pages_set_updated_at();

-- =============================================================
-- 3. RESOURCE WORKLOAD RPC: get_resource_workload
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_resource_workload(
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
      p.user_id::text  AS employee_id,
      p.display_name   AS employee_name,
      COUNT(t.id) FILTER (
        WHERE t.status != 'Done'
      )::int           AS active_tasks_count,
      0::numeric       AS total_estimated_hours
    FROM public.profiles p
    LEFT JOIN public.tasks t
      ON  t.assigned_to @> ARRAY[p.display_name]
      AND (
            t.due_date IS NULL
            OR (t.due_date >= start_date::text AND t.due_date <= end_date::text)
          )
    WHERE p.is_approved = true
    GROUP BY p.user_id, p.display_name
    ORDER BY active_tasks_count DESC
  ) w
$$;

-- Studio operations foundation: project dates + normalized audit timeline.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date text,
  ADD COLUMN IF NOT EXISTS deadline text;

CREATE INDEX IF NOT EXISTS idx_projects_deadline ON public.projects(deadline);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created
  ON public.audit_logs(entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_entity text;
  normalized_action text;
BEGIN
  normalized_entity := CASE TG_TABLE_NAME
    WHEN 'tasks' THEN 'task'
    WHEN 'projects' THEN 'project'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    normalized_action := 'deleted';
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), normalized_action, normalized_entity, OLD.id::text, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    normalized_action := 'created';
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), normalized_action, normalized_entity, NEW.id::text, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'tasks' AND OLD.status IS DISTINCT FROM NEW.status THEN
    normalized_action := 'status_changed:' || coalesce(OLD.status, 'not set') || '→' || coalesce(NEW.status, 'not set');
  ELSE
    normalized_action := 'updated';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), normalized_action, normalized_entity, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_audit_trigger ON public.tasks;
CREATE TRIGGER tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS projects_audit_trigger ON public.projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP POLICY IF EXISTS "Approved users can view scoped audit logs" ON public.audit_logs;
CREATE POLICY "Approved users can view scoped audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        entity_type IN ('task', 'tasks')
        AND EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id::text = audit_logs.entity_id
        )
      )
      OR (
        entity_type IN ('project', 'projects')
        AND EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id::text = audit_logs.entity_id
        )
      )
    )
  );

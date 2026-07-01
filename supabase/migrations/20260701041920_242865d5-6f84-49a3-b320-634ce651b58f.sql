
-- company_info extra columns
ALTER TABLE public.company_info
  ADD COLUMN IF NOT EXISTS history text,
  ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_links jsonb,
  ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_colors jsonb;

-- employees legacy columns still referenced by UI
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- archive flag for customers & projects
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- organization chart members
CREATE TABLE IF NOT EXISTS public.organization_chart_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  position text NOT NULL,
  role_type text NOT NULL DEFAULT 'core',
  parent_id uuid REFERENCES public.organization_chart_members(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_chart_members TO authenticated;
GRANT ALL ON public.organization_chart_members TO service_role;

ALTER TABLE public.organization_chart_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users can view org chart"
  ON public.organization_chart_members;
CREATE POLICY "Approved users can view org chart"
  ON public.organization_chart_members
  FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Admins manage org chart"
  ON public.organization_chart_members;
CREATE POLICY "Admins manage org chart"
  ON public.organization_chart_members
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_org_members_updated_at
  ON public.organization_chart_members;
CREATE TRIGGER trg_org_members_updated_at
  BEFORE UPDATE ON public.organization_chart_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

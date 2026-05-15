
-- Tighten overly permissive RLS policies

-- wiki_pages: replace duplicated permissive policies with approved-user checks
DROP POLICY IF EXISTS "Authenticated users can insert wiki pages" ON public.wiki_pages;
DROP POLICY IF EXISTS "Authors and admins can delete wiki pages" ON public.wiki_pages;
DROP POLICY IF EXISTS "Authors and admins can update wiki pages" ON public.wiki_pages;
DROP POLICY IF EXISTS "delete" ON public.wiki_pages;
DROP POLICY IF EXISTS "insert" ON public.wiki_pages;
DROP POLICY IF EXISTS "update" ON public.wiki_pages;

CREATE POLICY "Approved users can insert wiki pages"
  ON public.wiki_pages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can update wiki pages"
  ON public.wiki_pages FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can delete wiki pages"
  ON public.wiki_pages FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- kpi_evaluations: replace permissive ALL policy
DROP POLICY IF EXISTS "Allow all on kpi_evaluations" ON public.kpi_evaluations;
CREATE POLICY "Approved users can access kpi_evaluations"
  ON public.kpi_evaluations FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- kpi_periods: replace permissive ALL policy
DROP POLICY IF EXISTS "Allow all on kpi_periods" ON public.kpi_periods;
CREATE POLICY "Approved users can access kpi_periods"
  ON public.kpi_periods FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));

-- kpi_role_weights: replace permissive ALL policy (admin-only writes, approved reads)
DROP POLICY IF EXISTS "Allow all on kpi_role_weights" ON public.kpi_role_weights;
CREATE POLICY "Approved users can read kpi_role_weights"
  ON public.kpi_role_weights FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));
CREATE POLICY "Admins can manage kpi_role_weights"
  ON public.kpi_role_weights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

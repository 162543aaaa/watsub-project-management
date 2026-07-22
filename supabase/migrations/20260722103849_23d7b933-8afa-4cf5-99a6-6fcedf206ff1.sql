
DROP POLICY IF EXISTS "Anyone can view published wiki pages" ON public.wiki_pages;
DROP POLICY IF EXISTS "view" ON public.wiki_pages;

CREATE POLICY "Approved users can read wiki pages"
  ON public.wiki_pages FOR SELECT TO authenticated
  USING (is_published = true AND public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Approved users can insert notifications" ON public.notifications;
CREATE POLICY "Approved users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_approved(auth.uid())
    AND (
      recipient_user_id IS NULL
      OR recipient_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

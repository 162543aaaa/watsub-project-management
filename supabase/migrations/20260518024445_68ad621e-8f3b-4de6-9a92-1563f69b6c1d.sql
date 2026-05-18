ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_user_id uuid;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id);

DROP POLICY IF EXISTS "Authenticated users can access notifications" ON public.notifications;

CREATE POLICY "Admins manage all notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own or broadcast notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  );

CREATE POLICY "Users update own or broadcast notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_approved(auth.uid())
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  );

CREATE POLICY "Approved users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_approved(auth.uid())
    AND (recipient_user_id IS NULL OR recipient_user_id IS NOT NULL)
  );

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (
    public.is_approved(auth.uid())
    AND (recipient_user_id = auth.uid())
  );
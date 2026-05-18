-- Migration: Add ON DELETE CASCADE to notifications.recipient_user_id foreign key constraint.
-- This ensures deleting a user from auth.users automatically deletes all their notifications,
-- preventing foreign key violation errors during user deletion.

ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_recipient_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recipient_user_id_fkey 
  FOREIGN KEY (recipient_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 20260601000000_add_permission_preset.sql
-- Adds permission_preset column to profiles and recipient_user_id to notifications

-- Add permission_preset column (nullable) to profiles
ALTER TABLE public.profiles ADD COLUMN permission_preset VARCHAR(50);

-- Add recipient_user_id column to notifications (nullable)
ALTER TABLE public.notifications ADD COLUMN recipient_user_id UUID REFERENCES auth.users(id);

-- Ensure default values are null (no default needed)
ALTER TABLE public.profiles ALTER COLUMN permission_preset DROP DEFAULT;
ALTER TABLE public.notifications ALTER COLUMN recipient_user_id DROP DEFAULT;

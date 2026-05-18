-- Migration to automatically approve all new signups and grant full page access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_approved, allowed_pages)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, ''),
    true,                   -- Auto-approve immediately!
    ARRAY['*']::text[]      -- Grant access to all modules/pages!
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);

  RETURN NEW;
END;
$$;

-- Trigger to automatically confirm emails of new signups in auth.users table BEFORE insertion.
CREATE OR REPLACE FUNCTION public.auto_confirm_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_emails();

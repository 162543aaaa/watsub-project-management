-- Ensure new signups always get a profile row so they can log in and reach waiting-approval.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, ''),
    false
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles to unblock existing users.
INSERT INTO public.profiles (user_id, display_name, is_approved)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.email, ''),
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

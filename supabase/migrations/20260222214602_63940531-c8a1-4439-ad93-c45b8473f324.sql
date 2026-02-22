
-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profiles for any existing auth.users that don't have one
INSERT INTO public.profiles (user_id, display_name, is_approved)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.email),
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

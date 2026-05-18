-- Grant access for explicitly requested accounts.

WITH requested(email) AS (
  VALUES
    ('phuwanartbahem08@gmail.com'),
    ('hayatiprasiththihima@gmail.com'),
    ('chemaeseeham@gmail.com'),
    ('fanbb2996@gmail.com')
)
UPDATE public.profiles p
SET is_approved = true,
    updated_at = now()
FROM auth.users u
JOIN requested r ON lower(u.email) = lower(r.email)
WHERE p.user_id = u.id;

-- Ensure employee rows exist for requested accounts so employee-linked intern/main-team logic works.
INSERT INTO public.employees (name, position, email, role)
SELECT
  split_part(r.email, '@', 1) AS name,
  'Staff' AS position,
  r.email,
  'employee' AS role
FROM (
  VALUES
    ('phuwanartbahem08@gmail.com'),
    ('hayatiprasiththihima@gmail.com'),
    ('chemaeseeham@gmail.com'),
    ('fanbb2996@gmail.com')
) AS r(email)
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE lower(e.email) = lower(r.email)
);

CREATE TABLE IF NOT EXISTS public.company_info (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text,
  tagline text,
  vision text,
  mission text,
  core_values jsonb,
  logo_url text,
  contact_email text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.company_info (id, name, tagline, vision, mission, core_values)
VALUES (
  1,
  'Watsub',
  'Empowering project management',
  'To be the leading platform for team collaboration.',
  'We build intuitive tools that help teams deliver projects on time.',
  '["Innovation", "Integrity", "Teamwork"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read company info" ON public.company_info;
CREATE POLICY "Authenticated users can read company info"
  ON public.company_info
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update company info" ON public.company_info;
CREATE POLICY "Admins can update company info"
  ON public.company_info
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

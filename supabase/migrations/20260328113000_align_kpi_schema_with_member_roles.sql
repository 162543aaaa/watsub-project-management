-- Align KPI schema with role-based member evaluation model
-- NOTE: this codebase uses public.employees as team members.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kpi_role text CHECK (kpi_role IN ('director','production','strategy','outsource')),
  ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('fulltime','outsource')) DEFAULT 'fulltime',
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS public.kpi_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  type text CHECK (type IN ('project','quarter')) NOT NULL,
  status text CHECK (status IN ('open','closed')) DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kpi_evaluations
  ADD COLUMN IF NOT EXISTS reviewer_type text CHECK (reviewer_type IN ('self','peer','supervisor')),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

UPDATE public.kpi_evaluations
SET reviewer_type = COALESCE(reviewer_type, type)
WHERE reviewer_type IS NULL;

ALTER TABLE public.kpi_evaluations
  ALTER COLUMN reviewer_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kpi_evaluations_period_evaluator_evaluatee_reviewer_type_key'
  ) THEN
    ALTER TABLE public.kpi_evaluations
      ADD CONSTRAINT kpi_evaluations_period_evaluator_evaluatee_reviewer_type_key
      UNIQUE (period_id, evaluator_id, evaluatee_id, reviewer_type);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.kpi_role_weights (
  role text PRIMARY KEY,
  job_performance int,
  competency int,
  teamwork int,
  leadership int,
  creativity int,
  collaboration int
);

INSERT INTO public.kpi_role_weights (role, job_performance, competency, teamwork, leadership, creativity, collaboration) VALUES
  ('director',   20, 20, 20, 40, 0,  0),
  ('production', 40, 35, 15, 0,  10, 0),
  ('strategy',   35, 30, 25, 0,  10, 0),
  ('outsource',  45, 40, 0,  0,  0,  15)
ON CONFLICT (role) DO UPDATE SET
  job_performance = EXCLUDED.job_performance,
  competency = EXCLUDED.competency,
  teamwork = EXCLUDED.teamwork,
  leadership = EXCLUDED.leadership,
  creativity = EXCLUDED.creativity,
  collaboration = EXCLUDED.collaboration;

CREATE TABLE IF NOT EXISTS public.kpi_question_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text REFERENCES public.kpi_role_weights(role),
  reviewer_type text CHECK (reviewer_type IN ('self','peer','supervisor')),
  section_id text,
  section_title text,
  section_weight text,
  question_text text,
  question_type text CHECK (question_type IN ('auto','rate','text','hidden')),
  auto_source text,
  order_index int
);

-- KPI refresh based on March 2026 requirements

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS kpi_role text CHECK (kpi_role IN ('director','production','strategy','outsource')),
  ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('fulltime','outsource')) DEFAULT 'fulltime',
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- keep existing column `type` in kpi_evaluations for backward compatibility, add reviewer_type
ALTER TABLE kpi_evaluations
  ADD COLUMN IF NOT EXISTS reviewer_type text CHECK (reviewer_type IN ('self','peer','supervisor'));

UPDATE kpi_evaluations
SET reviewer_type = type
WHERE reviewer_type IS NULL;

ALTER TABLE kpi_evaluations
  ALTER COLUMN reviewer_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'kpi_evaluations_period_eval_unique'
  ) THEN
    CREATE UNIQUE INDEX kpi_evaluations_period_eval_unique
      ON kpi_evaluations(period_id, evaluator_id, evaluatee_id, reviewer_type);
  END IF;
END $$;

ALTER TABLE kpi_role_weights
  ADD COLUMN IF NOT EXISTS collaboration int NOT NULL DEFAULT 0;

INSERT INTO kpi_role_weights (role, job_performance, competency, teamwork, leadership, creativity, collaboration) VALUES
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

CREATE TABLE IF NOT EXISTS kpi_question_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text REFERENCES kpi_role_weights(role),
  reviewer_type text CHECK (reviewer_type IN ('self','peer','supervisor')),
  section_id text,
  section_title text,
  section_weight text,
  question_text text,
  question_type text CHECK (question_type IN ('auto','rate','text','hidden')),
  auto_source text,
  order_index int
);

ALTER TABLE kpi_question_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kpi_question_templates' AND policyname = 'Allow all on kpi_question_templates'
  ) THEN
    CREATE POLICY "Allow all on kpi_question_templates"
      ON kpi_question_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

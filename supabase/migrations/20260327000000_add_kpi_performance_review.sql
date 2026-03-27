-- KPI / Performance Review system tables

-- 1. kpi_periods
CREATE TABLE kpi_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('project', 'quarter')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. kpi_evaluations
CREATE TABLE kpi_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluatee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('self', 'peer', 'supervisor')),
  scores jsonb NOT NULL DEFAULT '{}',
  notes_strength text,
  notes_improve text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. kpi_role_weights
CREATE TABLE kpi_role_weights (
  role text PRIMARY KEY,
  job_performance int NOT NULL DEFAULT 0,
  competency int NOT NULL DEFAULT 0,
  teamwork int NOT NULL DEFAULT 0,
  leadership int NOT NULL DEFAULT 0,
  creativity int NOT NULL DEFAULT 0
);

-- Seed role weights
INSERT INTO kpi_role_weights (role, job_performance, competency, teamwork, leadership, creativity) VALUES
  ('director',   20, 20, 20, 40, 0),
  ('production', 40, 35, 15, 10, 0),
  ('strategy',   35, 30, 25, 10, 0);

-- Enable RLS (matching existing tables)
ALTER TABLE kpi_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_role_weights ENABLE ROW LEVEL SECURITY;

-- Permissive policies
CREATE POLICY "Allow all on kpi_periods"      ON kpi_periods      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on kpi_evaluations"  ON kpi_evaluations  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on kpi_role_weights" ON kpi_role_weights FOR ALL USING (true) WITH CHECK (true);

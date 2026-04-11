
-- Create objectives table
CREATE TABLE public.objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL DEFAULT 2026,
  owner_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create key_results table
CREATE TABLE public.key_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  initial_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for objectives
CREATE POLICY "Authenticated users can access objectives"
  ON public.objectives FOR ALL
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

-- RLS policies for key_results
CREATE POLICY "Authenticated users can access key_results"
  ON public.key_results FOR ALL
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at
  BEFORE UPDATE ON public.key_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Data migration from goals table
INSERT INTO public.objectives (title, period, year, owner_id, status)
SELECT
  g.title,
  CASE
    WHEN EXTRACT(MONTH FROM g.deadline::date) BETWEEN 1 AND 3 THEN 'Q1 ' || EXTRACT(YEAR FROM g.deadline::date)::text
    WHEN EXTRACT(MONTH FROM g.deadline::date) BETWEEN 4 AND 6 THEN 'Q2 ' || EXTRACT(YEAR FROM g.deadline::date)::text
    WHEN EXTRACT(MONTH FROM g.deadline::date) BETWEEN 7 AND 9 THEN 'Q3 ' || EXTRACT(YEAR FROM g.deadline::date)::text
    ELSE 'Q4 ' || EXTRACT(YEAR FROM g.deadline::date)::text
  END AS period,
  EXTRACT(YEAR FROM g.deadline::date)::integer AS year,
  CASE WHEN g.assigned_to IS NOT NULL AND g.assigned_to != '' THEN
    (SELECT e.id FROM public.employees e WHERE e.name = g.assigned_to LIMIT 1)
  ELSE NULL END AS owner_id,
  CASE WHEN g.current_value >= g.target_value THEN 'completed' ELSE 'active' END AS status
FROM public.goals g;

-- Create corresponding key results for each migrated objective
INSERT INTO public.key_results (objective_id, title, initial_value, target_value, current_value, unit)
SELECT
  o.id,
  g.title || ' - Key Result',
  0,
  g.target_value,
  g.current_value,
  '%'
FROM public.goals g
JOIN public.objectives o ON o.title = g.title
  AND o.year = EXTRACT(YEAR FROM g.deadline::date)::integer;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS end_date text,
  ADD COLUMN IF NOT EXISTS end_reason text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
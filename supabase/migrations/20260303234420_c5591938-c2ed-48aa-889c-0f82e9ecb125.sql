
-- Add start_date and end_date columns, migrate existing holiday_date data
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS start_date text;
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS end_date text;

-- Copy existing holiday_date to start_date and end_date
UPDATE public.holidays SET start_date = holiday_date, end_date = holiday_date WHERE start_date IS NULL;

-- Make start_date NOT NULL after populating
ALTER TABLE public.holidays ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.holidays ALTER COLUMN start_date SET DEFAULT '';
ALTER TABLE public.holidays ALTER COLUMN end_date SET NOT NULL;
ALTER TABLE public.holidays ALTER COLUMN end_date SET DEFAULT '';

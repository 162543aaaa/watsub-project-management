-- Add is_archived and status columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add is_archived and status columns to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Index for faster filtering by archive status
CREATE INDEX IF NOT EXISTS idx_profiles_is_archived ON public.profiles(is_archived);
CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON public.employees(is_archived);

-- Add sort_order column to tasks, projects, customers
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Initialize sort_order based on created_at order
UPDATE public.tasks t
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM public.tasks
) sub
WHERE t.id = sub.id;

UPDATE public.projects p
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM public.projects
) sub
WHERE p.id = sub.id;

UPDATE public.customers c
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM public.customers
) sub
WHERE c.id = sub.id;

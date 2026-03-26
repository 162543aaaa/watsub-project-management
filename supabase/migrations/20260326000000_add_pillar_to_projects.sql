-- Add pillar column to projects table
ALTER TABLE public.projects ADD COLUMN pillar text NOT NULL DEFAULT 'SOUL';

-- Pre-assign pillars to existing projects based on name
UPDATE public.projects SET pillar = 'JOINT' WHERE LOWER(name) IN ('work wok', 'coolsub');
UPDATE public.projects SET pillar = 'SOUL' WHERE LOWER(name) IN ('what''s write', 'watwrite', 'row gen', 'raw gen', 'sgnc ttb', 'sgnc', 'watsub');
UPDATE public.projects SET pillar = 'VIBES' WHERE LOWER(name) IN ('mood', 'collor walk', 'color walk', 'whatlife', 'watlife');

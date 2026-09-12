-- Seed canonical Organization Wiki pages from the legacy company profile.
-- Existing wiki pages always win; this migration never overwrites a slug.

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
SELECT
  'Organization Vision',
  'organization-vision',
  vision,
  'Organization',
  NULL,
  true
FROM public.company_info
WHERE coalesce(trim(vision), '') <> ''
ORDER BY id
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
SELECT
  'Organization Mission',
  'organization-mission',
  mission,
  'Organization',
  NULL,
  true
FROM public.company_info
WHERE coalesce(trim(mission), '') <> ''
ORDER BY id
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
SELECT
  'Organization History',
  'organization-history',
  history,
  'Organization',
  NULL,
  true
FROM public.company_info
WHERE coalesce(trim(history), '') <> ''
ORDER BY id
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

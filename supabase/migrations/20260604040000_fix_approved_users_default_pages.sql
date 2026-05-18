-- Approved users with empty allowed_pages cannot access any route.
-- Backfill default '*' pages to restore access.
UPDATE public.profiles
SET allowed_pages = ARRAY['*']::text[],
    updated_at = now()
WHERE is_approved = true
  AND (allowed_pages IS NULL OR coalesce(array_length(allowed_pages, 1), 0) = 0);

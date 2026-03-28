-- Backfill missing employee KPI roles so dynamic form selection works for existing members

UPDATE public.employees
SET kpi_role = 'outsource'
WHERE (kpi_role IS NULL OR btrim(kpi_role) = '')
  AND (
    lower(coalesce(type, '')) = 'outsource'
    OR lower(coalesce(role, '')) LIKE '%outsource%'
    OR lower(coalesce(position, '')) LIKE '%outsource%'
    OR lower(coalesce(position, '')) LIKE '%freelance%'
    OR lower(coalesce(position, '')) LIKE '%external%'
  );

UPDATE public.employees
SET kpi_role = 'director'
WHERE (kpi_role IS NULL OR btrim(kpi_role) = '')
  AND (
    lower(coalesce(role, '')) LIKE '%director%'
    OR lower(coalesce(position, '')) LIKE '%director%'
    OR lower(coalesce(position, '')) LIKE '%founder%'
  );

UPDATE public.employees
SET kpi_role = 'production'
WHERE (kpi_role IS NULL OR btrim(kpi_role) = '')
  AND (
    lower(coalesce(role, '')) LIKE '%production%'
    OR lower(coalesce(position, '')) LIKE '%production%'
    OR lower(coalesce(position, '')) LIKE '%videographer%'
    OR lower(coalesce(position, '')) LIKE '%editor%'
  );

UPDATE public.employees
SET kpi_role = 'strategy'
WHERE (kpi_role IS NULL OR btrim(kpi_role) = '')
  AND (
    lower(coalesce(role, '')) LIKE '%strategy%'
    OR lower(coalesce(position, '')) LIKE '%strategy%'
    OR lower(coalesce(position, '')) LIKE '%content strategist%'
    OR lower(coalesce(position, '')) LIKE '%coordinator%'
  );

UPDATE public.employees
SET type = 'outsource'
WHERE kpi_role = 'outsource'
  AND (type IS NULL OR btrim(type) = '' OR lower(type) = 'fulltime');

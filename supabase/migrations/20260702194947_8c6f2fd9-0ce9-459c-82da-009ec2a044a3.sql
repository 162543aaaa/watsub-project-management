
-- Normalize names (case-insensitive, trimmed variants)
UPDATE public.projects SET name = 'COLOR WALK' WHERE regexp_replace(lower(name), '\s+', '', 'g') IN ('colorwalk');
UPDATE public.projects SET name = 'MOOD' WHERE lower(trim(name)) = 'mood';
UPDATE public.projects SET name = 'Wat Life?' WHERE regexp_replace(lower(name), '[\s?]+', '', 'g') IN ('watlife');
UPDATE public.projects SET name = 'SGNC' WHERE lower(trim(name)) = 'sgnc';
UPDATE public.projects SET name = 'RAW GEN' WHERE regexp_replace(lower(name), '\s+', '', 'g') IN ('rawgen');
UPDATE public.projects SET name = 'Wat Write' WHERE regexp_replace(lower(name), '\s+', '', 'g') IN ('watwrite');
UPDATE public.projects SET name = 'WORK WOK' WHERE regexp_replace(lower(name), '\s+', '', 'g') IN ('workwok');
UPDATE public.projects SET name = 'COOL SUB' WHERE regexp_replace(lower(name), '\s+', '', 'g') IN ('coolsub');
UPDATE public.projects SET name = 'LiVE SUB' WHERE regexp_replace(lower(name), '\s+', '', 'g') IN ('livesub');

-- Backfill links when empty/null
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/12tmjjUHMlNO64cb4-QNqKiAsU_0ohXcj?usp=drive_link' WHERE name = 'COLOR WALK' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/18JD8egA2ML-z-L3OTHtdKiikvY-5_f-U?usp=drive_link' WHERE name = 'MOOD' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/1G-6MYBNv-unwa34PgcbGicKkbYypoeCC?usp=drive_link' WHERE name = 'Wat Life?' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/16P_jGV7rxbM_GjQNYMKidQnVIGoblgmS?usp=drive_link' WHERE name = 'SGNC' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/1Wu7gXyrvETLeqYMncTSNicscM8JNQF_Z?usp=drive_link' WHERE name = 'RAW GEN' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/1K4bV0Got0PUeBVl17wp7dvO0aixMgi9e?usp=drive_link' WHERE name = 'Wat Write' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/1rMInMIjtAprWsjACB8RXGSW6tAfNb4A1?usp=drive_link' WHERE name = 'WORK WOK' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/1QCRNi3_FB7XGD3qGWYG2VABnif7IVtiB?usp=drive_link' WHERE name = 'COOL SUB' AND (link IS NULL OR link = '');
UPDATE public.projects SET link = 'https://drive.google.com/drive/folders/1stEv__CRxCMda3AXha31svnUTaOevds5?usp=drive_link' WHERE name = 'LiVE SUB' AND (link IS NULL OR link = '');

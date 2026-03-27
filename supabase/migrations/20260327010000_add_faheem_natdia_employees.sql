-- Ensure additional team members exist for KPI evaluation roster
INSERT INTO public.employees (name, position, email, role)
SELECT 'Faheem Yusoh', 'Production Assistant', 'faheem.yusoh@watsub.local', 'employee'
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees WHERE lower(name) = lower('Faheem Yusoh')
);

INSERT INTO public.employees (name, position, email, role)
SELECT 'Natdia Benyakat', 'Content Coordinator', 'natdia.benyakat@watsub.local', 'employee'
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees WHERE lower(name) = lower('Natdia Benyakat')
);

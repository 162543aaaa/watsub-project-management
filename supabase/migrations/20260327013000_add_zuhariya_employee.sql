-- Ensure additional team member exists for KPI evaluation roster
INSERT INTO public.employees (name, position, email, role)
SELECT 'zuhariya yato', 'Content Assistant', 'zuhariya.yato@watsub.local', 'employee'
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees WHERE lower(name) = lower('zuhariya yato')
);

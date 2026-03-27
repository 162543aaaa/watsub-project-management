-- Ensure full WatSUB KPI roster exists
INSERT INTO public.employees (name, position, email, role)
SELECT 'TARMISI WANI', 'Founding Director', 'tamisiwani@gmail.com', 'director'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(name) = lower('TARMISI WANI'));

INSERT INTO public.employees (name, position, email, role)
SELECT 'สุไมยนา หวังเบ็ญหมัด', 'Content Strategist & Client Coordinator', 'dudhjjui@gmail.com', 'employee'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(name) = lower('สุไมยนา หวังเบ็ญหมัด'));

INSERT INTO public.employees (name, position, email, role)
SELECT 'ฮาฟีซ ดอเลาะ', 'Videographer & Graphic Designer', 'fisdoloh00@gmail.com', 'employee'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(name) = lower('ฮาฟีซ ดอเลาะ'));

INSERT INTO public.employees (name, position, email, role)
SELECT 'Faheem Yusoh', 'Production Assistant', 'faheem.yusoh@watsub.local', 'employee'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(name) = lower('Faheem Yusoh'));

INSERT INTO public.employees (name, position, email, role)
SELECT 'zuhariya yato', 'Content Assistant', 'zuhariya.yato@watsub.local', 'employee'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(name) = lower('zuhariya yato'));

INSERT INTO public.employees (name, position, email, role)
SELECT 'Natdia Benyakat', 'Content Coordinator', 'natdia.benyakat@watsub.local', 'employee'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(name) = lower('Natdia Benyakat'));


-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  holiday_date TEXT NOT NULL,
  holiday_type TEXT NOT NULL DEFAULT 'government',
  color_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access holidays"
ON public.holidays
FOR ALL
USING ((auth.uid() IS NOT NULL) AND is_approved(auth.uid()))
WITH CHECK ((auth.uid() IS NOT NULL) AND is_approved(auth.uid()));

CREATE TRIGGER update_holidays_updated_at
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Thailand 2026 official holidays
INSERT INTO public.holidays (name, holiday_date, holiday_type) VALUES
('วันขึ้นปีใหม่', '2026-01-01', 'government'),
('วันมาฆบูชา', '2026-02-12', 'government'),
('วันจักรี', '2026-04-06', 'government'),
('วันสงกรานต์', '2026-04-13', 'government'),
('วันสงกรานต์', '2026-04-14', 'government'),
('วันสงกรานต์', '2026-04-15', 'government'),
('วันแรงงานแห่งชาติ', '2026-05-01', 'government'),
('วันวิสาขบูชา', '2026-05-11', 'government'),
('วันเฉลิมพระชนมพรรษา ร.10', '2026-07-28', 'government'),
('วันอาสาฬหบูชา', '2026-07-07', 'government'),
('วันเข้าพรรษา', '2026-07-08', 'government'),
('วันเฉลิมพระชนมพรรษา พระราชินี', '2026-06-03', 'government'),
('วันแม่แห่งชาติ', '2026-08-12', 'government'),
('วันคล้ายวันสวรรคต ร.9', '2026-10-13', 'government'),
('วันปิยมหาราช', '2026-10-23', 'government'),
('วันพ่อแห่งชาติ', '2026-12-05', 'government'),
('วันรัฐธรรมนูญ', '2026-12-10', 'government'),
('วันสิ้นปี', '2026-12-31', 'government');

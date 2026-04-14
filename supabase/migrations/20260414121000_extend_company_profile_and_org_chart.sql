ALTER TABLE public.company_info
  ADD COLUMN IF NOT EXISTS history text,
  ADD COLUMN IF NOT EXISTS milestones jsonb,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS location_link text,
  ADD COLUMN IF NOT EXISTS leadership_agreement text,
  ADD COLUMN IF NOT EXISTS handbook_url text,
  ADD COLUMN IF NOT EXISTS brand_assets_url text,
  ADD COLUMN IF NOT EXISTS benefits_summary text,
  ADD COLUMN IF NOT EXISTS brand_colors jsonb;

UPDATE public.company_info
SET
  name = COALESCE(name, 'WatSUB! Studio (วาตซับ สตูดิโอ)'),
  tagline = COALESCE(tagline, 'A Space for Creative Connectivity'),
  vision = COALESCE(vision, '"Connect. Create. Inspire." เปลี่ยนจากคนเล่าเรื่องสู่ Infrastructure จุดนัดพบระหว่างคนเก่ง ไอเดียดี และโอกาสธุรกิจ'),
  mission = COALESCE(mission, 'ทำหน้าที่เป็น Connector เชื่อมผู้คนเข้ากับเมือง ไอเดีย และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่จับต้องได้จริงในปัตตานี'),
  history = COALESCE(history, 'WatSUB! Studio ก่อตั้งเมื่อปี 2023 ด้วยความเชื่อที่ว่าปัตตานีมีศักยภาพสร้างงาน creative ระดับสากล เราไม่ได้แค่ผลิตคอนเทนต์ — เราสร้างพื้นที่ที่คนสร้างสรรค์เติบโตได้ จาก studio เล็กๆ สู่ creative production studio ที่ครบวงจร เราคือพื้นที่ที่เชื่อมโยงผู้คน ไอเดีย และโอกาส เข้าด้วยกันผ่านงานสร้างสรรค์ที่มีความหมายและทรงพลัง พร้อม connect คนเก่งในพื้นที่กับ brand ที่ต้องการ storytelling ที่ authentic'),
  milestones = COALESCE(milestones, '["2023: ก่อตั้ง WatSUB! Studio", "2024: ขยายทีม production และ network ผู้เชี่ยวชาญ", "2025: วางระบบ partnership และสร้าง ecosystem คนสร้างสรรค์"]'::jsonb),
  location = COALESCE(location, 'จังหวัดปัตตานี'),
  location_link = COALESCE(location_link, 'https://maps.app.goo.gl/pLauvKsc9JCAYAFv9'),
  leadership_agreement = COALESCE(leadership_agreement, 'Partnership Agreement: 8 ธันวาคม 2568'),
  handbook_url = COALESCE(handbook_url, 'https://drive.google.com/drive/folders/16740VA6PHLUjm6y6KnO_Un495OXHASXT?usp=drive_link'),
  brand_assets_url = COALESCE(brand_assets_url, 'https://drive.google.com/drive/folders/1yNe-qPAMA6eppoJAIXfdOLJYlDo_phb5?usp=drive_link'),
  benefits_summary = COALESCE(benefits_summary, 'สรุปสวัสดิการพนักงานแบบเข้าใจง่าย'),
  core_values = COALESCE(core_values, '["#VIBES: CITY & LIFESTYLE — สะท้อนความเป็นไปของพื้นที่ ผ่านมุมมองที่ร่วมสมัยและมีชีวิตชีวา", "#SOUL: HUMAN & IDEA — ถ่ายทอดเรื่องราวลึกซึ้งของงานสร้างสรรค์ที่เต็มไปด้วยความรู้สึกและไอเดีย", "#JOINT: WORK & OPPORTUNITY — ผสานพรมแดนความคิดสร้างสรรค์เพื่อเปิดพื้นที่ให้โอกาสทางธุรกิจใหม่ ๆ"]'::jsonb),
  brand_colors = COALESCE(brand_colors, '[{"label": "Lime Yellow", "hex": "#D2FA00"}, {"label": "Orange", "hex": "#F4622A"}, {"label": "Purple", "hex": "#6B3FA0"}, {"label": "Blue", "hex": "#3EADD4"}, {"label": "Cream", "hex": "#F5F0E8"}, {"label": "Black", "hex": "#0D0D0D"}]'::jsonb),
  updated_at = now()
WHERE id = 1;

CREATE TABLE IF NOT EXISTS public.organization_chart_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  detail text NOT NULL DEFAULT '',
  group_key text NOT NULL CHECK (group_key IN ('leadership', 'core', 'specialist')),
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_chart_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read organization chart members" ON public.organization_chart_members;
CREATE POLICY "Authenticated users can read organization chart members"
ON public.organization_chart_members
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage organization chart members" ON public.organization_chart_members;
CREATE POLICY "Admins can manage organization chart members"
ON public.organization_chart_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.organization_chart_members (name, role, detail, group_key, sort_order)
VALUES
  ('ต้า (Tarmisi Wani)', 'Founding Partner & Creative Lead', 'ผู้มีอำนาจตัดสินใจหลักใน Operations, การเงิน และการจัดการทีม', 'leadership', 1),
  ('นครา', 'Business Strategy Advisor', 'ที่ปรึกษากลยุทธ์ธุรกิจและดูแลการลงทุน', 'leadership', 2),
  ('สุกรี', 'Funding Strategy Advisor', 'ที่ปรึกษากลยุทธ์ธุรกิจและจัดหาแหล่งทุน', 'leadership', 3),
  ('สุไมยนา หวังเบ็ญหมัด', 'Content Strategist & Client Coordinator', 'รับบรีฟ วางกลยุทธ์คอนเทนต์ และเขียนสคริปต์', 'core', 4),
  ('ฮาฟีซ ดอเลาะ', 'Videographer & Graphic Designer', 'ถ่ายทำ ตัดต่อ และดูแลอุปกรณ์', 'core', 5),
  ('Natdia Benyakat', 'Director / Visual Control', 'กำกับการถ่ายทำและดูแล Mood & Tone', 'specialist', 6),
  ('Faheem Yusoh', 'Videographer', 'Outsource Specialist', 'specialist', 7),
  ('zuhariya yato', 'Outsource', 'Outsource Specialist', 'specialist', 8)
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPGRADE ORG SYSTEM
-- • Adds new JSONB columns to company_info
-- • Creates organization_chart_members table (3-level hierarchy)
-- • Enables RLS: SELECT for authenticated, ALL for admin only
-- • Seeds dummy data for both tables
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add new columns to company_info
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.company_info
  ADD COLUMN IF NOT EXISTS history       TEXT,
  ADD COLUMN IF NOT EXISTS milestones    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resources     JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS benefits      JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_colors  JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────
-- 2. Create organization_chart_members table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_chart_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  position    TEXT        NOT NULL DEFAULT '',
  role_type   TEXT        NOT NULL DEFAULT 'core'
              CHECK (role_type IN ('leadership', 'core', 'specialist')),
  parent_id   UUID        REFERENCES public.organization_chart_members(id)
              ON DELETE SET NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.org_members_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON public.organization_chart_members;
CREATE TRIGGER trg_org_members_updated_at
  BEFORE UPDATE ON public.organization_chart_members
  FOR EACH ROW EXECUTE FUNCTION public.org_members_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. Enable RLS on both tables
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_chart_members ENABLE ROW LEVEL SECURITY;

-- Drop all pre-existing policies on company_info (idempotent)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_info'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_info', r.policyname);
  END LOOP;
END;
$$;

-- company_info: SELECT for any authenticated user
CREATE POLICY "company_info_select"
  ON public.company_info FOR SELECT
  TO authenticated
  USING (true);

-- company_info: INSERT / UPDATE / DELETE strictly for admins
CREATE POLICY "company_info_admin_write"
  ON public.company_info FOR ALL
  TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- org chart: SELECT for any authenticated user
CREATE POLICY "org_members_select"
  ON public.organization_chart_members FOR SELECT
  TO authenticated
  USING (true);

-- org chart: INSERT / UPDATE / DELETE strictly for admins
CREATE POLICY "org_members_admin_write"
  ON public.organization_chart_members FOR ALL
  TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 4. Seed / upsert company_info (id = 1)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.company_info (
  id, name, tagline, vision, mission, core_values,
  logo_url, contact_email,
  history, milestones, location_links, resources, benefits, brand_colors
) VALUES (
  1,
  'WatSUB! Studio (วาตซับ สตูดิโอ)',
  'A Space for Creative Connectivity',
  '"Connect. Create. Inspire." เปลี่ยนจากคนเล่าเรื่องสู่ Infrastructure จุดนัดพบระหว่างคนเก่ง ไอเดียดี และโอกาสธุรกิจ',
  'ทำหน้าที่เป็น Connector เชื่อมผู้คนเข้ากับเมือง ไอเดีย และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่จับต้องได้จริงในปัตตานี',
  '["#VIBES: CITY & LIFESTYLE", "#SOUL: HUMAN & IDEA", "#JOINT: WORK & OPPORTUNITY"]'::jsonb,
  null,
  'hello@watsub.com',
  'WatSUB! Studio ก่อตั้งเมื่อปี 2023 ด้วยความเชื่อที่ว่าปัตตานีมีศักยภาพสร้างงาน creative ระดับสากล เราไม่ได้แค่ผลิตคอนเทนต์ — เราสร้างพื้นที่ที่คนสร้างสรรค์เติบโตได้ จาก studio เล็กๆ สู่ creative production studio ที่ครบวงจร เราคือพื้นที่ที่เชื่อมโยงผู้คน ไอเดีย และโอกาส เข้าด้วยกันผ่านงานสร้างสรรค์ที่มีความหมายและทรงพลัง พร้อม connect คนเก่งในพื้นที่กับ brand ที่ต้องการ storytelling ที่ authentic',
  '["2023: ก่อตั้ง WatSUB! Studio", "2024: ขยายทีม production และ network ผู้เชี่ยวชาญ", "2025: วางระบบ partnership และสร้าง ecosystem คนสร้างสรรค์"]'::jsonb,
  '{"label": "จังหวัดปัตตานี", "map_url": "https://maps.app.goo.gl/pLauvKsc9JCAYAFv9"}'::jsonb,
  '[{"label": "Employee Handbook", "url": "https://drive.google.com/drive/folders/16740VA6PHLUjm6y6KnO_Un495OXHASXT?usp=drive_link"}, {"label": "Brand Assets", "url": "https://drive.google.com/drive/folders/1yNe-qPAMA6eppoJAIXfdOLJYlDo_phb5?usp=drive_link"}]'::jsonb,
  '["ค่าประกันสุขภาพกลุ่ม", "วันหยุดพักผ่อน 10 วันต่อปี", "โบนัสตามผลงาน", "ค่าอบรมพัฒนาตนเอง", "อุปกรณ์การทำงาน", "Partnership Agreement ลงวันที่ 8 ธันวาคม 2568"]'::jsonb,
  '{"primary": "#D2FA00", "secondary": "#F4622A", "accent": "#6B3FA0", "info": "#3EADD4", "light": "#F5F0E8", "dark": "#0D0D0D"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  history        = EXCLUDED.history,
  milestones     = EXCLUDED.milestones,
  location_links = EXCLUDED.location_links,
  resources      = EXCLUDED.resources,
  benefits       = EXCLUDED.benefits,
  brand_colors   = EXCLUDED.brand_colors;

-- ─────────────────────────────────────────────────────────────
-- 5. Seed organization_chart_members (3-level hierarchy)
-- ─────────────────────────────────────────────────────────────

-- Level 1 – Root (Founding Partner)
INSERT INTO public.organization_chart_members (id, name, position, role_type, parent_id, avatar_url)
VALUES (
  '00000000-0000-0000-0001-000000000001',
  'ต้า (Tarmisi Wani)',
  'Founding Partner & Creative Lead',
  'leadership',
  NULL, NULL
) ON CONFLICT (id) DO NOTHING;

-- Level 2 – Reports to ต้า
INSERT INTO public.organization_chart_members (id, name, position, role_type, parent_id, avatar_url)
VALUES
  ('00000000-0000-0000-0002-000000000001', 'นครา',                   'Business Strategy Advisor',              'leadership', '00000000-0000-0000-0001-000000000001', NULL),
  ('00000000-0000-0000-0002-000000000002', 'สุกรี',                  'Funding Strategy Advisor',               'leadership', '00000000-0000-0000-0001-000000000001', NULL),
  ('00000000-0000-0000-0002-000000000003', 'สุไมยนา หวังเบ็ญหมัด',  'Content Strategist & Client Coordinator','core',       '00000000-0000-0000-0001-000000000001', NULL),
  ('00000000-0000-0000-0002-000000000004', 'ฮาฟีซ ดอเลาะ',          'Videographer & Graphic Designer',        'core',       '00000000-0000-0000-0001-000000000001', NULL)
ON CONFLICT (id) DO NOTHING;

-- Level 3 – Specialists
INSERT INTO public.organization_chart_members (id, name, position, role_type, parent_id, avatar_url)
VALUES
  ('00000000-0000-0000-0003-000000000001', 'Natdia Benyakat', 'Director / Visual Control', 'specialist', '00000000-0000-0000-0002-000000000004', NULL),
  ('00000000-0000-0000-0003-000000000002', 'Faheem Yusoh',    'Videographer',              'specialist', '00000000-0000-0000-0002-000000000004', NULL),
  ('00000000-0000-0000-0003-000000000003', 'zuhariya yato',   'Outsource Specialist',      'specialist', '00000000-0000-0000-0002-000000000003', NULL)
ON CONFLICT (id) DO NOTHING;

-- Auto-assign kpi_role from employee role/type when possible
CREATE OR REPLACE FUNCTION public.sync_employee_kpi_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kpi_role IS NULL OR btrim(NEW.kpi_role) = '' THEN
    IF lower(coalesce(NEW.type, '')) = 'outsource' OR lower(coalesce(NEW.role, '')) LIKE '%outsource%' THEN
      NEW.kpi_role := 'outsource';
    ELSIF lower(coalesce(NEW.role, '')) LIKE '%director%' THEN
      NEW.kpi_role := 'director';
    ELSIF lower(coalesce(NEW.role, '')) LIKE '%production%' THEN
      NEW.kpi_role := 'production';
    ELSIF lower(coalesce(NEW.role, '')) LIKE '%strategy%' THEN
      NEW.kpi_role := 'strategy';
    END IF;
  END IF;

  IF NEW.type IS NULL OR btrim(NEW.type) = '' THEN
    IF NEW.kpi_role = 'outsource' THEN NEW.type := 'outsource';
    ELSE NEW.type := 'fulltime';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_employee_kpi_role ON public.employees;
CREATE TRIGGER tr_sync_employee_kpi_role
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_kpi_role();

-- Seed exact outsource templates from March 2026 requirements
DELETE FROM public.kpi_question_templates WHERE role = 'outsource';

INSERT INTO public.kpi_question_templates
  (role, reviewer_type, section_id, section_title, section_weight, question_text, question_type, auto_source, order_index)
VALUES
  -- SELF: Job Performance (45%)
  ('outsource','self','job_performance','Job Performance','45%','ส่งงานตรงตาม deadline ที่ตกลงกัน','auto','on_time_rate',10),
  ('outsource','self','job_performance','Job Performance','45%','จำนวน revision หลังส่งงาน','auto','avg_revision',20),
  ('outsource','self','job_performance','Job Performance','45%','งานตรงตาม brief ที่ได้รับ','rate',NULL,30),
  ('outsource','self','job_performance','Job Performance','45%','ความรับผิดชอบต่อไฟล์งานและ asset','rate',NULL,40),

  -- SELF: Competency (40%)
  ('outsource','self','competency','Competency','40%','ทักษะเฉพาะทางที่ได้รับมอบหมาย','rate',NULL,50),
  ('outsource','self','competency','Competency','40%','แก้ปัญหาได้โดยไม่ต้องรอให้ทีมช่วย','rate',NULL,60),
  ('outsource','self','competency','Competency','40%','สื่อสารเมื่อมีปัญหาหรือต้องการ clarify','rate',NULL,70),
  ('outsource','self','competency','Competency','40%','คุณภาพงานเทียบกับมาตรฐานที่ตกลงไว้','rate',NULL,80),
  ('outsource','self','competency','Competency','40%','สิ่งที่พัฒนาหรือเรียนรู้จากโปรเจกต์นี้','text',NULL,90),

  -- SELF: Collaboration (15%)
  ('outsource','self','collaboration','Collaboration','15%','ทำงานร่วมกับทีม WatSUB! ได้ราบรื่น','rate',NULL,100),
  ('outsource','self','collaboration','Collaboration','15%','ตอบสนองต่อ feedback ได้เร็วและตรงประเด็น','rate',NULL,110),
  ('outsource','self','collaboration','Collaboration','15%','ผลงานที่ภูมิใจสุดในรอบนี้ (ลิงก์หรืออธิบาย)','text',NULL,120),

  -- PEER: Collaboration
  ('outsource','peer','collaboration','Collaboration','peer','ส่งงานตรงเวลาที่ตกลง','rate',NULL,130),
  ('outsource','peer','collaboration','Collaboration','peer','งานตรง brief ไม่ต้องอธิบายซ้ำ','rate',NULL,140),
  ('outsource','peer','collaboration','Collaboration','peer','สื่อสารและตอบกลับได้ทันเวลา','rate',NULL,150),
  ('outsource','peer','collaboration','Collaboration','peer','รับ feedback และปรับงานได้ดี','rate',NULL,160),
  ('outsource','peer','collaboration','Collaboration','peer','สิ่งที่ทำได้ดีในโปรเจกต์นี้','text',NULL,170),
  ('outsource','peer','collaboration','Collaboration','peer','สิ่งที่ควรปรับสำหรับโปรเจกต์ถัดไป','text',NULL,180),

  -- SUPERVISOR: Auto Data
  ('outsource','supervisor','auto_data','Auto Data','read-only','Task done ก่อน deadline %','auto','on_time_rate',190),
  ('outsource','supervisor','auto_data','Auto Data','read-only','Revision count รวม','auto','avg_revision',200),
  ('outsource','supervisor','auto_data','Auto Data','read-only','จำนวน project ที่ร่วมในรอบ','auto','closed_projects',210),

  -- SUPERVISOR: Job Performance (45%)
  ('outsource','supervisor','job_performance','Job Performance','45%','คุณภาพงานโดยรวมเทียบ brief','rate',NULL,220),
  ('outsource','supervisor','job_performance','Job Performance','45%','ความรับผิดชอบและ reliability','rate',NULL,230),
  ('outsource','supervisor','job_performance','Job Performance','45%','ส่งงานตรงเวลา','rate',NULL,240),

  -- SUPERVISOR: Competency (40%)
  ('outsource','supervisor','competency','Competency','40%','ทักษะเฉพาะทางในงานที่ได้รับ','rate',NULL,250),
  ('outsource','supervisor','competency','Competency','40%','พัฒนาจากโปรเจกต์ที่แล้ว','rate',NULL,260),

  -- SUPERVISOR: Collaboration (15%)
  ('outsource','supervisor','collaboration','Collaboration','15%','ทำงานกับทีมได้ smooth','rate',NULL,270),
  ('outsource','supervisor','collaboration','Collaboration','15%','อยากทำงานด้วยในโปรเจกต์ถัดไป','rate',NULL,280),
  ('outsource','supervisor','collaboration','Collaboration','15%','เป้าหมายหรือ feedback สำหรับโปรเจกต์ถัดไป','text',NULL,290);

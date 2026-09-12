-- Enrich Organization Wiki from the curated Obsidian vault.
-- Sources: WatSUB! Studio entity, Brand Guidelines 2026, Team SOP,
-- Drive Architecture, Content Pillars, Creative Operating System.
-- Auto-seeded canonical pages are refreshed only while author_id is NULL.

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Organization Vision',
  'organization-vision',
  $wiki$# Vision

**Connect. Create. Inspire.**

WatSUB! Studio มุ่งเปลี่ยนจากผู้เล่าเรื่องและ Production House ไปสู่ **Creative Infrastructure** ของปัตตานี: จุดนัดพบระหว่างคนเก่ง ไอเดียดี เมือง และโอกาสทางธุรกิจ

เป้าหมายคือการทำหน้าที่เป็น **Connector** เชื่อมคนท้องถิ่นกับเครือข่าย ความรู้ เทคโนโลยี และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่จับต้องได้จริงและเติบโตไปพร้อมกับเมือง

Source: Obsidian Vault — `wiki/entities/WatSUB! Studio.md`, `wiki/synthesis/WatSUB Studio Operational Blueprint.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  updated_at = now()
WHERE public.wiki_pages.author_id IS NULL;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Organization Mission',
  'organization-mission',
  $wiki$# Mission

WatSUB! Studio ทำงานผ่าน 3 แกนหลักของ Studio DNA:

- **CONNECT** — เชื่อมผู้คน เมือง วิถีชีวิต วัฒนธรรมท้องถิ่น และโอกาสเข้าด้วยกัน
- **CREATE** — สร้างงานภาพ วิดีโอ คอนเทนต์ และระบบสร้างสรรค์ที่มีคุณภาพและใช้งานได้จริง
- **INSPIRE** — ส่งต่อคุณค่า ความรู้ และแรงบันดาลใจ เพื่อขับเคลื่อนชุมชนและเศรษฐกิจสร้างสรรค์

การทำงานของสตูดิโอจึงไม่หยุดที่การผลิตสื่อ แต่รวมถึงการสร้างพื้นที่ ความรู้ เครื่องมือ และระบบที่ช่วยให้คนสร้างสรรค์ทำงานร่วมกันได้ดีขึ้น

Source: Obsidian Vault — `raw/WatSUB_Brand_Guidelines_and_Content_Pillars_2026.md`, `wiki/synthesis/WatSUB Creative Operating System.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content,
  category = EXCLUDED.category, updated_at = now()
WHERE public.wiki_pages.author_id IS NULL;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Organization History',
  'organization-history',
  $wiki$# WatSUB! Studio — History

WatSUB! Studio ก่อตั้งในปี **2023** ที่จังหวัดปัตตานี ภายใต้แนวคิด **A Space for Creative Connectivity**

จุดเริ่มต้นคือ creative production studio ที่ทำงานภาพ วิดีโอ งานออกแบบ และการเล่าเรื่องของผู้คนและเมือง ก่อนค่อย ๆ ขยายบทบาทไปสู่การสร้างเครือข่ายครีเอทีฟ ระบบการทำงานภายใน คลังความรู้ และซอฟต์แวร์ที่พัฒนาขึ้นใช้เอง

ทิศทางปัจจุบันคือการเติบโตจาก **Storyteller → Creative Infrastructure → Creative & Technical Engine** ที่เชื่อมวัฒนธรรมท้องถิ่น งานโปรดักชัน AI และวิศวกรรมซอฟต์แวร์เข้าด้วยกัน

ฐานของงานทั้งหมดอยู่ที่ปัตตานี และให้ความสำคัญกับเรื่องจริง ผู้คนจริง และการสร้างโอกาสที่เกิดผลในพื้นที่

Source: Obsidian Vault — `wiki/entities/WatSUB! Studio.md`, `wiki/synthesis/WatSUB Creative Operating System.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content,
  category = EXCLUDED.category, updated_at = now()
WHERE public.wiki_pages.author_id IS NULL;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'WatSUB Studio Overview',
  'organization-studio-overview',
  $wiki$# WatSUB! Studio Overview

**WatSUB! Studio** คือ Creative Production & Media Studio ในจังหวัดปัตตานี ก่อตั้งในปี 2023 ภายใต้ tagline **A Space for Creative Connectivity**

## สิ่งที่เราเป็น
- Creative Production Studio สำหรับงานภาพ วิดีโอ ออกแบบ และคอนเทนต์
- Connector ระหว่างคนสร้างสรรค์ เมือง พาร์ทเนอร์ และโอกาสทางธุรกิจ
- Knowledge-driven studio ที่แปลงประสบการณ์จริงเป็น SOP, framework และคลังความรู้
- Creative & Technical Engine ที่ใช้ AI และซอฟต์แวร์ภายในเพื่อเพิ่มความสามารถของทีม

## หลักคิด
**CONNECT • CREATE • INSPIRE**

เราเชื่อว่าสตูดิโอที่ดีไม่ใช่แค่ส่งงานให้เสร็จ แต่ต้องทำให้คน ไอเดีย และระบบเติบโตไปด้วยกัน

Source: Obsidian Vault — `wiki/entities/WatSUB! Studio.md`, `wiki/synthesis/WatSUB Creative Operating System.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Brand DNA & Visual System 2026',
  'organization-brand-dna-2026',
  $wiki$# Brand DNA & Visual System 2026

## Brand Purpose
WatSUB! คือ **CONNECTOR** ที่อยู่ตรงกลางเพื่อทำให้เกิดการเปลี่ยนแปลง เชื่อมผู้คน เมือง ไอเดีย และโอกาสเข้าด้วยกัน

## Studio DNA
**CONNECT • CREATE • INSPIRE**

## Tone of Voice
- **RAW** — ตรงไปตรงมา อิงเรื่องจริงและประสบการณ์จริง
- **BOLD** — กล้าลอง กล้าแสดงออก มีเอกลักษณ์
- **WARM** — อบอุ่น เป็นกันเอง และเข้าถึงได้
- **LOCAL** — ฝังรากในบริบทปัตตานีและชายแดนใต้

## Brand Colors
- Lime Yellow `#D2FA00` — Primary Energy
- Orange `#F4622A` — Action
- Purple `#6B3FA0` — Depth
- Blue `#3EADD4` — Clarity / Pattani River
- Cream `#F5F0E8` — Warm Background
- Dark `#0D0D0D` — Core Dark

Source: Obsidian Vault — `raw/WatSUB_Brand_Guidelines_and_Content_Pillars_2026.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Content Pillars 2026',
  'organization-content-pillars-2026',
  $wiki$# Content Pillars 2026

## #VIBES — City & Lifestyle
เชื่อมผู้คนเข้ากับเมืองและไลฟ์สไตล์ร่วมสมัย สร้าง awareness และ engagement ผ่านบรรยากาศ คาเฟ่ แฟชั่น เมือง และกิจกรรมในพื้นที่

Series ตัวอย่าง: `COLOR WALK`, `MOOD`, `Wat Life?`

## #SOUL — Human & Idea
เชื่อมผู้คนเข้ากับความคิด เรื่องราวเบื้องหลัง อัตลักษณ์ท้องถิ่น และคนสร้างสรรค์ เพื่อสร้าง deep affinity และความน่าเชื่อถือ

Series ตัวอย่าง: `RAW GEN`, `Wat Write`, `SGNC`

## #JOINT — Work & Opportunity
เชื่อมผู้คนเข้ากับงาน พาร์ทเนอร์ และโอกาสทางธุรกิจ แปลง creative collaboration ให้เป็นโปรเจกต์จริง รายได้ และเครือข่าย

Series ตัวอย่าง: `COOL SUB`, `WORK WOK`, `LiVE SUB`

ทุกคอนเทนต์ของ WatSUB ควรระบุให้ชัดว่ากำลังทำหน้าที่ใน Pillar ใด เพื่อให้ภาพรวมแบรนด์และระบบจัดเก็บไฟล์ไปในทิศทางเดียวกัน

Source: Obsidian Vault — `wiki/concepts/WatSUB Content Pillars.md`, `raw/WatSUB_Brand_Guidelines_and_Content_Pillars_2026.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Team Operating Rhythm',
  'organization-team-operating-rhythm',
  $wiki$# Team Operating Rhythm

## เข้างาน
- เช็ก Project Board / Dashboard และ deadline ของตัวเอง
- แจ้งใน group chat 1–3 บรรทัดว่าวันนี้จะโฟกัสอะไร
- ถ้ามีงาน Client ด่วน ให้แจ้งผู้ดูแลทันที

## ระหว่างวัน
- ทำ Deep Work ตามงานที่รับผิดชอบ
- ติดปัญหาให้แจ้งทันที ไม่รอถึงปิดวัน
- ช่วง 14:00–15:00 ใช้เป็น short sync เมื่อมีเรื่องที่ต้องคุย ไม่บังคับทุกวัน

## ปิดวัน
- อัปเดตสถานะงานใน Project Web: เสร็จ / กำลังทำ / ติดปัญหา
- แจ้งทีมว่าวันนี้จบอะไรและพรุ่งนี้จะต่ออะไร
- งานส่งลูกค้าต้องผ่านการตรวจอนุมัติก่อนส่ง

## กติกาพื้นฐาน
1. งานที่มอบหมายแล้วเริ่มได้ ไม่ต้องรออนุมัติทุกขั้น
2. ติดปัญหา = แจ้งทันที
3. งาน Client มาก่อนเมื่อ deadline ชนกับ Content
4. Sync สั้น ตรงประเด็น ไม่เกิน 20 นาที
5. ไฟล์ที่ตั้งชื่อผิด convention ต้องแก้ก่อนตรวจ

Source: Obsidian Vault — `raw/ops_internal/WatSUB_Daily_Flow_SOP.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'Drive & File Standard',
  'organization-drive-file-standard',
  $wiki$# Drive & File Standard

WatSUB Drive แบ่งพื้นที่หลักเป็น `#VIBES`, `#SOUL`, `#JOINT`, `CLIENT WORK` และ `_OPS — Internal` เพื่อให้โครงสร้างไฟล์สะท้อนโครงสร้างงานจริง

## Naming Convention
Content:
`YYYYMMDD_[PILLAR]_[PROJECT]_[DETAIL]`

Client Work:
`YYYYMMDD_[CLIENT]_[WORK]`

## Project Folder Standard
- `01_Brief/` — Brief, Script, Moodboard, Storyboard, Research
- `02_Production/RAW/` — ไฟล์ต้นฉบับ ห้ามลบหรือแก้
- `02_Production/EDIT/` — Project files และพื้นที่ทำงานของ editor
- `03_Post-Production/` — Final export, subtitle, thumbnail และไฟล์ที่อนุมัติแล้ว

หลักสำคัญคือทีมต้องหาไฟล์เจอได้โดยไม่ต้องถาม และ RAW ต้องรักษาเป็น source of truth ของงานโปรดักชัน

Source: Obsidian Vault — `wiki/concepts/WatSUB Drive & Folder Architecture.md`, `wiki/summaries/WatSUB Team Handbook & Drive SOP Summary.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.wiki_pages (title, slug, content, category, author_id, is_published)
VALUES (
  'WatSUB Digital Operating System',
  'organization-digital-operating-system',
  $wiki$# WatSUB Digital Operating System

WatSUB ใช้ระบบดิจิทัลเป็นส่วนหนึ่งของการทำงานประจำวัน ไม่ใช่แค่เครื่องมือเสริม โดยเชื่อม Project Management, Wiki, Calendar, Workload, KPI และ Audit Trail เข้าไว้ใน Studio OS เดียว

## Core Modules
- Dashboard & Analytics — ภาพรวมงานและสถานะสตูดิโอ
- Projects & Tasks — จัดการงานตาม deadline และ content pillar
- Customers — ติดตามข้อมูลลูกค้าและงานเชิงพาณิชย์
- Calendar — รวม deadline, meeting, on-site, leave และ project milestone
- Workload — ดูภาระงานและการกระจายทรัพยากร
- Organization — โครงสร้างทีมและ Company Knowledge
- Wiki — คลังความรู้ คู่มือ และมาตรฐานภายใน
- Audit Timeline — ติดตามว่าใครแก้อะไร เมื่อไหร่

## Technology
React, TypeScript, Tailwind, Vite, Supabase และ PostgreSQL เป็นแกนของระบบ พร้อมแนวทาง RLS, audit logging และ semantic knowledge retrieval

เป้าหมายคือให้ความรู้ การปฏิบัติงาน และข้อมูลโครงการอยู่ในระบบที่ค้นหาได้ ใช้ซ้ำได้ และช่วยลดการเริ่มงานจากศูนย์

Source: Obsidian Vault — `wiki/concepts/WatSUB Digital Operating Infrastructure.md`, `wiki/synthesis/WatSUB Creative Operating System.md`.$wiki$,
  'Organization', NULL, true
)
ON CONFLICT (slug) DO NOTHING;
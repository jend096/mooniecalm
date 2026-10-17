-- =====================================================================
-- เพิ่มคอลัมน์เก็บหลักฐานความยินยอมเก็บข้อมูลสุขภาพ (user_profiles)
-- วิธีใช้: Supabase > SQL Editor > วางทั้งไฟล์ > Run  (ต้องรันก่อนทดสอบสมัครผู้ใช้ใหม่)
-- เพิ่มคอลัมน์ใหม่อย่างเดียว ไม่แตะข้อมูลเดิม รันซ้ำได้ (if not exists)
-- =====================================================================
alter table public.user_profiles
  add column if not exists consent_health_at timestamptz, -- เวลาที่ผู้ใช้กดยินยอม
  add column if not exists consent_version text;          -- ฉบับข้อความที่เห็นตอนกด (ตรงกับ CONSENT_VERSION ใน app/utils/consent.ts)

comment on column public.user_profiles.consent_health_at is 'เวลาที่ผู้ใช้ยินยอมให้เก็บข้อมูลสุขภาพ';
comment on column public.user_profiles.consent_version is 'ฉบับข้อความขอความยินยอมที่ผู้ใช้เห็นตอนกดยินยอม';

-- ตรวจผล (ไม่บังคับ)
-- select id, email, consent_health_at, consent_version from public.user_profiles order by id desc limit 10;

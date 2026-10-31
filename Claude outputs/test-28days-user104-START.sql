-- ====================================================================
-- MoonieCalm — ทดสอบหน้า "ครบ 28 วัน รับผลเป้าหมาย" ด้วยบัญชีทดลอง (user_profiles.id = 104)
-- ไฟล์นี้ = ตัวเริ่มทดสอบ (สำรองของเดิมก่อน แล้วค่อยปรับเวลา)  /  ตัวคืนค่าเดิม = test-28days-user104-RESTORE.sql
--
-- วิธีใช้: คัดลอกทั้งไฟล์ไปวางใน Supabase SQL Editor แล้วกด RUN  (รันซ้ำได้ ไม่ทับข้อมูลสำรองเดิม)
-- แล้วเปิดแอปด้วยบัญชีนี้ ไปที่หน้าเช็คอิน -> จะเจอการ์ด "รับผลรอบนี้" แทนฟอร์มปกติ
--
-- ผลที่ตั้งใจให้เกิด (ให้บางข้อไม่สำเร็จ ตามที่ขอ):
--   ปรับเวลานอน         นอนตรงเวลา 24 วัน จาก 28  (เกณฑ์ 20)  -> ผ่าน  (ตาตอนนี้ eye_exhausted -> เมื่อกดรับผลจะอัปเป็น eye_sleepy)
--   ออกกำลังกาย         ทำ 14 วัน จาก 28          (เกณฑ์ 13)  -> ผ่าน  (หูตอนนี้ ear_half_droop -> เมื่อกดรับผลจะอัปเป็น ear_erect)
--   ลดของหวาน          ทำ 10 วัน จาก 28          (เกณฑ์ 20)  -> ไม่ผ่าน  (สีตัวตอนนี้ body_pink สูงสุดอยู่แล้ว)
--   ลดน้ำเย็น           ทำ 14 วัน จาก 28          (เกณฑ์ 20)  -> ไม่ผ่าน  (fx ตอนนี้ fx_sweat_nose จะคงเดิม)
-- อยากเปลี่ยนจำนวนวันที่ทำได้ แก้เงื่อนไขในส่วน "ขั้นที่ 3" ด้านล่าง (d คือวันที่ 0-27 ของรอบ)
-- ====================================================================


-- ขั้นที่ 1: สร้างที่เก็บข้อมูลสำรอง (เปิด RLS ไว้ ไม่มี policy = แอปเข้าไม่ถึง เห็นได้เฉพาะตอนรันใน SQL Editor)
CREATE TABLE IF NOT EXISTS public.test_backup_user104 (
    kind TEXT PRIMARY KEY,                     -- ชื่อชุดข้อมูลที่สำรอง
    payload JSONB NOT NULL,                    -- ข้อมูลเดิมทั้งหมดของไอดี 104 เก็บเป็น JSON
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.test_backup_user104 ENABLE ROW LEVEL SECURITY;


-- ขั้นที่ 2: สำรองของเดิม (ถ้ามีข้อมูลสำรองอยู่แล้ว = เคยรันไปแล้ว จะไม่สำรองซ้ำ กันเอาค่าทดสอบไปทับค่าจริง)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.test_backup_user104) THEN
        RAISE NOTICE 'มีข้อมูลสำรองอยู่แล้ว ข้ามขั้นสำรอง (ของเดิมปลอดภัย)';
    ELSE
        INSERT INTO public.test_backup_user104 (kind, payload) VALUES
            ('goal_cycles',       COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.goal_cycles t WHERE t.user_id = 104), '[]'::jsonb)),
            ('daily_checkins',    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.daily_checkins t WHERE t.user_id = 104), '[]'::jsonb)),
            ('user_avatar_state', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.user_avatar_state t WHERE t.user_id = 104), '[]'::jsonb)),
            ('user_goals',        COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.user_goals t WHERE t.user_id = 104), '[]'::jsonb));
        RAISE NOTICE 'สำรองข้อมูลเดิมของไอดี 104 เรียบร้อย';
    END IF;
END $$;


-- ขั้นที่ 3: ปรับเวลา + ใส่เช็คอินย้อนหลังให้ครบ 28 วัน
DO $$
DECLARE
    -- วันนี้ตามเวลาไทย (แอปใช้วันตามเครื่องผู้ใช้ ไม่ใช่เวลา UTC ของเซิร์ฟเวอร์)
    today_th DATE := (NOW() AT TIME ZONE 'Asia/Bangkok')::date;
BEGIN
    -- 3.1 ย้ายรอบเป้าหมายให้เริ่มเมื่อ 28 วันก่อน จบเมื่อวาน -> วันนี้ > วันสุดท้าย = "ครบแล้ว รอรับผล"
    UPDATE public.goal_cycles
       SET cycle_start_date = today_th - 28,
           cycle_end_date   = today_th - 1,
           claimed_at       = NULL,
           avatar_upgraded  = false
     WHERE user_id = 104;

    -- 3.2 เปิดเป้าหมายครบทั้ง 4 ข้อ (การ์ดรับผลโชว์เฉพาะเป้าหมายที่เปิดอยู่)
    UPDATE public.user_goals SET is_active = true WHERE user_id = 104;

    -- 3.3 ล้างเช็คอินเดิมของไอดี 104 (สำรองไว้แล้วในขั้นที่ 2) แล้วใส่ 28 วันใหม่ในช่วงรอบ
    DELETE FROM public.daily_checkins WHERE user_id = 104;

    INSERT INTO public.daily_checkins (user_id, checkin_date, slept_on_time, exercised, avoided_sugar, avoided_cold_drinks)
    SELECT 104,
           today_th - 28 + d,
           (d % 7) <> 5,   -- นอนตรงเวลา: พลาดทุกวันที่ 6 ของสัปดาห์ = ทำได้ 24 วัน  (ผ่าน)
           (d % 2) = 0,    -- ออกกำลังกาย: วันเว้นวัน = 14 วัน                       (ผ่าน)
           (d % 3) = 0,    -- ลดของหวาน: ทุก 3 วัน = 10 วัน                          (ไม่ผ่าน)
           (d % 2) = 0     -- ลดน้ำเย็น: วันเว้นวัน = 14 วัน                         (ไม่ผ่าน)
      FROM generate_series(0, 27) AS d;

    -- (เวอร์ชันนี้ไม่แตะ user_avatar_state แล้ว: อวตารก่อนกดรับผลเป็นของจริงของไอดี 104 ตามที่เห็นอยู่)
    -- ข้อที่ผ่านและชิ้นนั้นยังไม่สูงสุด (ตา, หู) จึงจะเห็นอวตารเปลี่ยนตอนกดรับผล
END $$;


-- ขั้นที่ 4: ตรวจผล (ควรได้ 4 ช่องดังนี้ sleep=24, exercise=14, sugar=10, cold=14 และ days_logged=28)
SELECT cycle_start_date, cycle_end_date, claimed_at, days_logged,
       sleep_days_achieved, exercise_days_achieved, sugar_days_achieved, cold_drink_days_achieved
  FROM public.goal_cycle_progress
 WHERE user_id = 104;

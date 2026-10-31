-- ====================================================================
-- MoonieCalm — คืนค่าเดิมของไอดี 95 หลังทดสอบหน้า "ครบ 28 วัน" เสร็จ
-- ใช้คู่กับ test-28days-user95-START.sql (ไฟล์นั้นสำรองของเดิมไว้ในตาราง test_backup_user95)
--
-- วิธีใช้: คัดลอกทั้งไฟล์ไปวางใน Supabase SQL Editor แล้วกด RUN
-- คืนครบทุกอย่างที่ START แตะต้อง และที่การกด "รับผล" ในแอปแก้ไป คือ
--   goal_cycles (รวมลบรอบใหม่ที่เกิดจากการกดรับผล), daily_checkins, user_avatar_state, user_goals
-- ถ้ายังไม่เคยรัน START (ไม่มีข้อมูลสำรอง) ไฟล์นี้จะหยุดพร้อมแจ้ง ไม่แก้อะไร
-- ====================================================================

DO $$
DECLARE
    has_backup BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.test_backup_user95) INTO has_backup;
    IF NOT has_backup THEN
        RAISE EXCEPTION 'ไม่พบข้อมูลสำรอง (ยังไม่เคยรัน START หรือคืนค่าไปแล้ว) จึงไม่แก้อะไรเลย';
    END IF;

    -- รอบเป้าหมาย: ลบทุกแถวของ 95 (รวมรอบใหม่ที่เกิดจากการกดรับผล) แล้วใส่ของเดิมกลับ (id เดิมเหมือนเดิม)
    DELETE FROM public.goal_cycles WHERE user_id = 95;
    INSERT INTO public.goal_cycles
        SELECT * FROM jsonb_populate_recordset(NULL::public.goal_cycles,
            (SELECT payload FROM public.test_backup_user95 WHERE kind = 'goal_cycles'));

    -- เช็คอินรายวัน
    DELETE FROM public.daily_checkins WHERE user_id = 95;
    INSERT INTO public.daily_checkins
        SELECT * FROM jsonb_populate_recordset(NULL::public.daily_checkins,
            (SELECT payload FROM public.test_backup_user95 WHERE kind = 'daily_checkins'));

    -- ชิ้นส่วนอวตาร
    DELETE FROM public.user_avatar_state WHERE user_id = 95;
    INSERT INTO public.user_avatar_state
        SELECT * FROM jsonb_populate_recordset(NULL::public.user_avatar_state,
            (SELECT payload FROM public.test_backup_user95 WHERE kind = 'user_avatar_state'));

    -- เป้าหมายที่เปิดอยู่
    DELETE FROM public.user_goals WHERE user_id = 95;
    INSERT INTO public.user_goals
        SELECT * FROM jsonb_populate_recordset(NULL::public.user_goals,
            (SELECT payload FROM public.test_backup_user95 WHERE kind = 'user_goals'));

    -- คืนเสร็จแล้ว ลบข้อมูลสำรองทิ้ง (รัน START รอบหน้าจะสำรองของ "ปัจจุบัน" ใหม่อีกที)
    DELETE FROM public.test_backup_user95;
    RAISE NOTICE 'คืนค่าเดิมของไอดี 95 เรียบร้อย';
END $$;

-- ตรวจผล: ควรกลับมาเป็นรอบเดิม (เริ่ม 2026-10-23 จบ 2026-11-19) และเช็คอินเดิมของไอดี 95
SELECT gc.id, gc.cycle_start_date, gc.cycle_end_date, gc.claimed_at,
       (SELECT COUNT(*) FROM public.daily_checkins d WHERE d.user_id = 95) AS checkins
  FROM public.goal_cycles gc
 WHERE gc.user_id = 95;

-- (ไม่บังคับ) อยากลบตารางสำรองทิ้งถาวรหลังเลิกทดสอบ ให้เอาเครื่องหมาย -- หน้าบรรทัดนี้ออก:
-- DROP TABLE IF EXISTS public.test_backup_user95;

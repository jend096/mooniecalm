-- ===== body-logs-table.sql =====
-- แยกข้อมูลหน้า "บันทึกอาการเพิ่มเติม" ออกจาก daily_checkins ไปอยู่ตารางของตัวเอง: daily_body_logs
-- (อาการที่เลือกได้หลายอันอยู่ใน symptom_logs อยู่แล้ว ไม่ต้องย้าย)
--
-- ลำดับการรัน (รันใน Supabase SQL Editor ทีละส่วน ตามลำดับ):
--   ส่วน 1  สร้างตารางใหม่ + กฎความปลอดภัย + สิทธิ์          (เพิ่มอย่างเดียว ปลอดภัย)
--   ส่วน 2  แก้ VIEW period_cycle_progress ให้อ่านยาจากตารางใหม่ (ต้องทำก่อนส่วน 3 ไม่งั้นลบคอลัมน์ไม่ได้)
--   -- แล้วลองกดในหน้า /symptoms ว่าบันทึกได้ (ต้องรีเฟรชหน้าเว็บหลังแก้โค้ด) --
--   ส่วน 3  ลบคอลัมน์เก่าใน daily_checkins                    (ลบถาวร! ตรวจแล้วว่าตอนนี้ไม่มีข้อมูลในคอลัมน์เหล่านี้)

-- ####################################################################
-- ส่วน 1: ตารางใหม่ daily_body_logs (1 แถวต่อวันต่อคน)
-- ####################################################################
CREATE TABLE IF NOT EXISTS public.daily_body_logs (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          integer NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    log_date         date    NOT NULL,                       -- วันที่ของบันทึก (ใช้จัดเข้ารอบประจำเดือนตอนสรุป)
    flow_amount      varchar(20) CHECK (flow_amount IN ('light', 'medium', 'heavy')), -- ปริมาณเลือด
    flow_color       varchar(30),                            -- สีเลือดประจำเดือน
    discharge_color  varchar(30),                            -- สีตกขาว
    mood             varchar(20),                            -- อารมณ์วันนี้
    medication_count integer NOT NULL DEFAULT 0 CHECK (medication_count >= 0), -- ยาแก้ปวดที่กิน (จำนวนเม็ด)
    notes            text CHECK (char_length(notes) <= 500), -- ข้อความบันทึก
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, log_date)
);

-- เห็นและแก้ได้เฉพาะของตัวเอง (แบบเดียวกับตารางอื่น)
ALTER TABLE public.daily_body_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access daily_body_logs" ON public.daily_body_logs;
CREATE POLICY "Owner access daily_body_logs" ON public.daily_body_logs
    FOR ALL
    USING (public.is_own_profile(user_id))
    WITH CHECK (public.is_own_profile(user_id));

-- สิทธิ์ระดับตาราง (ตารางอื่นให้ authenticated แบบนี้เหมือนกัน)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_body_logs TO authenticated;

-- ####################################################################
-- ส่วน 2: VIEW period_cycle_progress เดิมอ่านยาจาก daily_checkins.medication_count
-- แก้ให้อ่านจาก daily_body_logs แทน (ชื่อคอลัมน์ ลำดับ และ security_invoker เหมือนเดิมทุกอย่าง)
-- ####################################################################
CREATE OR REPLACE VIEW public.period_cycle_progress WITH (security_invoker = true) AS
SELECT
    uc.user_id,
    uc.cycle_start_date,
    uc.next_cycle_start_date,
    (uc.next_cycle_start_date - uc.cycle_start_date) AS cycle_length_days,
    count(*) AS days_logged,
    round(avg(dc.pain_level), 1) AS avg_pain_level,
    -- ยา: เปลี่ยนมานับจาก daily_body_logs (ในช่วงรอบเดียวกัน)
    ( SELECT count(*) FILTER (WHERE bl.medication_count > 0)
        FROM public.daily_body_logs bl
       WHERE bl.user_id = uc.user_id
         AND bl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR bl.log_date < uc.next_cycle_start_date) ) AS medication_days,
    ( SELECT sum(bl.medication_count)
        FROM public.daily_body_logs bl
       WHERE bl.user_id = uc.user_id
         AND bl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR bl.log_date < uc.next_cycle_start_date) ) AS medication_pills_total,
    ( SELECT count(DISTINCT sl.log_date) FROM public.snack_logs sl
       WHERE sl.user_id = uc.user_id AND sl.eaten_at IS NOT NULL AND sl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR sl.log_date < uc.next_cycle_start_date) ) AS snack_used_days,
    ( SELECT count(DISTINCT sl.log_date) FROM public.snack_logs sl
       WHERE sl.user_id = uc.user_id AND sl.felt_better IS NOT NULL AND sl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR sl.log_date < uc.next_cycle_start_date) ) AS snack_feedback_days,
    ( SELECT count(DISTINCT sl.log_date) FROM public.snack_logs sl
       WHERE sl.user_id = uc.user_id AND sl.felt_better = true AND sl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR sl.log_date < uc.next_cycle_start_date) ) AS snack_helped_days,
    ( SELECT count(DISTINCT gl.log_date) FROM public.guide_logs gl
       WHERE gl.user_id = uc.user_id AND gl.done_at IS NOT NULL AND gl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR gl.log_date < uc.next_cycle_start_date) ) AS guide_used_days,
    ( SELECT count(DISTINCT gl.log_date) FROM public.guide_logs gl
       WHERE gl.user_id = uc.user_id AND gl.felt_better IS NOT NULL AND gl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR gl.log_date < uc.next_cycle_start_date) ) AS guide_feedback_days,
    ( SELECT count(DISTINCT gl.log_date) FROM public.guide_logs gl
       WHERE gl.user_id = uc.user_id AND gl.felt_better = true AND gl.log_date >= uc.cycle_start_date
         AND (uc.next_cycle_start_date IS NULL OR gl.log_date < uc.next_cycle_start_date) ) AS guide_helped_days
FROM public.user_cycles uc
JOIN public.daily_checkins dc
  ON dc.user_id = uc.user_id
 AND dc.checkin_date >= uc.cycle_start_date
 AND (uc.next_cycle_start_date IS NULL OR dc.checkin_date < uc.next_cycle_start_date)
GROUP BY uc.user_id, uc.cycle_start_date, uc.next_cycle_start_date;

-- ####################################################################
-- ส่วน 3: ลบคอลัมน์เก่าใน daily_checkins (ย้ายไปอยู่ daily_body_logs แล้ว)
-- รันหลังจากส่วน 2 และทดสอบหน้า /symptoms แล้วเท่านั้น
-- (ตรวจแล้วว่าไม่มีข้อมูลในคอลัมน์เหล่านี้ และไม่มี VIEW/ฟังก์ชันอื่นใช้ นอกจาก VIEW ที่แก้ในส่วน 2)
-- CHECK ของคอลัมน์ (flow_amount, medication_count) จะหายไปพร้อมกัน
-- ####################################################################
ALTER TABLE public.daily_checkins
    DROP COLUMN IF EXISTS flow_amount,
    DROP COLUMN IF EXISTS flow_color,
    DROP COLUMN IF EXISTS discharge_color,
    DROP COLUMN IF EXISTS mood,
    DROP COLUMN IF EXISTS medication_count,
    DROP COLUMN IF EXISTS notes;

-- (ไม่บังคับ) คอลัมน์เก่า 2 ตัวนี้แอปไม่ได้ใช้เลย เพราะย้ายไปเป็นรายการใน symptom_logs แล้ว
-- (เจ็บเต้านม = symptom_types 6 / ตกขาวเก็บเป็น "สีตกขาว") ถ้าอยากเก็บให้ตารางสะอาด เอา -- ออกแล้วรันได้
-- ALTER TABLE public.daily_checkins
--     DROP COLUMN IF EXISTS breast_tenderness,
--     DROP COLUMN IF EXISTS vaginal_discharge;

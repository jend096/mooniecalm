// ===== ตัวเลือก + ฟังก์ชันบันทึกของหน้า "บันทึกอาการเพิ่มเติม" (app/utils/extra-logs.ts) =====
// ข้อมูลของหน้านี้อยู่ในตารางของตัวเอง daily_body_logs (1 แถวต่อวันต่อคน แยกจาก daily_checkins ของหน้าเช็คอิน)
//   หมวดที่เลือกได้อย่างเดียว (ปริมาณเลือด / สีเลือด / สีตกขาว / อารมณ์): กดตัวเลือกใหม่ = เปลี่ยนค่า / กดตัวที่เลือกอยู่ซ้ำ = เอาออก (ตั้งเป็นว่าง NULL)
//   ยาแก้ปวด (จำนวนเม็ด) และข้อความบันทึก ก็อยู่แถวเดียวกัน (medication_count, notes)
// อาการที่เลือกได้หลายอัน อยู่ในตาราง symptom_logs แยกต่างหาก (ดู ~/utils/symptom-logs.ts)
// ทุกแถวมีวันที่ log_date ไว้ให้หน้าสรุปเดือนจัดเข้ารอบประจำเดือนเอง
import { getAuthedSupabaseClient } from '~/utils/supabase-authed-client'

export interface ExtraOption {
  code: string // ค่าที่เก็บในฐานข้อมูล
  label: string // ข้อความที่โชว์
  dot?: string // สีจุดหน้าชื่อ (เฉพาะหมวดสีเลือด)
}

// ปริมาณเลือด (code ต้องตรงกับ CHECK ของคอลัมน์ flow_amount: light / medium / heavy)
export const FLOW_AMOUNT_OPTIONS: ExtraOption[] = [
  { code: 'light', label: 'ปริมาณน้อย' },
  { code: 'medium', label: 'ปริมาณกลาง' },
  { code: 'heavy', label: 'ปริมาณมาก' }
]

// สีของประจำเดือน (คอลัมน์ flow_color) สีจุดตามฟิกม่า
export const FLOW_COLOR_OPTIONS: ExtraOption[] = [
  { code: 'dark_red', label: 'สีแดงเข้ม', dot: '#D4001F' },
  { code: 'pink', label: 'สีชมพู', dot: '#E8185A' },
  { code: 'deep_dark_red', label: 'สีแดงคล้ำ', dot: '#A30008' },
  { code: 'bright_red', label: 'สีแดงสด', dot: '#FF0A22' },
  { code: 'orange_red', label: 'สีแดงส้ม', dot: '#FF3B0A' },
  { code: 'brown', label: 'สีน้ำตาล', dot: '#4A1508' }
]

// สีตกขาว (คอลัมน์ discharge_color)
export const DISCHARGE_COLOR_OPTIONS: ExtraOption[] = [
  { code: 'gray', label: 'สีเทา เทาอ่อน' },
  { code: 'cloudy_white', label: 'สีขาวขุ่น เหลืองขาว' },
  { code: 'green', label: 'สีเขียว' },
  { code: 'yellow', label: 'สีเหลือง' },
  { code: 'brown_bloody', label: 'สีน้ำตาล มีเลือดปน' },
  { code: 'pink_red', label: 'สีชมพู หรือ สีแดง' },
  { code: 'white', label: 'สีขาว' }
]

// อารมณ์วันนี้ (คอลัมน์ mood ยาวไม่เกิน 20 ตัวอักษร)
export const MOOD_OPTIONS: ExtraOption[] = [
  { code: 'calm', label: 'เงียบสงบ' },
  { code: 'stressed', label: 'เครียดหรือวิตกกังวลมาก' },
  { code: 'irritable', label: 'หงุดหงิด' },
  { code: 'mood_swings', label: 'อารมณ์แปรปรวน' },
  { code: 'sad', label: 'เศร้าและดิ่งลง' },
  { code: 'exhausted', label: 'เหนื่อยล้าไร้พลัง' }
]

// ชื่อหมวด -> ชื่อคอลัมน์ใน daily_body_logs
export type ExtraChoiceField = 'flow_amount' | 'flow_color' | 'discharge_color' | 'mood'

export interface ExtraValues {
  flow_amount: string | null
  flow_color: string | null
  discharge_color: string | null
  mood: string | null
  medication_count: number
  notes: string | null
}

export const MEDICATION_MAX = 20 // กดเพิ่มยาได้สูงสุด (กันกดเพลินจนเลขเพี้ยน)
export const NOTE_MAX_LENGTH = 500

export function emptyExtraValues(): ExtraValues {
  return { flow_amount: null, flow_color: null, discharge_color: null, mood: null, medication_count: 0, notes: null }
}

// โหลดค่าของวันนั้น (ไม่มีแถว = ยังไม่เคยบันทึก ได้ค่าว่างทั้งหมด) คืน null ถ้าโหลดไม่สำเร็จ
export async function loadExtraValues(profileId: number, date: string): Promise<ExtraValues | null> {
  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from('daily_body_logs')
    .select('flow_amount, flow_color, discharge_color, mood, medication_count, notes')
    .eq('user_id', profileId)
    .eq('log_date', date)
    .maybeSingle()
  if (error) return null
  return {
    flow_amount: (data?.flow_amount as string | null) ?? null,
    flow_color: (data?.flow_color as string | null) ?? null,
    discharge_color: (data?.discharge_color as string | null) ?? null,
    mood: (data?.mood as string | null) ?? null,
    medication_count: (data?.medication_count as number | null) ?? 0,
    notes: (data?.notes as string | null) ?? null
  }
}

// บันทึก 1 คอลัมน์ของวันนั้นทันที (คืน true = สำเร็จ)
//   value มีค่า -> upsert (ยังไม่มีแถวของวันนั้นก็สร้างให้)
//   value เป็น null -> "ลบ" ค่าออก: แก้เป็นว่างเฉพาะแถวที่มีอยู่ (ไม่สร้างแถวเปล่าขึ้นมาใหม่)
//   เมื่อทุกช่องว่างหมดแล้วแถวนั้นยังอยู่ (ไม่ลบทั้งแถว) แต่ไม่มีผลกับหน้าอื่น
export async function saveExtraField(
  profileId: number,
  date: string,
  column: ExtraChoiceField | 'medication_count' | 'notes',
  value: string | number | null
): Promise<boolean> {
  const authed = await getAuthedSupabaseClient()
  if (value === null) {
    const { error } = await authed
      .from('daily_body_logs')
      .update({ [column]: null })
      .eq('user_id', profileId)
      .eq('log_date', date)
    return !error
  }
  const { error } = await authed
    .from('daily_body_logs')
    .upsert({ user_id: profileId, log_date: date, [column]: value }, { onConflict: 'user_id,log_date' })
  return !error
}

// ===== อาการเพิ่มเติม (app/utils/symptom-logs.ts) =====
// ตัวช่วยของหน้า "บันทึกอาการเพิ่มเติม" (/symptoms) แยกเป็น 2 ส่วน
//   1) ฟังก์ชันล้วนๆ (ไม่แตะฐานข้อมูล) ไว้ตัดสินว่าอาการไหนมีคู่มือ / ต้องโชว์ข้อความอะไร
//   2) ฟังก์ชันคุยกับ Supabase: โหลดรายการอาการ, โหลดที่บันทึกไว้ของวันนั้น, เพิ่ม/ลบทีละอาการ
//
// กติกาของหน้านี้ (ตามที่ตัดสินใจกัน):
//   - กดอาการไหน = บันทึกลงฐานข้อมูลทันที (symptom_logs 1 อาการ = 1 แถวต่อวัน)
//   - กดอาการเดิมซ้ำ = เอาออก ลบแถวนั้นจากฐานข้อมูลทันที
//   - วันที่ผ่านมาแล้วดูย้อนหลังได้อย่างเดียว แก้ไม่ได้ (หน้าจอไม่ให้กด)
//   - ข้อมูลเก็บแยกจากหน้าเช็คอิน หน้าเช็คอินไม่แสดงอาการเหล่านี้ ไว้ให้หน้าสรุปเดือนดึงไปใช้
import { getAuthedSupabaseClient } from '~/utils/supabase-authed-client'

// แถวจากตาราง symptom_types (รายการอาการที่ให้เลือก)
export interface SymptomType {
  id: number
  symptom_code: string
  label: string // ชื่อที่โชว์ เช่น "ปวดหลัง"
  guide_body_area: string | null // รหัสจุดที่ตรงกับ pain_relief_guides.body_area (null = ยังไม่มีคู่มือรองรับ)
  note: string | null // ข้อความเล็กๆ ใต้อาการที่ไม่มีคู่มือ (ถ้ามี)
  display_order: number
}

// อาการนี้มีคู่มือบรรเทาให้ไหม (ถ้ามี หน้าบันทึกโชว์ปุ่ม "ดูคู่มือ")
export function hasGuide(symptom: SymptomType): boolean {
  return symptom.guide_body_area !== null
}

// แยกอาการเป็น 2 กลุ่ม ไว้โชว์เป็นหัวข้อ: มีคู่มือช่วย / ยังไม่มีคู่มือ (เรียงตาม display_order เหมือนเดิม)
export function splitByGuide(symptoms: SymptomType[]): { withGuide: SymptomType[], withoutGuide: SymptomType[] } {
  const sorted = [...symptoms].sort((a, b) => a.display_order - b.display_order)
  return {
    withGuide: sorted.filter(hasGuide),
    withoutGuide: sorted.filter(s => !hasGuide(s))
  }
}

// ข้อความเตือนที่ต้องโชว์ เมื่อผู้ใช้เลือกอาการที่ไม่มีคู่มือและมี note (เช่น คันในช่องคลอด -> ควรปรึกษาแพทย์)
// คืนเฉพาะ note ของอาการที่ถูกเลือก ไม่ซ้ำ
export function notesForSelected(symptoms: SymptomType[], selectedIds: number[]): string[] {
  const notes = symptoms
    .filter(s => selectedIds.includes(s.id) && s.note)
    .map(s => s.note as string)
  return [...new Set(notes)]
}

// สลับเลือก/ไม่เลือกอาการ คืน array ใหม่ (ไม่แก้ตัวเดิม) ใช้กับ ref ได้ตรงๆ
export function toggleSymptom(selectedIds: number[], id: number): number[] {
  return selectedIds.includes(id)
    ? selectedIds.filter(x => x !== id)
    : [...selectedIds, id]
}

// ---------- ส่วนที่คุยกับ Supabase ----------

// โหลดรายการอาการทั้งหมดที่ให้เลือก (อ่านได้ทุกคน เรียงตาม display_order)
export async function loadSymptomTypes(): Promise<SymptomType[]> {
  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from('symptom_types')
    .select('id, symptom_code, label, guide_body_area, note, display_order')
    .order('display_order')
  if (error) return []
  return (data ?? []) as SymptomType[]
}

// โหลด id ของอาการที่ผู้ใช้บันทึกไว้ในวันนั้น (ใช้ตอนเปิดหน้าเพื่อโชว์ว่าเลือกอะไรไว้แล้ว)
export async function loadSavedSymptomIds(profileId: number, logDate: string): Promise<number[]> {
  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from('symptom_logs')
    .select('symptom_id')
    .eq('user_id', profileId)
    .eq('log_date', logDate)
  if (error) return []
  return (data ?? []).map(row => row.symptom_id as number)
}

// เพิ่มอาการของวันนั้น 1 อาการ (คืน true = สำเร็จ)
// ถ้าอาการนั้นเคยบันทึกวันนี้แล้ว (UNIQUE ชนกัน) ให้ข้าม ไม่ต้อง error
export async function addSymptomLog(profileId: number, logDate: string, symptomId: number): Promise<boolean> {
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed
    .from('symptom_logs')
    .upsert(
      { user_id: profileId, symptom_id: symptomId, log_date: logDate },
      { onConflict: 'user_id,symptom_id,log_date', ignoreDuplicates: true }
    )
  return !error
}

// เอาอาการของวันนั้นออก 1 อาการ = ลบแถวนั้นทิ้งจากฐานข้อมูล (คืน true = สำเร็จ)
export async function removeSymptomLog(profileId: number, logDate: string, symptomId: number): Promise<boolean> {
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed
    .from('symptom_logs')
    .delete()
    .eq('user_id', profileId)
    .eq('symptom_id', symptomId)
    .eq('log_date', logDate)
  return !error
}

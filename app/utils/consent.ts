// ===== ความยินยอมให้เก็บข้อมูลสุขภาพ (app/utils/consent.ts) =====
// ผู้ใช้กดยินยอมในป๊อปอัพ (ConsentDialog) ก่อนเริ่มใช้งาน ตอนนั้นยังไม่ได้ล็อกอิน จึงจำไว้ในเครื่องก่อน
// แล้วแนบไปกับข้อมูล onboarding (user_metadata) ตอนส่งลิงก์เข้าสู่ระบบ พอสร้างโปรไฟล์ก็เขียนลงตาราง user_profiles เป็นหลักฐาน
// (คอลัมน์ consent_health_at / consent_version ดู SQL ในไฟล์ consent-columns.sql)
// เปลี่ยนข้อความในป๊อปอัพเมื่อไร ให้แก้เลขเวอร์ชันนี้ด้วย จะได้รู้ว่าใครยินยอมข้อความฉบับไหน
export const CONSENT_VERSION = '2026-10-v2'

const STORAGE_KEY = 'mooniecalm-consent'

export interface ConsentRecord {
  at: string // เวลาที่กดยินยอม (ISO)
  version: string // ฉบับข้อความที่ผู้ใช้เห็นตอนกด
}

// อ่านความยินยอมที่เคยกดไว้ในเครื่องนี้ (ไม่มี/อ่านไม่ได้ = null)
export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>
    // เคยยินยอมแต่เป็นข้อความฉบับเก่า -> นับว่ายังไม่ยินยอมฉบับนี้ ให้ถามใหม่
    if (typeof parsed.at === 'string' && parsed.version === CONSENT_VERSION) return { at: parsed.at, version: parsed.version }
  } catch {
    // อ่านไม่ได้ (เช่นปิด storage ไว้) ก็ถือว่ายังไม่เคยยินยอม
  }
  return null
}

// บันทึกว่าตอนนี้ผู้ใช้กดยินยอมแล้ว
export function saveConsent(): ConsentRecord {
  const record: ConsentRecord = { at: new Date().toISOString(), version: CONSENT_VERSION }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // เก็บในเครื่องไม่ได้ก็ไม่เป็นไร เดี๋ยวถามใหม่รอบหน้า
  }
  return record
}

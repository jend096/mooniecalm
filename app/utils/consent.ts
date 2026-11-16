// ===== ความยินยอมให้เก็บข้อมูลสุขภาพ (app/utils/consent.ts) =====
// ผู้ใช้กดยินยอมในป๊อปอัพ (ConsentDialog) ก่อนเริ่มใช้งาน ตอนนั้นยังไม่ได้ล็อกอิน จึงจำไว้ในเครื่องก่อน
// แล้วแนบไปกับข้อมูล onboarding (user_metadata) ตอนส่งลิงก์เข้าสู่ระบบ พอสร้างโปรไฟล์ก็เขียนลงตาราง user_profiles เป็นหลักฐาน
// (คอลัมน์ consent_health_at / consent_version ดู SQL ในไฟล์ consent-columns.sql)
// เปลี่ยนข้อความในป๊อปอัพเมื่อไร ให้แก้เลขเวอร์ชันนี้ด้วย จะได้รู้ว่าใครยินยอมข้อความฉบับไหน
export const CONSENT_VERSION = '2026-10-v2'

const STORAGE_KEY = 'mooniecalm-consent'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // จำไว้ 1 ปี

export interface ConsentRecord {
  at: string // เวลาที่กดยินยอม (ISO)
  version: string // ฉบับข้อความที่ผู้ใช้เห็นตอนกด
}

// ที่จำคำยินยอมมี 3 ชั้น (ลองไล่ตามลำดับ): ความจำของหน้าเว็บ -> localStorage -> cookie
// เหตุผล: Safari บางเครื่อง (เช่นเปิดจากแอปอื่น / โหมดส่วนตัว / ตั้งบล็อกการเก็บข้อมูล) เขียน localStorage ไม่ได้
// เดิมกด "ยินยอม" แล้วอ่านกลับมาไม่เจอ ป๊อปอัพเลยเด้งถามซ้ำวนไปเรื่อยๆ ดูเหมือนกดไม่ไป
// ตอนนี้เก็บไว้หลายที่ ถ้าเก็บได้สักที่ก็จำได้ ถ้าเก็บไม่ได้เลยก็ยังจำในหน้านี้ ไม่วนค้าง (แค่รอบหน้าอาจถามใหม่)
let memoryConsent: ConsentRecord | null = null

// แปลงข้อความที่อ่านมาเป็นความยินยอม (ฉบับเก่า/ข้อมูลเพี้ยน = ไม่นับ)
function parseConsent(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>
    // เคยยินยอมแต่เป็นข้อความฉบับเก่า -> นับว่ายังไม่ยินยอมฉบับนี้ ให้ถามใหม่
    if (typeof parsed.at === 'string' && parsed.version === CONSENT_VERSION) return { at: parsed.at, version: parsed.version }
  } catch {
    // ข้อมูลเพี้ยน ก็ถือว่าไม่มี
  }
  return null
}

function readCookie(): string | null {
  try {
    const hit = document.cookie.split('; ').find(part => part.startsWith(`${STORAGE_KEY}=`))
    return hit ? decodeURIComponent(hit.slice(STORAGE_KEY.length + 1)) : null
  } catch {
    return null
  }
}

// อ่านความยินยอมที่เคยกดไว้ในเครื่องนี้ (ไม่มี/อ่านไม่ได้ = null)
export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  if (memoryConsent && memoryConsent.version === CONSENT_VERSION) return memoryConsent

  let fromStorage: ConsentRecord | null = null
  try {
    fromStorage = parseConsent(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    // อ่าน localStorage ไม่ได้ (เช่นปิด storage ไว้) ไปลอง cookie ต่อ
  }
  const found = fromStorage ?? parseConsent(readCookie())
  if (found) memoryConsent = found
  return found
}

// บันทึกว่าตอนนี้ผู้ใช้กดยินยอมแล้ว (เก็บทุกที่ที่เก็บได้ ที่ไหนเก็บไม่ได้ก็ข้าม)
export function saveConsent(): ConsentRecord {
  const record: ConsentRecord = { at: new Date().toISOString(), version: CONSENT_VERSION }
  const json = JSON.stringify(record)
  memoryConsent = record // ชั้นที่ 1: ความจำหน้าเว็บ (เก็บได้เสมอ)
  try {
    window.localStorage.setItem(STORAGE_KEY, json) // ชั้นที่ 2
  } catch {
    // เก็บไม่ได้ก็ข้าม
  }
  try {
    // ชั้นที่ 3: cookie สำรอง (ใช้เฉพาะจำคำยินยอม ไม่ได้ส่งไปไหน)
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(json)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  } catch {
    // เก็บไม่ได้ก็ข้าม
  }
  return record
}

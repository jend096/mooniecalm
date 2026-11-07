// ===== ตัวจำข้อมูลหน้าสั้นๆ (app/utils/page-cache.ts) =====
// ไว้ทำอะไร: ผู้ใช้เพิ่งเข้าหน้าหนึ่งมา แล้วกลับมาที่หน้านั้นอีกภายในไม่กี่วินาที
//   -> เอาข้อมูลที่เพิ่งโหลดไว้มาโชว์ทันที ไม่ต้องขึ้นหน้าโหลดซ้ำ
//   (หน้านั้นจะแอบดึงข้อมูลใหม่เบื้องหลังอีกรอบ ถ้ามีอะไรเปลี่ยนค่อยอัปเดตตามทีหลัง ข้อมูลเลยไม่ค้างเก่า)
//
// จำไว้ในหน่วยความจำของแท็บนี้เท่านั้น (ปิดแท็บ/รีเฟรชหน้า = หายหมด ไม่ได้เก็บลงเครื่อง)
// ทุกค่าเก็บเป็นข้อความ JSON เพื่อให้ได้สำเนาแยกต่างหากเสมอ (แก้ข้อมูลในหน้าแล้วไม่ไปทำให้ของที่จำไว้เพี้ยน)
//
// ใช้: const cached = readPageCache<MySnapshot>(userId, 'home')
//      writePageCache(userId, 'home', snapshot)
//      clearPageCache()  <- เรียกหลัง "บันทึก/แก้ไขข้อมูล" เพื่อไม่ให้หน้าอื่นโชว์ของเก่าแวบหนึ่ง

// จำไว้กี่วินาที (แก้เลขนี้ที่เดียว มีผลทุกหน้า)
export const PAGE_CACHE_SECONDS = 50

interface CacheEntry {
  savedAt: number // เวลาที่จำไว้ (มิลลิวินาที)
  json: string
}

const store = new Map<string, CacheEntry>()

// key รวม id ผู้ใช้ด้วย กันเปลี่ยนบัญชีแล้วเห็นข้อมูลของคนก่อนหน้า
function makeKey(userId: string, page: string) {
  return `${userId}:${page}`
}

// อ่านข้อมูลที่จำไว้ คืน null ถ้าไม่เคยจำ หรือเก่าเกิน PAGE_CACHE_SECONDS แล้ว
export function readPageCache<T>(userId: string, page: string): T | null {
  const entry = store.get(makeKey(userId, page))
  if (!entry) return null
  if (Date.now() - entry.savedAt > PAGE_CACHE_SECONDS * 1000) {
    store.delete(makeKey(userId, page))
    return null
  }
  try {
    return JSON.parse(entry.json) as T
  } catch {
    return null
  }
}

// จำข้อมูลของหน้านั้นไว้ (นับเวลาใหม่ตั้งแต่ตอนนี้)
export function writePageCache(userId: string, page: string, data: unknown) {
  try {
    store.set(makeKey(userId, page), { savedAt: Date.now(), json: JSON.stringify(data) })
  } catch {
    // จำไม่ได้ก็ไม่เป็นไร แค่หน้าจะโหลดตามปกติ
  }
}

// ข้อความ JSON ของข้อมูล (ไว้เทียบว่าข้อมูลใหม่เหมือนที่โชว์อยู่ไหม จะได้ไม่ต้องวาดหน้าใหม่)
export function toCacheJson(data: unknown): string {
  try {
    return JSON.stringify(data)
  } catch {
    return ''
  }
}

// ล้างที่จำไว้ทั้งหมด: เรียกหลังบันทึก/แก้ข้อมูล และตอนออกจากระบบ
export function clearPageCache() {
  store.clear()
}

// ===== จำ "เลขโปรไฟล์ของผู้ใช้" (user_profiles.id) =====
// ทุกหน้าต้องถามฐานข้อมูลหาเลขนี้ก่อนถึงจะดึงข้อมูลอื่นได้ (เสียเวลา 1 รอบเน็ตทุกหน้า)
// เลขนี้ไม่เปลี่ยนระหว่างใช้งาน จึงจำไว้นานกว่า (PROFILE_ID_CACHE_SECONDS) แยกจากที่จำข้อมูลหน้า
// ไม่ล้างตอนบันทึกข้อมูลทั่วไป แต่ล้างตอนออกจากระบบ / สมัครบันทึกโปรไฟล์ (forgetProfileIds)
export const PROFILE_ID_CACHE_SECONDS = 600

const profileIds = new Map<string, { id: number, savedAt: number }>()

export function readProfileId(authUserId: string): number | null {
  const entry = profileIds.get(authUserId)
  if (!entry) return null
  if (Date.now() - entry.savedAt > PROFILE_ID_CACHE_SECONDS * 1000) {
    profileIds.delete(authUserId)
    return null
  }
  return entry.id
}

export function writeProfileId(authUserId: string, id: number) {
  profileIds.set(authUserId, { id, savedAt: Date.now() })
}

export function forgetProfileIds() {
  profileIds.clear()
}

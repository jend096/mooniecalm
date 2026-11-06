// ตัดสินว่า "หลังล็อกอินสำเร็จ" ผู้ใช้คนนี้ควรไปหน้าไหน (ใช้ที่ signup.vue)
// แยกออกมาเป็นฟังก์ชันล้วนๆ เพื่อให้ทดสอบกติกาได้ง่าย และกติกาอยู่ที่เดียว

// อวตารมี 4 ชิ้น (ตา หู สีตัว เอฟเฟกต์) ต้องอยู่ในฐานข้อมูลครบทั้ง 4 ถึงจะถือว่า "บันทึกครบ"
// (ต้องเท่ากับจำนวนช่องใน AVATAR_SLOTS ของ save-onboarding-profile.ts)
export const AVATAR_SLOT_COUNT = 4

export interface LoginCheck {
  hasNickname: boolean // มีแถวในตารางโปรไฟล์ และตั้งชื่อเล่นแล้ว
  avatarCountInDb: number // จำนวนชิ้นอวตารที่อยู่ในฐานข้อมูลจริงของผู้ใช้คนนี้
  hasAllAvatarAnswers: boolean // มีคำตอบสร้างอวตารครบ 4 ข้อรอบันทึกอยู่ (ในความจำ / แนบมากับลิงก์อีเมล / จดไว้ก่อนไป Google)
}

// 'home'      = ข้อมูลครบแล้ว เข้าหน้าหลักได้เลย
// 'questions' = ยังไม่มีคำตอบสร้างอวตารครบ (เมลใหม่ หรือข้อมูลในฐานไม่ครบ) -> ไปตอบที่ step-3
// 'save'      = มีคำตอบครบแล้วแต่ยังไม่ได้อยู่ในฐานข้อมูล -> บันทึกลงฐาน (แล้วตรวจซ้ำว่าลงจริง) ก่อนไปต่อ
export type LoginStep = 'home' | 'questions' | 'save'

export function decideLoginStep(check: LoginCheck): LoginStep {
  const avatarComplete = check.avatarCountInDb >= AVATAR_SLOT_COUNT
  if (check.hasNickname && avatarComplete) return 'home'
  if (avatarComplete || check.hasAllAvatarAnswers) return 'save'
  return 'questions'
}

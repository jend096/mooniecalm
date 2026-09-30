export interface AvatarAnswerOption {
  label: string
  code: string
}

export const QUESTION_1_OPTIONS: AvatarAnswerOption[] = [
  { label: 'เข้านอนก่อน 23:00 น.', code: 'eye_alert' },
  { label: 'ช่วง 23:00 - 01:00 น.', code: 'eye_sleepy' },
  { label: 'หลัง 01:00 น. เป็นต้นไป', code: 'eye_exhausted' }
]

export const QUESTION_2_OPTIONS: AvatarAnswerOption[] = [
  { label: 'แทบไม่ได้ออกกำลังกายเลย', code: 'ear_droop' },
  { label: 'ขยับตัวเบาๆ 1-2 วัน/สัปดาห์', code: 'ear_half_droop' },
  { label: 'ออกกำลังกายสม่ำเสมอ', code: 'ear_erect' }
]

export const QUESTION_3_OPTIONS: AvatarAnswerOption[] = [
  { label: 'นานๆ ทานที (1-2 ครั้ง/สัปดาห์)', code: 'body_pink' },
  { label: 'ทานบ่อยสัปดาห์ละ 3-4 วัน', code: 'body_yellow' },
  { label: 'ขาดไม่ได้เลย ต้องทานทุกวัน', code: 'body_caramel' }
]

export const QUESTION_4_OPTIONS: AvatarAnswerOption[] = [
  { label: 'ดื่มน้ำอุณหภูมิห้องหรือน้ำอุ่นเป็นหลัก', code: 'fx_warm_rosy' },
  { label: 'ดื่มสลับกันทั้งน้ำเย็นและน้ำธรรมดา', code: 'fx_sweat_nose' },
  { label: 'ดื่มแต่น้ำเย็นเจี๊ยบหรือน้ำใส่น้ำแข็งตลอดวัน', code: 'fx_shivering_cold' }
]

export const AVATAR_OPTION_LABELS: Record<string, string> = Object.fromEntries(
  [...QUESTION_1_OPTIONS, ...QUESTION_2_OPTIONS, ...QUESTION_3_OPTIONS, ...QUESTION_4_OPTIONS]
    .map(o => [o.code, o.label])
)

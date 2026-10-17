// ===== ตัวช่วยคู่มือบรรเทาปวด (app/utils/guide-picker.ts) =====
// ฟังก์ชันล้วนๆ (ไม่แตะฐานข้อมูล ไม่แตะหน้าจอ) ทดสอบง่าย
// หน้า /guide ดึงข้อมูลมา แล้วเรียกฟังก์ชันในไฟล์นี้ตัดสินว่า "โชว์คู่มือไหน เรียงยังไง"

// ระดับปวด 3 ระดับ (ตรงกับที่เก็บใน daily_checkins.pain_level: เบา=2, กลาง=5, มาก=8)
export interface PainLevelOption {
  value: number
  title: string
  description: string
}

export const PAIN_LEVELS: PainLevelOption[] = [
  { value: 2, title: 'เบา', description: 'ปวดตื้อๆ หน่วงๆ รู้สึกรำคาญ' },
  { value: 5, title: 'กลาง', description: 'ปวดเกร็งท้องชัดเจน เริ่มรบกวนสมาธิ' },
  { value: 8, title: 'มาก', description: 'ปวดบิดรุนแรง ทรมานมาก จนตัวงอ' }
]

// ตั้งแต่ระดับนี้ขึ้นไปถือว่า "ปวดมาก" (เกณฑ์เดียวกับระบบความปลอดภัยใน SQL: pain_level >= 7)
export const SEVERE_PAIN_LEVEL = 7

// จุดที่ปวด 4 จุด (รหัสตรงกับ daily_checkins.pain_location และ pain_relief_guides.body_area)
// หมายเหตุ: เอา 'head' (ปวดหัว) ออกจากตัวเลือกแล้ว เพราะไม่มีวิธีบรรเทาที่มีแหล่งวิจัยรองรับ
export const PAIN_LOCATIONS: { code: string, label: string }[] = [
  { code: 'lower_abdomen', label: 'ท้องน้อย' },
  { code: 'lower_back', label: 'หลังส่วนล่าง' },
  { code: 'thigh', label: 'ต้นขา' },
  { code: 'whole_body', label: 'ปวดทั่วตัว' }
]

// ป้ายชื่อของรหัสเก่าที่เลิกให้เลือกแล้ว แต่ข้อมูลเก่าอาจยังมีอยู่ (ฐานข้อมูลยังยอมรับรหัสนี้)
const LEGACY_LOCATION_LABEL: Record<string, string> = {
  head: 'ปวดหัว'
}

// แปลงตัวเลขระดับปวดเป็นคำ (ไว้โชว์ในหน้าเช็คอิน) ค่าที่ไม่ตรง 3 ระดับจะจัดเข้าระดับที่ใกล้ที่สุด
export function painLevelLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (value >= SEVERE_PAIN_LEVEL) return 'มาก'
  if (value >= 4) return 'กลาง'
  return 'เบา'
}

export function painLocationLabel(code: string): string {
  return PAIN_LOCATIONS.find(l => l.code === code)?.label ?? LEGACY_LOCATION_LABEL[code] ?? code
}

export interface GuideItem {
  id: number
  guide_code: string
  category: string
  title: string
  short_description: string | null
  steps: string | null
  linked_goal_code: string | null
  body_area: string[] | null
}

// หมวดที่ทำได้ทันทีโดยไม่ต้องขยับตัวมาก (ประคบร้อน หายใจ กดจุด นวด) ส่วนหมวดยืดเหยียดต้องขยับตัว
// หมายเหตุ: นี่คือการจัดกลุ่มตามความง่ายในการทำตอนปวดมาก เป็นกติกาของแอป ไม่ใช่ผลวิจัยว่าหมวดไหนหายไวกว่ากัน
const QUICK_CATEGORIES = ['heat', 'breathing', 'acupressure', 'massage']

export function isQuickGuide(guide: GuideItem): boolean {
  return QUICK_CATEGORIES.includes(guide.category)
}

// เรียงคู่มือ (ไม่แก้ array เดิม):
// - ปวดมาก: ตัวที่ทำได้ทันที (QUICK) ขึ้นก่อน แล้วค่อยดูว่าตรงเป้าหมายไหม
// - ปวดเบา/กลาง: ตัวที่ตรงเป้าหมายของผู้ใช้ขึ้นก่อน
// - เท่ากันให้เรียงตาม id เหมือนเดิม
export function sortGuides(guides: GuideItem[], painLevel: number | null, goalCodes: string[]): GuideItem[] {
  const severe = painLevel !== null && painLevel >= SEVERE_PAIN_LEVEL
  const matchesGoal = (g: GuideItem) => (g.linked_goal_code && goalCodes.includes(g.linked_goal_code) ? 1 : 0)
  const quick = (g: GuideItem) => (isQuickGuide(g) ? 1 : 0)
  return [...guides].sort((a, b) => {
    if (severe && quick(a) !== quick(b)) return quick(b) - quick(a)
    if (matchesGoal(a) !== matchesGoal(b)) return matchesGoal(b) - matchesGoal(a)
    return a.id - b.id
  })
}

// ขั้นตอนใน DB เก็บเป็นข้อความเดียว "1. ... 2. ... 3. ..." แยกเป็นข้อๆ ไว้โชว์เป็นรายการ
export function splitSteps(text: string | null): string[] {
  if (!text) return []
  return text
    .split(/\s*(?=\b\d+\.\s)/)
    .map(s => s.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
}

// คู่มือของจุดที่ปวด (เลือกได้หลายจุด) เรียงด้วย sortGuides แล้ว
// locations = [] แปลว่าไม่ได้ระบุจุด -> คืนคู่มือทั้งหมด
// เลือกหลายจุด = รวมคู่มือของทุกจุดที่เลือก (อันไหนใช้ได้หลายจุด เช่น ท่าแมว-วัว จะโผล่แค่ครั้งเดียว)
export function filterGuidesByLocation(
  guides: GuideItem[],
  locations: string[],
  painLevel: number | null,
  goalCodes: string[]
): GuideItem[] {
  const inArea = locations.length
    ? guides.filter(g => (g.body_area ?? []).some(area => locations.includes(area)))
    : guides
  return sortGuides(inArea, painLevel, goalCodes)
}

// ===== ตัวช่วยสุ่มของว่าง (app/utils/snack-picker.ts) =====
// เป็นฟังก์ชันล้วนๆ (ไม่แตะฐานข้อมูล ไม่แตะหน้าจอ) จึงทดสอบง่าย
// หน้า /snack ดึงข้อมูลมา แล้วเรียกฟังก์ชันในไฟล์นี้ตัดสินว่า "ควรโชว์เมนูไหน"

// ประเภทของว่าง 4 หมวด + ตัวเลือก "ไม่รู้ เลือกให้หน่อย" (any ไม่ใช่หมวดในฐานข้อมูล แค่สุ่มจากทุกหมวด)
export type SnackCategory = 'warming' | 'savory' | 'sweet' | 'refreshing'
export type SnackChoice = SnackCategory | 'any'

// ข้อความที่โชว์ให้ผู้ใช้เห็นของแต่ละหมวด (บอกลักษณะของว่างเท่านั้น ไม่อ้างสรรพคุณ เพราะยังไม่มีงานวิจัยรองรับ)
// รหัสหมวดในฐานข้อมูล (warming/savory/sweet/refreshing) ไม่เปลี่ยน เปลี่ยนแค่ข้อความที่โชว์
export const SNACK_CATEGORY_LABEL: Record<SnackCategory, string> = {
  warming: 'อุ่นๆ',
  savory: 'เค็มๆ มันๆ',
  sweet: 'อิ่มท้อง · ให้พลังงาน',
  refreshing: 'สดชื่น'
}

// ข้อความเตือนที่โชว์ใต้ทุกเมนู (แก้ที่เดียว เปลี่ยนทุกหน้า)
// ร่างให้แพทย์ช่วยตรวจ โดยเฉพาะประโยคเรื่องโรคประจำตัว/ตั้งครรภ์/ยา ยังไม่ใช่ข้อความที่แพทย์รับรอง
export const SNACK_SAFETY_NOTE
  = 'เมนูนี้เป็นของว่างกินเล่น ไม่ใช่ยาและไม่ใช่อาหารหลัก ไม่ควรกินแทนมื้อข้าว หรือกินเยอะเกินส่วนที่แนะนำ ถ้ามีโรคประจำตัว ตั้งครรภ์ หรือใช้ยาประจำ ควรถามแพทย์หรือเภสัชกรก่อน'

// ข้อความเตือนเรื่องสารก่อภูมิแพ้ โชว์ใต้ทุกเมนูเหมือนกันหมด (แก้ที่เดียว เปลี่ยนทุกหน้า)
// เหตุผล: ของที่ซื้อสำเร็จรูป (เช่น ช็อกโกแลต ถั่วอบ นมถั่วเหลือง ชา) แต่ละยี่ห้อมีส่วนผสมไม่เหมือนกัน ผู้ใช้ต้องอ่านฉลากเองเสมอ
// (ร่างให้แพทย์ช่วยตรวจ ยังไม่ใช่ข้อความที่แพทย์รับรอง)
export const SNACK_LABEL_NOTE
  = 'ถ้าซื้อสินค้าสำเร็จรูป ให้อ่านฉลากส่วนผสมและคำเตือนสารก่อภูมิแพ้บนบรรจุภัณฑ์ทุกครั้ง'

// หน้าตาของแถวใน snack_items ที่เราใช้
export interface SnackItem {
  id: number
  snack_code: string
  name: string
  category: SnackCategory
  image_url: string | null
  description: string | null
  pairing_tip: string | null
  linked_goal_code: string | null
  allergens: string[] | null
  ingredients: string[] | null // วัตถุดิบหลัก (ชื่อไทย) ไว้โชว์บนการ์ด และจับคำเทียบกับที่ผู้ใช้พิมพ์เอง
}

// ---------- เรื่องอาหารที่แพ้ ----------
// ตอน onboarding ผู้ใช้เลือกเป็น "ข้อความไทย" (เก็บใน user_profiles.allergies)
// แต่ตาราง snack_items เก็บส่วนผสมที่แพ้ง่ายเป็น "รหัสอังกฤษ" จึงต้องแปลงข้อความ -> รหัสก่อนกรอง
export const NO_ALLERGY_LABEL = 'ไม่มีอาการแพ้อาหาร'

export const ALLERGY_LABEL_TO_CODE: Record<string, string> = {
  นม: 'dairy',
  ไข่: 'egg',
  'ถั่ว / ถั่วลิสง': 'nuts',
  'แป้งสาลี / กลูเตน': 'gluten',
  ถั่วเหลือง: 'soy',
  งา: 'sesame',
  อาหารทะเล: 'seafood',
  น้ำผึ้ง: 'honey'
}

// ตัวเลือกที่ให้ผู้ใช้กดเลือกในหน้าแก้ไข (เหมือนตอน onboarding และเพิ่มน้ำผึ้ง เพราะมีเมนูที่ใช้น้ำผึ้ง)
export const ALLERGY_OPTIONS = Object.keys(ALLERGY_LABEL_TO_CODE)

// แปลงรายการที่ผู้ใช้แพ้ (ข้อความไทย) เป็นรหัสไว้ใช้กรอง
// ข้อความที่ไม่รู้จัก (เช่น "ไม่มีอาการแพ้อาหาร") จะถูกข้ามไป
export function allergyLabelsToCodes(labels: string[]): string[] {
  return labels.map(label => ALLERGY_LABEL_TO_CODE[label]).filter((code): code is string => !!code)
}

// ---------- อาหารอื่นๆ ที่ผู้ใช้พิมพ์เองว่าแพ้ ----------
// เก็บใน user_profiles.allergies ช่องเดิม (ไม่ต้องเพิ่มคอลัมน์) โดยขึ้นต้นด้วย "อื่นๆ: " เช่น "อื่นๆ: มะม่วง"
// ข้อความที่ไม่อยู่ใน ALLERGY_LABEL_TO_CODE จะถูก allergyLabelsToCodes ข้ามไปเอง จึงไม่ชนกับตัวกรองแบบรหัสด้านบน
export const OTHER_ALLERGY_PREFIX = 'อื่นๆ: '
export const OTHER_ALLERGY_MIN_LENGTH = 2 // สั้นกว่านี้จับคำไม่ได้ผล (เช่น พิมพ์ตัวเดียวจะไปตรงกับเมนูมั่ว)
export const OTHER_ALLERGY_MAX_LENGTH = 30
export const OTHER_ALLERGY_MAX_COUNT = 10 // กันพิมพ์เพิ่มไม่หยุด

// ล้างช่องว่างซ้ำ/หัวท้าย และตัดความยาวไม่ให้เกินที่กำหนด
export function cleanOtherAllergyWord(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, OTHER_ALLERGY_MAX_LENGTH)
}

export function toOtherAllergyLabel(word: string): string {
  return `${OTHER_ALLERGY_PREFIX}${word}`
}

export function isOtherAllergyLabel(label: string): boolean {
  return label.startsWith(OTHER_ALLERGY_PREFIX)
}

// ดึงเฉพาะคำที่ผู้ใช้พิมพ์เองออกจากรายการที่แพ้ทั้งหมด
export function otherAllergyWords(labels: string[]): string[] {
  return labels.filter(isOtherAllergyLabel).map(label => label.slice(OTHER_ALLERGY_PREFIX.length))
}

// ข้อความโชว์ผู้ใช้: คำที่พิมพ์เองโชว์แค่คำนั้น เช่น "มะม่วง" (ตัดคำว่า "อื่นๆ: " ออก ไม่ต้องบอกว่าพิมพ์เอง) ส่วนที่เหลือโชว์ตามเดิม
export function allergyDisplayLabel(label: string): string {
  return isOtherAllergyLabel(label) ? label.slice(OTHER_ALLERGY_PREFIX.length) : label
}

// เทียบคำแบบง่าย: ตัวพิมพ์เล็ก-ใหญ่ไม่สำคัญ และไม่สนช่องว่าง
function normalizeWord(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

// เมนูนี้ "ชื่อ" หรือ "วัตถุดิบหลัก" มีคำที่ผู้ใช้พิมพ์ไว้ไหม (คำที่พิมพ์เป็นส่วนหนึ่งของข้อความนั้นก็ถือว่าตรง)
// ตั้งใจให้ตัดเมนูเกินไว้ก่อนดีกว่าพลาด เช่น พิมพ์ "นม" จะตัดทั้ง นมขมิ้น นมถั่วเหลือง และโยเกิร์ต (วัตถุดิบมีนม)
export function matchesOtherAllergy(item: SnackItem, words: string[]): boolean {
  const haystacks = [item.name, ...(item.ingredients ?? [])].map(normalizeWord)
  return words
    .map(normalizeWord)
    .filter(w => w.length >= OTHER_ALLERGY_MIN_LENGTH)
    .some(w => haystacks.some(h => h.includes(w)))
}

// ตัดเมนูที่มีส่วนผสมที่ผู้ใช้แพ้ออก (ตัดถาวร ไม่มีเงื่อนไข)
// 1) แพ้ตามกลุ่มที่กดเลือก -> เทียบรหัสกับ snack_items.allergens
// 2) แพ้อย่างอื่นที่พิมพ์เอง -> จับคำเทียบกับชื่อ/วัตถุดิบหลัก (ดู matchesOtherAllergy)
export function filterByAllergy(items: SnackItem[], allergyLabels: string[]): SnackItem[] {
  const blocked = allergyLabelsToCodes(allergyLabels)
  const words = otherAllergyWords(allergyLabels)
  return items.filter(item =>
    !(item.allergens ?? []).some(code => blocked.includes(code))
    && !matchesOtherAllergy(item, words)
  )
}

// ---------- การสุ่ม ----------
// pool       = เมนูที่ผ่านการกรองแพ้แล้ว (และเลือกหมวดแล้ว)
// usedIds    = เมนูที่ผู้ใช้ "บันทึก" ไปแล้ว "วันนี้" (ข้ามวันแล้วกลับมาสุ่มได้ใหม่)
// goalCodes  = เป้าหมายที่ผู้ใช้เลือกอยู่ เช่น ['reduce_sugar']
// excludeId  = เมนูที่กำลังโชว์อยู่ (กด "สุ่มใหม่" แล้วไม่ควรได้อันเดิมซ้ำ)
// random     = ตัวสุ่ม (ใส่ค่าเองได้ตอนทดสอบ) ต้องคืนเลข 0 ถึงน้อยกว่า 1
// seenIds    = เมนูที่เพิ่งโผล่ให้ดูไปแล้วในหมวดนี้ (หน้าจอจำไว้) ไว้ไม่ให้วนซ้ำอันเดิมก่อนจะเห็นอันอื่นครบ
//
// ลำดับความสำคัญ (สุ่มในชั้นที่ดีที่สุดที่ยังมีเมนูเหลือ):
//   1) ตรงกับเป้าหมายของผู้ใช้ + ยังไม่เคยโผล่   <- เมนูที่ช่วยเป้าหมายจึงเด้งมา "อันแรกๆ" ของหมวดนั้นเสมอ
//   2) ไม่ตรงเป้าหมาย + ยังไม่เคยโผล่
//   3) ตรงเป้าหมาย + เคยโผล่แล้ว  (เห็นครบทุกอันแล้ว เริ่มวนรอบใหม่ โดยเมนูตรงเป้าหมายมาก่อนเหมือนเดิม)
//   4) ที่เหลือ
export function pickSnack(
  pool: SnackItem[],
  usedIds: number[],
  goalCodes: string[],
  excludeId: number | null = null,
  random: () => number = Math.random,
  seenIds: number[] = []
): SnackItem | null {
  if (pool.length === 0) return null

  // 1) ตัดเมนูที่เคยบันทึกในรอบนี้ ถ้าตัดแล้วหมดเกลี้ยง (ใช้ครบแล้ว) ให้เริ่มใหม่จากทั้งพูล
  let candidates = pool.filter(item => !usedIds.includes(item.id))
  if (candidates.length === 0) candidates = pool

  // 2) กด "สุ่มใหม่" ไม่ให้ได้อันเดิม (ยกเว้นเหลืออันเดียวจริงๆ)
  const withoutCurrent = candidates.filter(item => item.id !== excludeId)
  if (withoutCurrent.length > 0) candidates = withoutCurrent

  // 3) แบ่งเป็นชั้นตามลำดับด้านบน แล้วสุ่มในชั้นแรกที่ยังมีเมนู
  const isGoal = (item: SnackItem) => !!item.linked_goal_code && goalCodes.includes(item.linked_goal_code)
  const isFresh = (item: SnackItem) => !seenIds.includes(item.id)
  const tiers: ((item: SnackItem) => boolean)[] = [
    item => isGoal(item) && isFresh(item),
    item => isFresh(item),
    item => isGoal(item),
    () => true
  ]
  for (const inTier of tiers) {
    const group = candidates.filter(inTier)
    if (group.length > 0) return group[Math.floor(random() * group.length)]!
  }
  return candidates.at(-1)! // ไม่น่าถึงตรงนี้ (ชั้นสุดท้ายรับทุกอัน) กันไว้เฉยๆ
}

// เลือกหมวดแล้ว (หรือ any = ทุกหมวด) ได้พูลที่พร้อมสุ่ม
export function poolForChoice(items: SnackItem[], allergyLabels: string[], choice: SnackChoice): SnackItem[] {
  const safe = filterByAllergy(items, allergyLabels)
  return choice === 'any' ? safe : safe.filter(item => item.category === choice)
}

// ---------- รูปของว่าง ----------
// ค่าใน snack_items.image_url ใส่ได้ 2 แบบ
//   1) ชื่อไฟล์ในที่เก็บรูป Supabase Storage ชื่อ "snacks" เช่น ginger_warm_tea.jpg   <- แบบที่ใช้ตอนเพิ่มเมนูใหม่ (อัปโหลดรูป + พิมพ์ชื่อไฟล์ ไม่ต้องแก้โค้ด)
//   2) ลิงก์เต็ม (ขึ้นต้น http) จะใช้ลิงก์นั้นเลย
// ค่าแบบเก่า "assets/snacks/xxx.png" ก็ยังอ่านได้ (ตัดส่วน assets/snacks/ ออก ใช้แค่ชื่อไฟล์)
// คืนรายการลิงก์ให้หน้าจอลองทีละอัน: 1) Storage 2) โฟลเดอร์สำรอง public/assets/snacks (ไล่นามสกุล png / jpg / jpeg / webp) ถ้าโหลดอันไหนไม่ได้ค่อยลองอันถัดไป
export const SNACK_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

export function snackImageCandidates(imageUrl: string | null | undefined, storageBaseUrl = ''): string[] {
  if (!imageUrl) return []
  if (/^https?:\/\//i.test(imageUrl)) return [imageUrl]
  const file = imageUrl.replace(/^\/+/, '').replace(/^assets\/snacks\//, '')
  const dot = file.lastIndexOf('.')
  const base = dot > 0 ? file.slice(0, dot) : file
  const given = dot > 0 ? file.slice(dot + 1).toLowerCase() : ''
  const list: string[] = []
  if (storageBaseUrl && given) list.push(`${storageBaseUrl}/${base}.${given}`)
  const order = given ? [given, ...SNACK_IMAGE_EXTENSIONS.filter(e => e !== given)] : SNACK_IMAGE_EXTENSIONS
  for (const ext of order) list.push(`/assets/snacks/${base}.${ext}`)
  return list
}

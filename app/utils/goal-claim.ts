// ตัวช่วยของการ์ด "รับผลครบ 28 วัน" (ฟังก์ชันล้วนๆ ไม่ยุ่งกับฐานข้อมูล เลยทดสอบง่าย)

export const CYCLE_LENGTH_DAYS = 28

// กติกาอัปเกรดอวตาร (ตรงกับที่เขียนไว้ใน SQL ส่วน D1)
// เป้าหมายแต่ละข้อ: ต้องทำได้อย่างน้อย minDays วันจาก 28 -> ชิ้นส่วน slot ของอวตารเปลี่ยนเป็น upgradedCode
export interface ClaimRule {
  goalCode: string
  minDays: number
  slot: string // ชื่อชิ้นส่วนอวตารใน user_avatar_state.feature_slot
  upgradedCode: string // asset_code ที่จะเปลี่ยนไปเป็น
  slotLabel: string // ชื่อไทยของชิ้นส่วน ไว้โชว์
  upgradedLabel: string // คำอธิบายสั้นๆ ของแบบใหม่ ไว้โชว์
}

export const CLAIM_RULES: ClaimRule[] = [
  { goalCode: 'sleep_schedule', minDays: 20, slot: 'eyes', upgradedCode: 'eye_alert', slotLabel: 'ตา', upgradedLabel: 'ตาใสสดใส' },
  { goalCode: 'exercise_routine', minDays: 13, slot: 'ears', upgradedCode: 'ear_erect', slotLabel: 'หู', upgradedLabel: 'หูตั้งตรง' },
  { goalCode: 'reduce_sugar', minDays: 20, slot: 'body_color', upgradedCode: 'body_pink', slotLabel: 'สีตัว', upgradedLabel: 'สีชมพูพาสเทล' },
  { goalCode: 'reduce_cold_drinks', minDays: 20, slot: 'fx_overlay', upgradedCode: 'fx_warm_rosy', slotLabel: 'แก้ม', upgradedLabel: 'แก้มอมชมพู มีไออุ่น' }
]

// รอบนี้จบสมบูรณ์แล้วหรือยัง
// ใช้ "วันนี้ > วันสุดท้าย" (ไม่ใช่ >=) เพื่อให้วันที่ 28 ยังติ๊กเช็คอินได้ครบทั้งวัน
// วันที่เป็นข้อความรูปแบบ YYYY-MM-DD เทียบเป็นข้อความได้เลย
export function isCycleFinished(cycleEndDate: string | null | undefined, today: string): boolean {
  if (!cycleEndDate) return false
  return today > cycleEndDate
}

// ผลของเป้าหมายแต่ละข้อในรอบนี้
export interface ClaimItem {
  rule: ClaimRule
  days: number // ทำได้กี่วันจาก 28
  passed: boolean // ถึงเกณฑ์หรือยัง
  alreadyUpgraded: boolean // ชิ้นส่วนนี้เป็นแบบอัปเกรดอยู่แล้วไหม
  willChange: boolean // กดรับผลแล้วอวตารจะเปลี่ยนจริงไหม (ผ่าน และยังไม่เคยอัปเกรด)
}

// ตัดสินผลเฉพาะเป้าหมายที่เปิดอยู่ในรอบนี้
// dayCounts: จำนวนวันที่ทำได้ แยกตาม goal_code, avatar: ชิ้นส่วนอวตารตอนนี้ แยกตาม slot
export function evaluateClaim(
  activeGoalCodes: string[],
  dayCounts: Record<string, number>,
  avatar: Record<string, string | null>
): ClaimItem[] {
  return CLAIM_RULES
    .filter(rule => activeGoalCodes.includes(rule.goalCode))
    .map((rule) => {
      const days = dayCounts[rule.goalCode] ?? 0
      const passed = days >= rule.minDays
      const alreadyUpgraded = avatar[rule.slot] === rule.upgradedCode
      return { rule, days, passed, alreadyUpgraded, willChange: passed && !alreadyUpgraded }
    })
}

// อวตารหลังรับผล: เอาของเดิมมาแล้วเปลี่ยนเฉพาะชิ้นที่ผ่านเกณฑ์
export function applyUpgrades(
  avatar: Record<string, string | null>,
  items: ClaimItem[]
): Record<string, string | null> {
  const next = { ...avatar }
  for (const item of items) {
    if (item.willChange) next[item.rule.slot] = item.rule.upgradedCode
  }
  return next
}

// วันเริ่ม-วันจบของรอบใหม่ (เริ่มวันที่กดรับผลจริง แล้วบวก 27 วัน = ครบ 28 วัน)
export function nextCycleDates(today: string): { start: string, end: string } {
  const [y, m, d] = today.split('-').map(Number)
  const endDate = new Date(y!, m! - 1, d! + CYCLE_LENGTH_DAYS - 1)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  return { start: today, end }
}

// ตัวช่วยของการ์ด "รับผลครบ 28 วัน" (ฟังก์ชันล้วนๆ ไม่ยุ่งกับฐานข้อมูล เลยทดสอบง่าย)

export const CYCLE_LENGTH_DAYS = 28

// กติกาอัปเกรดอวตาร: ไล่ระดับทีละขั้น (ไม่ข้ามไปขั้นสูงสุดทีเดียว)
// เป้าหมายแต่ละข้อ: ทำได้อย่างน้อย minDays วันจาก 28 -> ชิ้นส่วน slot ของอวตารขยับขึ้น 1 ขั้นตามลำดับใน tiers
// tiers เรียงจาก "แย่สุด -> ดีสุด" (ตัวแรกคือท่าตอนเริ่มต้นที่ยังไม่ได้ทำเป้าหมาย)
// อยากเปลี่ยนลำดับขั้น แก้ที่ tiers ของแต่ละข้อได้เลย
export interface ClaimRule {
  goalCode: string
  minDays: number // ต้องทำได้กี่วันจาก 28 ถึงจะผ่าน
  slot: string // ชื่อชิ้นส่วนอวตารใน user_avatar_state.feature_slot
  tiers: string[] // asset_code เรียงจากแย่สุด -> ดีสุด
}

export const CLAIM_RULES: ClaimRule[] = [
  { goalCode: 'sleep_schedule', minDays: 20, slot: 'eyes', tiers: ['eye_exhausted', 'eye_sleepy', 'eye_alert'] },
  { goalCode: 'exercise_routine', minDays: 13, slot: 'ears', tiers: ['ear_droop', 'ear_half_droop', 'ear_erect'] },
  // สีตัวในฐานข้อมูล: ชมพู = ทานของหวานนานๆ ครั้ง (ดีสุด), เหลือง = สัปดาห์ละ 3-4 วัน, คาราเมล = ทานทุกวัน (แย่สุด)
  { goalCode: 'reduce_sugar', minDays: 20, slot: 'body_color', tiers: ['body_caramel', 'body_yellow', 'body_pink'] },
  { goalCode: 'reduce_cold_drinks', minDays: 20, slot: 'fx_overlay', tiers: ['fx_shivering_cold', 'fx_sweat_nose', 'fx_warm_rosy'] }
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
  nextCode: string | null // ชิ้นส่วนขั้นถัดไปที่จะได้ (null = อยู่ขั้นสูงสุดแล้วหรือไม่รู้จักรหัสปัจจุบัน)
  willChange: boolean // กดรับผลแล้วอวตารจะเปลี่ยนจริงไหม (ผ่าน และยังไม่ถึงขั้นสูงสุด)
}

// ขั้นถัดไปของชิ้นส่วน: ขยับขึ้น 1 ขั้น ถ้าอยู่ขั้นสูงสุดแล้วหรือรหัสไม่อยู่ในลำดับ จะไม่เปลี่ยน (null)
export function nextTierCode(rule: ClaimRule, currentCode: string | null | undefined): string | null {
  if (!currentCode) return null
  const index = rule.tiers.indexOf(currentCode)
  if (index === -1 || index >= rule.tiers.length - 1) return null
  return rule.tiers[index + 1] ?? null
}

// ตัดสินผลเฉพาะเป้าหมายที่เปิดอยู่ในรอบนี้ เรียงข้อที่ผ่านขึ้นก่อน ข้อที่ไม่ผ่านไว้ล่าง (ลำดับเดิมในแต่ละกลุ่ม)
// dayCounts: จำนวนวันที่ทำได้ แยกตาม goal_code, avatar: ชิ้นส่วนอวตารตอนนี้ แยกตาม slot
export function evaluateClaim(
  activeGoalCodes: string[],
  dayCounts: Record<string, number>,
  avatar: Record<string, string | null>
): ClaimItem[] {
  const items = CLAIM_RULES
    .filter(rule => activeGoalCodes.includes(rule.goalCode))
    .map((rule) => {
      const days = dayCounts[rule.goalCode] ?? 0
      const passed = days >= rule.minDays
      const nextCode = nextTierCode(rule, avatar[rule.slot])
      return { rule, days, passed, nextCode, willChange: passed && nextCode !== null }
    })
  return [...items.filter(i => i.passed), ...items.filter(i => !i.passed)]
}

// อวตารหลังรับผล: เอาของเดิมมาแล้วขยับขึ้น 1 ขั้นเฉพาะชิ้นที่ผ่านเกณฑ์
export function applyUpgrades(
  avatar: Record<string, string | null>,
  items: ClaimItem[]
): Record<string, string | null> {
  const next = { ...avatar }
  for (const item of items) {
    if (item.willChange && item.nextCode) next[item.rule.slot] = item.nextCode
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

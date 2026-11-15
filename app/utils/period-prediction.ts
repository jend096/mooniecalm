// คำนวณวันที่ประจำเดือนคาดว่าจะมา และเช็กว่าเลยกำหนดหรือยัง
const MS_PER_DAY = 86400000

// แปลง "YYYY-MM-DD" เป็น Date ตามเวลาท้องถิ่น (ไม่โดนชิฟต์เป็น UTC)
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

// ตัดเวลาทิ้ง เหลือแค่วันที่ (เที่ยงคืนของวันนั้น)
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export interface PeriodPrediction {
  predictedDate: Date // วันที่คาดว่าจะมา
  isLate: boolean // เลยวันที่คาดไว้แล้วหรือยัง
  daysLate: number // เลยมากี่วัน (0 ถ้ายังไม่เลย)
  daysUntil: number // อีกกี่วันจะถึง (0 ถ้าถึงแล้วหรือเลยแล้ว)
}

export function predictNextPeriod(
  lastPeriodDate: string,
  cycleLengthDays: number,
  today: Date = new Date()
): PeriodPrediction {
  // วันที่คาดไว้ = วันเริ่มรอบล่าสุด + ความยาวรอบ
  const predictedDate = parseLocalDate(lastPeriodDate)
  predictedDate.setDate(predictedDate.getDate() + cycleLengthDays)

  // วันนี้ − วันที่คาดไว้ (บวก = เลยกำหนด, ลบ = ยังไม่ถึง)
  const diffDays = Math.round((startOfDay(today).getTime() - predictedDate.getTime()) / MS_PER_DAY)

  return {
    predictedDate,
    isLate: diffDays > 0,
    daysLate: Math.max(0, diffDays),
    daysUntil: Math.max(0, -diffDays)
  }
}

// จำนวนวันระหว่างสองวันที่ (b - a) บวก = b อยู่หลัง a
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY)
}

// ===== ส่วนของหน้าปฏิทิน =====

// ข้อมูล 1 แถวจากตาราง period_cycles (ชื่อฟิลด์ตรงกับคอลัมน์ในฐานข้อมูล)
export interface PeriodRow {
  id?: number
  cycle_start_date: string // วันที่ประจำเดือนมาจริง
  confirmed_end_date: string | null // วันที่หมดจริง (null = ยังไม่ได้บอก)
  predicted_start_date: string | null // วันที่ระบบเคยคาดไว้ตอนนั้น (null = ไม่มีข้อมูล)
  assumed?: boolean // true = แถวสมมติจากวันที่กรอกตอน onboarding (ยังไม่เคยกด "มาแล้ว") ไม่ใช่ข้อมูลจริงในตาราง
}

// 'logged'    = มาจริง (บันทึกแล้ว)             -> วงสีทึบ
// 'predicted' = ระบบคาดไว้ (อนาคต หรือ ของรอบเก่าที่มาไม่ตรง) -> วงเส้นประ
// 'none'      = วันธรรมดา
export type DayKind = 'logged' | 'predicted' | 'none'

const MAX_PREDICTED_CYCLES = 1 // คาดล่วงหน้ากี่รอบ (1 = เฉพาะรอบหน้ารอบเดียว ไม่ให้เส้นประเต็มปฏิทิน)

// ประจำเดือนที่ "ยังไม่กดบอกว่าหมด" ยอมให้ขยายต่อได้สูงสุดกี่วัน (นับวันเริ่มเป็นวันที่ 1)
// กันไม่ให้รอบเก่าที่ไม่เคยกดหมด ถูกแรเงายาวไปเรื่อยๆ
const MAX_PERIOD_DAYS = 10

// วันสุดท้ายของช่วงมีประจำเดือนของแถวนี้ มี 3 กรณี (ดูตามลำดับ เจอข้อไหนก่อนใช้ข้อนั้น)
// 1) ผู้ใช้กดบอกวันหมดแล้ว                         -> ใช้วันนั้น
// 2) ยังไม่กดหมด แต่วันนี้เลย "วันสุดท้ายที่ตั้งไว้" มาแล้ว
//    และยังไม่เกินเพดาน 10 วัน                      -> ถือว่ายังไม่จบ ขยายต่อถึง "วันนี้"
// 3) นอกนั้น                                       -> ใช้วันสุดท้ายที่ตั้งไว้ (วันเริ่ม + จำนวนวัน - 1)
// today ใส่ค่าเองได้ เพื่อทดสอบด้วยวันที่สมมติ (ถ้าไม่ใส่ ใช้วันนี้จริง)
export function getRowEnd(row: PeriodRow, periodDays: number, today: Date = startOfDay(new Date())): Date {
  // กรณี 1
  if (row.confirmed_end_date) return parseLocalDate(row.confirmed_end_date)

  const start = parseLocalDate(row.cycle_start_date)

  // วันสุดท้ายที่ตั้งไว้ = วันเริ่ม + จำนวนวัน - 1 (-1 เพราะวันเริ่มนับเป็นวันที่ 1)
  const expectedEnd = new Date(start)
  expectedEnd.setDate(expectedEnd.getDate() + periodDays - 1)

  // เพดาน = วันเริ่ม + 9 (รวมวันเริ่มเป็นวันที่ 10)
  const hardLimit = new Date(start)
  hardLimit.setDate(hardLimit.getDate() + MAX_PERIOD_DAYS - 1)

  // กรณี 2: ยังไม่กดหมด และยังไม่เลยเพดาน -> สีทึบถึง "วันนี้" เท่านั้น
  // (วันที่ยังมาไม่ถึงในช่วงที่ตั้งไว้ ไม่ใช่ของจริง ให้เป็นเส้นประแทน ดูใน getDayKind ข้อ 1.6)
  // ถ้าเลยวันสุดท้ายที่ตั้งไว้แล้วก็ขยายต่อถึงวันนี้เหมือนเดิม จนกว่าจะเลยเพดาน
  const isWithinLimit = daysBetween(today, hardLimit) >= 0
  if (isWithinLimit && daysBetween(start, today) >= 0) return new Date(today)

  // กรณี 3
  return expectedEnd
}

export function getDayKind(
  date: Date,
  rows: PeriodRow[],
  periodDays: number,
  cycleLengthDays: number
): DayKind {
  if (rows.length === 0) return 'none'

  // 1) มาจริง: วันนี้อยู่ระหว่าง "วันเริ่ม" ถึง "วันหมด" ของแถวไหนสักแถว -> สีทึบ (ชนะเส้นประเสมอ)
  // แถวสมมติจาก onboarding ข้ามไป (ผู้ใช้ยังไม่ได้ยืนยันว่ามา) ไปเป็นเส้นประในข้อ 1.5 แทน
  for (const row of rows) {
    if (row.assumed) continue
    const start = parseLocalDate(row.cycle_start_date)
    const end = getRowEnd(row, periodDays)
    if (daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0) return 'logged'
  }

  // 1.5) แถวสมมติจาก onboarding: วันที่กรอกไว้ = เส้นประ จนกว่าผู้ใช้จะกด "มาแล้ว" (ถึงจะกลายเป็นแถวจริง = สีทึบ)
  for (const row of rows) {
    if (!row.assumed) continue
    const diff = daysBetween(parseLocalDate(row.cycle_start_date), date)
    if (diff >= 0 && diff < periodDays) return 'predicted'
  }

  // 1.6) แถวจริงที่ยังไม่กดหมด: วันที่ยังมาไม่ถึงในช่วงที่ตั้งไว้ = เส้นประ (ยังเป็นแค่การคาด)
  for (const row of rows) {
    if (row.assumed || row.confirmed_end_date) continue
    const diff = daysBetween(parseLocalDate(row.cycle_start_date), date)
    if (diff >= 0 && diff < periodDays) return 'predicted'
  }

  // 2) เส้นประของรอบเก่า: วันที่ระบบเคยคาดไว้ (เก็บไว้ในแถวนั้น ต่อให้มาจริงคนละวันก็ยังอยู่)
  for (const row of rows) {
    if (!row.predicted_start_date) continue
    // ถ้าที่คาดไว้ใกล้กับวันที่มาจริง (คลาดไม่เกิน 2 วัน) ไม่ต้องเก็บเส้นประเก่า เพราะวงทึบอยู่ตรงนั้นแล้ว
    const drift = daysBetween(parseLocalDate(row.predicted_start_date), parseLocalDate(row.cycle_start_date))
    if (Math.abs(drift) <= 2) continue
    const diff = daysBetween(parseLocalDate(row.predicted_start_date), date)
    if (diff >= 0 && diff < periodDays) return 'predicted'
  }

  // 3) เส้นประของอนาคต: นับต่อจากรอบล่าสุด + ความยาวรอบ ไปเรื่อยๆ
  const latest = rows.map(r => r.cycle_start_date).sort().at(-1)!
  const latestStart = parseLocalDate(latest)
  for (let k = 1; k <= MAX_PREDICTED_CYCLES; k++) {
    const predictedStart = new Date(latestStart)
    predictedStart.setDate(predictedStart.getDate() + k * cycleLengthDays)
    const diff = daysBetween(predictedStart, date)
    if (diff >= 0 && diff < periodDays) return 'predicted'
  }

  return 'none'
}

// สร้างตารางของเดือนหนึ่ง: คืนค่าเป็น "ช่องวัน" ทั้งหมดเรียงตามลำดับ
// ช่องว่างหน้าเดือน (ก่อนวันที่ 1) เป็น null เพื่อให้วันที่ 1 ไปตกตรงวันในสัปดาห์ที่ถูกต้อง
// monthIndex: 0 = มกราคม ... 11 = ธันวาคม, สัปดาห์เริ่มที่วันอาทิตย์
export function buildMonthCells(year: number, monthIndex: number): (Date | null)[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay() // 0 = อาทิตย์
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (Date | null)[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d))
  return cells
}

// ประมาณความยาวรอบจากประวัติจริงของผู้ใช้
// starts = วันเริ่มรอบที่บันทึกไว้ (YYYY-MM-DD), fallback = ค่าเริ่มต้นถ้ายังไม่มีข้อมูลพอ
export function estimateCycleLength(starts: string[], fallback: number): number {
  // 1) เรียงจากเก่าไปใหม่
  const sorted = [...starts].sort()

  // 2) หาช่วงห่าง (วัน) ระหว่างวันเริ่มที่อยู่ติดกัน
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(daysBetween(parseLocalDate(sorted[i - 1]!), parseLocalDate(sorted[i]!)))
  }

  // 3) เก็บเฉพาะช่วงห่าง 21-45 วัน (นอกช่วงนี้อาจเกิดจากลืมบันทึกบางรอบ หรือกดผิด จึงไม่เอามาเฉลี่ย)
  const valid = gaps.filter(gap => gap >= 21 && gap <= 45)

  // 4) ไม่มีช่วงห่างที่ใช้ได้เลย (เช่น ยังบันทึกไม่ถึง 2 รอบ) -> ใช้ค่าเริ่มต้น
  if (valid.length === 0) return fallback

  // 5) เอา 3 ค่าล่าสุด (รอบใหม่สะท้อนตัวผู้ใช้ตอนนี้ดีกว่ารอบเก่า) เฉลี่ย แล้วปัดเป็นจำนวนเต็ม
  const recent = valid.slice(-3)
  const total = recent.reduce((sum, gap) => sum + gap, 0)
  return Math.round(total / recent.length)
}

// ระยะห่างขั้นต่ำระหว่างวันเริ่มสองรอบ ถ้าใกล้กว่านี้ ระบบถือว่าแถวหลังเป็นการกดซ้ำ/กดผิด ไม่นับเป็นรอบใหม่
export const MIN_CYCLE_GAP_DAYS = 21

// ตัดแถวที่ "กดซ้ำ/กดผิด" ออก: แถวที่วันเริ่มห่างจากแถวก่อนหน้า (ที่นับแล้ว) ไม่ถึง 21 วัน
// เรียงจากเก่าไปใหม่ เก็บแถวแรกไว้เสมอ ใช้กับทุกอย่างที่ต้องแสดงสี/คำนวณ (แถวในฐานข้อมูลยังอยู่ ลบได้ที่เมนูตอนกดวัน)
export function dropStrayRows(rows: PeriodRow[]): PeriodRow[] {
  const sorted = [...rows].sort((a, b) => a.cycle_start_date.localeCompare(b.cycle_start_date))
  const kept: PeriodRow[] = []
  for (const row of sorted) {
    const prev = kept.at(-1)
    if (prev && daysBetween(parseLocalDate(prev.cycle_start_date), parseLocalDate(row.cycle_start_date)) < MIN_CYCLE_GAP_DAYS) continue
    kept.push(row)
  }
  return kept
}

// ประมาณ "ประจำเดือนมากี่วัน" จากรอบล่าสุดที่ผู้ใช้กดวันหมดไว้แล้ว
// fallback = ค่าที่กรอกตอน onboarding (ใช้เมื่อยังไม่เคยกดหมดเลย)
// นับวันเริ่มเป็นวันที่ 1 จึงบวก 1 / เก็บเฉพาะ 2-10 วัน (วันเดียวหรือเกิน 10 วันมักเกิดจากกดผิด/กดซ้ำ จึงข้าม)
export function estimatePeriodLength(rows: PeriodRow[], fallback: number): number {
  const ended = rows
    .filter(r => !r.assumed && r.confirmed_end_date)
    .sort((a, b) => a.cycle_start_date.localeCompare(b.cycle_start_date))
  for (let i = ended.length - 1; i >= 0; i--) {
    const row = ended[i]!
    const len = daysBetween(parseLocalDate(row.cycle_start_date), parseLocalDate(row.confirmed_end_date!)) + 1
    if (len >= 2 && len <= 10) return len
  }
  return fallback
}

// ===== ตัดสินว่า "ตอนนี้ควรเด้งป๊อปอัพอะไรให้ผู้ใช้" =====
// ผลลัพธ์: null = ไม่ต้องถามอะไร  |  { code, days? } = ควรเด้งป๊อปอัพนี้
// code ใช้ชื่อเดียวกับ notif_code ในตาราง notification_types (ทีหลังผูกกับระบบแจ้งเตือนได้เลย)
export type PeriodPromptCode = 'period_end_popup' | 'period_arrival_popup' | 'pre_period_info'

export function getPeriodPrompt(
  rows: PeriodRow[],
  periodDays: number,
  cycleDays: number,
  today: Date = startOfDay(new Date())
): { code: PeriodPromptCode; days?: number } | null {
  if (rows.length === 0) return null
  // ---------- ขั้น 1: เตรียมข้อมูล 3 อย่างไว้ใช้ ----------
  // แถวล่าสุด = แถวที่วันเริ่มรอบใหม่ที่สุด
  const latest = [...rows]
    .sort((a, b) =>
      a.cycle_start_date.localeCompare(b.cycle_start_date)
    )
    .at(-1)!
  // sinceStart = วันนี้ห่างจาก "วันเริ่มรอบล่าสุด" กี่วัน
  // วันเริ่ม = 0, วันถัดไป = 1, ...
  const sinceStart = daysBetween(
    parseLocalDate(latest.cycle_start_date),
    today
  )
  // next = ผลคำนวณรอบหน้า
  const next = predictNextPeriod(
    latest.cycle_start_date,
    cycleDays,
    today
  )
  // ---------- แถวสมมติจาก onboarding: ถึงวันที่กรอกไว้แล้ว -> ถามว่ามาหรือยัง (ยังไม่ถาม "หมดหรือยัง") ----------
  // ถ้ากด "ยังไม่มา" วันนี้ก็ไม่ถามซ้ำ พรุ่งนี้ถามใหม่ และวันยังเป็นเส้นประอยู่
  if (latest.assumed) {
    return sinceStart >= 0 ? { code: 'period_arrival_popup' } : null
  }
  // ---------- ขั้น 2: ถามว่า "ประจำเดือนหมดหรือยัง" ----------
  // ยังไม่เคยกดว่าประจำเดือนหมด
  const hasNoEndDate = !latest.confirmed_end_date
  const reachedLastDay = sinceStart >= periodDays - 1
  // จำกัดไม่ให้ถามเรื่อง "หมดหรือยัง" ถ้าเลยวันเริ่มมาเกิน 10 วัน
  // วันเริ่มนับเป็นวันที่ 1 ดังนั้น sinceStart สูงสุด = 9
  const notTooLate = sinceStart <= 9
  if (hasNoEndDate && reachedLastDay && notTooLate) {
    return { code: 'period_end_popup' }
  }
  // ---------- ขั้น 3: ถามว่า "ประจำเดือนมาหรือยัง" ----------
  // ถึงวันที่คาดว่าจะมาแล้ว หรือเลยวันที่คาดมาแล้ว
  const reachedPredictedDay =
    next.isLate || next.daysUntil === 0

  if (reachedPredictedDay) {
    return { code: 'period_arrival_popup' }
  }
  // ---------- ขั้น 4: แจ้งล่วงหน้า "ใกล้ถึงรอบแล้วนะ" ----------
  // เหลือ 1–3 วันก่อนวันที่คาด
  const isNear =
    next.daysUntil >= 1 &&
    next.daysUntil <= 3
  if (isNear) {
    return {
      code: 'pre_period_info',
      days: next.daysUntil
    }
  }
  // ไม่เข้าเงื่อนไขไหนเลย -> ไม่ต้องเด้งอะไร
  return null
}

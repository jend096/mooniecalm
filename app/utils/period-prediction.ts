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
}

// 'logged'    = มาจริง (บันทึกแล้ว)             -> วงสีทึบ
// 'predicted' = ระบบคาดไว้ (อนาคต หรือ ของรอบเก่าที่มาไม่ตรง) -> วงเส้นประ
// 'none'      = วันธรรมดา
export type DayKind = 'logged' | 'predicted' | 'none'

const MAX_PREDICTED_CYCLES = 12 // คาดล่วงหน้าสูงสุดกี่รอบ

// วันสุดท้ายของช่วงมีประจำเดือนของแถวนี้
// ถ้าผู้ใช้กดบอกวันหมดแล้วใช้วันนั้น ถ้ายังไม่บอกให้ประมาณจากจำนวนวันที่ตั้งไว้
export function getRowEnd(row: PeriodRow, periodDays: number): Date {
  if (row.confirmed_end_date) return parseLocalDate(row.confirmed_end_date)
  const end = parseLocalDate(row.cycle_start_date)
  end.setDate(end.getDate() + periodDays - 1)
  return end
}

export function getDayKind(
  date: Date,
  rows: PeriodRow[],
  periodDays: number,
  cycleLengthDays: number
): DayKind {
  if (rows.length === 0) return 'none'

  // 1) มาจริง: วันนี้อยู่ระหว่าง "วันเริ่ม" ถึง "วันหมด" ของแถวไหนสักแถว -> สีทึบ (ชนะเส้นประเสมอ)
  for (const row of rows) {
    const start = parseLocalDate(row.cycle_start_date)
    const end = getRowEnd(row, periodDays)
    if (daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0) return 'logged'
  }

  // 2) เส้นประของรอบเก่า: วันที่ระบบเคยคาดไว้ (เก็บไว้ในแถวนั้น ต่อให้มาจริงคนละวันก็ยังอยู่)
  for (const row of rows) {
    if (!row.predicted_start_date) continue
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

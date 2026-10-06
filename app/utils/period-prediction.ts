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
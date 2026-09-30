export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']

// day: 1-31, monthIndex: 0-11, yearBE: Buddhist Era year -> "YYYY-MM-DD" (Gregorian, for Postgres `date` columns)
export function thaiDateToIso(day: number, monthIndex: number, yearBE: number): string {
  const yearAD = yearBE - 543
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  return `${yearAD}-${month}-${dayStr}`
}

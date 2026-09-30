// Date -> "YYYY-MM-DD" using the device's local timezone (Thai time), not UTC.
// Use this instead of toISOString().slice(0, 10), which shifts dates by a day between 00:00-07:00 in Thailand.
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

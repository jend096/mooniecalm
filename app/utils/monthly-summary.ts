// ===== ตัวช่วยหน้า "สรุปเดือน" (app/utils/monthly-summary.ts) =====
// แยก 2 ส่วน
//   1) ฟังก์ชันล้วนๆ: แปลงรอบประจำเดือนเป็นตัวเลือก "เดือน", คำนวณสถิติความปวด (ไม่แตะฐานข้อมูล)
//   2) ฟังก์ชันคุยกับ Supabase: ดึงความปวดรายวัน, ผลคู่มือ/ของว่าง, อาการเพิ่มเติมของแต่ละรอบ
//
// คำว่า "เดือน" ในหน้านี้ = 1 รอบประจำเดือน (วันเริ่ม ถึง วันหมด) ตั้งชื่อตามเดือนของวันเริ่ม
// ข้อมูลทุกอย่างคัดตาม log_date / checkin_date ที่อยู่ในช่วงวันของรอบนั้น
import { getAuthedSupabaseClient } from '~/utils/supabase-authed-client'
import { dropStrayRows, getRowEnd, daysBetween, parseLocalDate, startOfDay, type PeriodRow } from '~/utils/period-prediction'
import { getLocalDateString } from '~/utils/date-helpers'
import { THAI_MONTHS } from '~/utils/thai-calendar'
import { FLOW_AMOUNT_OPTIONS } from '~/utils/extra-logs'
import { SNACK_CATEGORY_LABEL } from '~/utils/snack-picker'

export const MAX_COMPARE_MONTHS = 3

export const SHORT_THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

// ---------- ส่วนที่ 1: ฟังก์ชันล้วนๆ ----------

export interface CycleOption {
  key: string // วันเริ่มรอบ YYYY-MM-DD (ใช้เป็นตัวระบุ)
  start: string
  end: string // วันหมดของรอบ YYYY-MM-DD
  length: number // จำนวนวันที่มีประจำเดือน (นับวันเริ่มเป็นวันที่ 1)
  ended: boolean // ผู้ใช้กดบอกวันหมดแล้วหรือยัง
  chipLabel: string // เช่น "ก.ย. 2569"
  fullLabel: string // เช่น "กันยายน 2569"
  rangeText: string // เช่น "3–7 ต.ค."
}

function rangeTextOf(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  return sameMonth
    ? `${start.getDate()}–${end.getDate()} ${SHORT_THAI_MONTHS[end.getMonth()]}`
    : `${start.getDate()} ${SHORT_THAI_MONTHS[start.getMonth()]}–${end.getDate()} ${SHORT_THAI_MONTHS[end.getMonth()]}`
}

// แปลงแถว period_cycles เป็นตัวเลือกเดือน เรียงใหม่สุดก่อน (ข้ามแถวสมมติจาก onboarding กับแถวที่กดซ้ำ/กดผิด)
export function buildCycleOptions(rows: PeriodRow[], periodDays: number, today: Date = startOfDay(new Date())): CycleOption[] {
  return dropStrayRows(rows)
    .filter(r => !r.assumed)
    .map((row) => {
      const start = parseLocalDate(row.cycle_start_date)
      const end = getRowEnd(row, periodDays, today)
      const yearBE = start.getFullYear() + 543
      return {
        key: row.cycle_start_date,
        start: row.cycle_start_date,
        end: getLocalDateString(end),
        length: Math.max(1, daysBetween(start, end) + 1),
        ended: !!row.confirmed_end_date,
        chipLabel: `${SHORT_THAI_MONTHS[start.getMonth()]} ${yearBE}`,
        fullLabel: `${THAI_MONTHS[start.getMonth()]} ${yearBE}`,
        rangeText: rangeTextOf(start, end)
      }
    })
    .sort((a, b) => b.start.localeCompare(a.start))
}

// เดือนที่แสดงเมื่อผู้ใช้ยังไม่เลือก: รอบล่าสุดที่กดวันหมดแล้ว (ไม่มีเลย = รอบล่าสุด)
export function defaultCycleKeys(options: CycleOption[]): string[] {
  const latest = options.find(o => o.ended) ?? options[0]
  return latest ? [latest.key] : []
}

export interface PainPoint {
  day: number // วันที่ของรอบ (วันเริ่ม = 1)
  level: number
}

export interface PainStats {
  maxDay: number | null
  maxLevel: number | null
  average: number | null
  recordedDays: number
}

// ปวดสูงสุด = วันที่ระดับมากที่สุด (เท่ากันเอาวันแรก) / เฉลี่ย = เฉลี่ยเฉพาะวันที่มีบันทึก ปัดทศนิยม 1 ตำแหน่ง
export function computePainStats(points: PainPoint[]): PainStats {
  if (!points.length) return { maxDay: null, maxLevel: null, average: null, recordedDays: 0 }
  let top = points[0]!
  for (const p of points) {
    if (p.level > top.level || (p.level === top.level && p.day < top.day)) top = p
  }
  const total = points.reduce((sum, p) => sum + p.level, 0)
  return {
    maxDay: top.day,
    maxLevel: top.level,
    average: Math.round((total / points.length) * 10) / 10,
    recordedDays: points.length
  }
}

function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

// ---------- ส่วนที่ 2: ฟังก์ชันคุยกับ Supabase ----------

// ความปวดรายวัน (ค่าสูงสุดของวัน จาก daily_checkins.pain_level) ของหลายรอบ ดึงครั้งเดียวแล้วแบ่งเข้ารอบ
export async function loadPainByCycle(profileId: number, cycles: CycleOption[]): Promise<Record<string, PainPoint[]>> {
  const result: Record<string, PainPoint[]> = {}
  if (!cycles.length) return result
  const from = cycles.map(c => c.start).sort()[0]!
  const to = cycles.map(c => c.end).sort().at(-1)!

  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from('daily_checkins')
    .select('checkin_date, pain_level')
    .eq('user_id', profileId)
    .gte('checkin_date', from)
    .lte('checkin_date', to)
    .not('pain_level', 'is', null)
  if (error) throw error

  for (const cycle of cycles) {
    const startDate = parseLocalDate(cycle.start)
    const points: PainPoint[] = []
    for (const row of data ?? []) {
      const day = daysBetween(startDate, parseLocalDate(row.checkin_date as string)) + 1
      if (day >= 1 && day <= cycle.length) points.push({ day, level: row.pain_level as number })
    }
    result[cycle.key] = points.sort((a, b) => a.day - b.day)
  }
  return result
}

export interface UsageRow {
  id: string
  name: string
  total: number // ทำ/เลือกไปกี่ครั้ง
  felt: number // รู้สึกดีขึ้นกี่ครั้ง
  percent: number
}

export interface CycleDetails {
  guideTotal: { total: number, felt: number, percent: number }
  guides: UsageRow[]
  snackTotal: { total: number, felt: number, percent: number }
  snackCategories: UsageRow[]
  flow: { code: string, label: string, count: number }[]
  symptoms: { label: string, count: number }[]
}

// ผลหลังทำตามคู่มือ/ของว่าง + อาการเพิ่มเติม ของรอบเดียว
// คู่มือนับเฉพาะที่กด "ทำแล้ว" (done_at) / ของว่างนับทุกเมนูที่เลือก / "รู้สึกดีขึ้น" = felt_better เป็น true
export async function loadCycleDetails(profileId: number, cycle: CycleOption): Promise<CycleDetails> {
  const authed = await getAuthedSupabaseClient()
  const [guideLogs, guideRefs, snackLogs, snackRefs, bodyLogs, symptomLogs, symptomRefs] = await Promise.all([
    authed.from('guide_logs').select('guide_id, done_at, felt_better').eq('user_id', profileId).gte('log_date', cycle.start).lte('log_date', cycle.end),
    authed.from('pain_relief_guides').select('id, title'),
    authed.from('snack_logs').select('snack_id, felt_better').eq('user_id', profileId).gte('log_date', cycle.start).lte('log_date', cycle.end),
    authed.from('snack_items').select('id, category'),
    authed.from('daily_body_logs').select('flow_amount').eq('user_id', profileId).gte('log_date', cycle.start).lte('log_date', cycle.end),
    authed.from('symptom_logs').select('symptom_id').eq('user_id', profileId).gte('log_date', cycle.start).lte('log_date', cycle.end),
    authed.from('symptom_types').select('id, label')
  ])
  for (const res of [guideLogs, guideRefs, snackLogs, snackRefs, bodyLogs, symptomLogs, symptomRefs]) {
    if (res.error) throw res.error
  }

  // คู่มือ: รวมเป็นรายการต่อคู่มือ เรียงทำบ่อยสุดก่อน
  const guideTitle = new Map((guideRefs.data ?? []).map(g => [g.id as number, g.title as string]))
  const guideMap = new Map<number, { total: number, felt: number }>()
  for (const row of guideLogs.data ?? []) {
    if (!row.done_at) continue
    const entry = guideMap.get(row.guide_id as number) ?? { total: 0, felt: 0 }
    entry.total++
    if (row.felt_better === true) entry.felt++
    guideMap.set(row.guide_id as number, entry)
  }
  const guides: UsageRow[] = [...guideMap.entries()]
    .map(([id, v]) => ({ id: String(id), name: guideTitle.get(id) ?? 'คู่มือ', total: v.total, felt: v.felt, percent: percentOf(v.felt, v.total) }))
    .sort((a, b) => b.total - a.total || b.percent - a.percent)
  const guideSum = guides.reduce((s, g) => ({ total: s.total + g.total, felt: s.felt + g.felt }), { total: 0, felt: 0 })

  // ของว่าง: รวมเป็นรายการต่อหมวด
  const snackCategory = new Map((snackRefs.data ?? []).map(s => [s.id as number, s.category as string]))
  const catMap = new Map<string, { total: number, felt: number }>()
  for (const row of snackLogs.data ?? []) {
    const cat = snackCategory.get(row.snack_id as number)
    if (!cat) continue
    const entry = catMap.get(cat) ?? { total: 0, felt: 0 }
    entry.total++
    if (row.felt_better === true) entry.felt++
    catMap.set(cat, entry)
  }
  const labels = SNACK_CATEGORY_LABEL as Record<string, string>
  const snackCategories: UsageRow[] = [...catMap.entries()]
    .map(([cat, v]) => ({ id: cat, name: `หมวด${labels[cat] ?? cat}`, total: v.total, felt: v.felt, percent: percentOf(v.felt, v.total) }))
    .sort((a, b) => b.total - a.total || b.percent - a.percent)
  const snackSum = snackCategories.reduce((s, c) => ({ total: s.total + c.total, felt: s.felt + c.felt }), { total: 0, felt: 0 })

  // ปริมาณเลือด: นับจำนวนวัน เรียงมาก -> น้อย
  const flowCount = new Map<string, number>()
  for (const row of bodyLogs.data ?? []) {
    const code = row.flow_amount as string | null
    if (code) flowCount.set(code, (flowCount.get(code) ?? 0) + 1)
  }
  const flow = [...FLOW_AMOUNT_OPTIONS].reverse()
    .map(o => ({ code: o.code, label: o.label, count: flowCount.get(o.code) ?? 0 }))
    .filter(o => o.count > 0)

  // อาการอื่นๆ: นับจำนวนวัน เรียงบ่อยสุดก่อน
  const symptomLabel = new Map((symptomRefs.data ?? []).map(s => [s.id as number, s.label as string]))
  const symptomCount = new Map<number, number>()
  for (const row of symptomLogs.data ?? []) {
    symptomCount.set(row.symptom_id as number, (symptomCount.get(row.symptom_id as number) ?? 0) + 1)
  }
  const symptoms = [...symptomCount.entries()]
    .map(([id, count]) => ({ label: symptomLabel.get(id) ?? 'อาการ', count }))
    .sort((a, b) => b.count - a.count)

  return {
    guideTotal: { ...guideSum, percent: percentOf(guideSum.felt, guideSum.total) },
    guides,
    snackTotal: { ...snackSum, percent: percentOf(snackSum.felt, snackSum.total) },
    snackCategories,
    flow,
    symptoms
  }
}

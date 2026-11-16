// ===== บันทึก "ประจำเดือนมาวันนี้" (app/utils/log-period-start.ts) =====
// ใช้ร่วมกัน 2 ที่: ปุ่มในเมนูกดวัน (PeriodDaySheet) และปุ่ม "มาแล้ว" ในป๊อปอัพหน้า home
// รวมไว้ที่เดียว กติกาจะได้ตรงกันทุกทาง (เดิมแยกกัน ทำให้กด "มาแล้ว" แล้วเด้งถามซ้อนอีกรอบ)
import type { PeriodRow } from '~/utils/period-prediction'
import { MIN_CYCLE_GAP_DAYS, daysBetween, parseLocalDate, predictNextPeriod } from '~/utils/period-prediction'

export interface LogPeriodStartResult {
  ok: boolean
  message: string // ข้อความบอกผู้ใช้ (สำเร็จหรือไม่สำเร็จ)
}

export async function logPeriodStart(args: {
  profileId: number
  date: Date // วันที่ประจำเดือนมา
  allRows: PeriodRow[] // แถวที่ใช้แสดงผล (รวมแถวสมมติจาก onboarding ถ้ายังไม่เคยบันทึก)
  cycleDays: number
}): Promise<LogPeriodStartResult> {
  const { profileId, date, allRows, cycleDays } = args
  const dateStr = getLocalDateString(date)

  // แถวล่าสุดที่ใช้แสดงผล (อาจเป็นแถวสมมติจาก onboarding)
  const latestRow = [...allRows].sort((a, b) => a.cycle_start_date.localeCompare(b.cycle_start_date)).at(-1) ?? null

  // จดวันที่ระบบคาดไว้ "ก่อนบันทึก" (บันทึกแล้วระบบคำนวณใหม่ ค่าเดิมจะหาย) ไว้ทำเส้นประของรอบที่คาดผิด
  let predictedStr: string | null = null
  let drift: number | null = null // บวก = มาช้า, ลบ = มาเร็ว
  // true = วันที่กดห่างจากรอบก่อนไม่ถึง 21 วัน (น่าจะกดซ้ำ/กดผิด) ระบบไม่นับเป็นรอบใหม่
  let tooCloseToPrevious = false

  if (latestRow?.assumed) {
    // วันที่กรอกตอน onboarding = วันที่เราคาดไว้ว่าจะมา (ยังไม่ใช่ข้อมูลจริง จึงไม่ใช้กฎ 21 วัน)
    // เก็บไว้เป็นเส้นประ ให้ผู้ใช้เห็นว่ารอบที่คาดไว้ไม่ตรง (ไม่ลากสีมาต่อจากวันนั้น)
    if (daysBetween(parseLocalDate(latestRow.cycle_start_date), date) >= 0) {
      predictedStr = latestRow.cycle_start_date
      drift = daysBetween(parseLocalDate(latestRow.cycle_start_date), date)
    }
  } else if (latestRow) {
    const gap = daysBetween(parseLocalDate(latestRow.cycle_start_date), date)
    if (gap >= MIN_CYCLE_GAP_DAYS) {
      const predicted = predictNextPeriod(latestRow.cycle_start_date, cycleDays).predictedDate
      predictedStr = getLocalDateString(predicted)
      drift = daysBetween(predicted, date)
    } else if (gap > 0) {
      tooCloseToPrevious = true
    }
  }

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('period_cycles').insert({
    user_id: profileId,
    cycle_start_date: dateStr,
    predicted_start_date: predictedStr
  })

  if (error) {
    // 23505 = วันนี้บันทึกไปแล้ว (ชนกับ UNIQUE)
    return { ok: false, message: error.code === '23505' ? 'วันนี้บันทึกไว้แล้ว' : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ' }
  }

  if (tooCloseToPrevious) {
    return { ok: true, message: 'บันทึกแล้ว แต่ห่างจากรอบก่อนไม่ถึง 21 วัน ระบบจึงไม่นับเป็นรอบใหม่' }
  }
  // เกิน 2 วันถึงแจ้ง เพราะคลาดเคลื่อน 1-2 วันถือเป็นเรื่องปกติ
  if (drift !== null && drift > 2) return { ok: true, message: `บันทึกแล้ว มาช้ากว่าที่คาดไว้ ${drift} วัน` }
  if (drift !== null && drift < -2) return { ok: true, message: `บันทึกแล้ว มาเร็วกว่าที่คาดไว้ ${-drift} วัน` }
  return { ok: true, message: 'บันทึกแล้ว' }
}

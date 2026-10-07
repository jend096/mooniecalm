<script setup lang="ts">
// ===== เมนูที่เด้งขึ้นมาจากด้านล่างตอนกดวันที่ (app/components/PeriodDaySheet.vue) =====
// ใช้ซ้ำได้ 2 หน้า: หน้าปฏิทิน (/calendar) และแถบวันบนหน้า home
// หน้าที่: ให้ผู้ใช้บอกว่า "ประจำเดือนมาวันนี้" / "หมดวันนี้" / "ลบการบันทึก"
// ทำเสร็จแล้วส่งสัญญาณ changed กลับไปให้หน้าที่เรียกใช้ไปโหลดข้อมูลใหม่เอง
import type { PeriodRow } from '~/utils/period-prediction'
// import ตรงๆ เพื่อให้ชัวร์ (ฟังก์ชันใหม่ที่เพิ่งเพิ่ม Nuxt บางทียังไม่รู้จักจนกว่าจะรีสตาร์ต dev server)
import { daysBetween, getRowEnd, parseLocalDate, predictNextPeriod, startOfDay } from '~/utils/period-prediction'

const props = defineProps<{
  date: Date // วันที่ที่ผู้ใช้กด
  rows: PeriodRow[] // แถวที่อยู่ในตารางจริง (มี id) ใช้ตัดสินว่าจะลบ/แก้อะไรได้
  allRows: PeriodRow[] // แถวที่ใช้แสดงผล (รวมวันเริ่มจาก onboarding ถ้ายังไม่เคยบันทึก)
  profileId: number
  periodDays: number // ประจำเดือนมากี่วัน
  cycleDays: number // ความยาวรอบ
}>()

const emit = defineEmits<{
  close: []
  changed: [message: string] // บันทึกสำเร็จ ส่งข้อความบอกผลกลับไป
}>()

const isSaving = ref(false)
const errorText = ref('')
const today = startOfDay(new Date())

const dateLabel = computed(() => `${props.date.getDate()} ${THAI_MONTHS[props.date.getMonth()]} ${props.date.getFullYear() + 543}`)
const isFuture = computed(() => daysBetween(today, props.date) > 0)

// แถวที่ "วันที่กดอยู่ในช่วงมีประจำเดือนของแถวนั้น" -> โชว์ปุ่มลบ
const rowCovering = computed(
  () =>
    props.rows.find(
      row =>
        daysBetween(parseLocalDate(row.cycle_start_date), props.date) >= 0 &&
        daysBetween(props.date, getRowEnd(row, props.periodDays)) >= 0
    ) ?? null
)

// แถวที่ "วันที่กดน่าจะเป็นวันหมด" (เริ่มก่อนวันที่กด และห่างไม่เกิน 9 วัน) -> โชว์ปุ่มหมดวันนี้
const rowToEnd = computed(() => {
  const before = props.rows
    .filter(row => daysBetween(parseLocalDate(row.cycle_start_date), props.date) >= 0)
    .sort((a, b) => a.cycle_start_date.localeCompare(b.cycle_start_date))
    .at(-1)
  if (!before) return null
  return daysBetween(parseLocalDate(before.cycle_start_date), props.date) <= 9 ? before : null
})

// ---------- ปุ่ม 1: ประจำเดือนมาวันนี้ ----------
async function logStart() {
  if (isSaving.value) return
  isSaving.value = true
  errorText.value = ''

  const dateStr = getLocalDateString(props.date)

  // จดวันที่ระบบคาดไว้ "ก่อนบันทึก" (บันทึกแล้วระบบคำนวณใหม่ ค่าเดิมจะหาย)
  // ทำเฉพาะตอนวันที่กดอยู่หลังรอบล่าสุด (ถ้าย้อนไปแก้รอบเก่า ไม่มีวันที่คาดไว้ให้เทียบ)
  const latest = props.allRows.map(r => r.cycle_start_date).sort().at(-1) ?? null
  let predictedStr: string | null = null
  let drift: number | null = null
  if (latest && dateStr > latest) {
    const predicted = predictNextPeriod(latest, props.cycleDays).predictedDate
    predictedStr = getLocalDateString(predicted)
    drift = daysBetween(predicted, props.date) // บวก = มาช้า, ลบ = มาเร็ว
  }

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('period_cycles').insert({
    user_id: props.profileId,
    cycle_start_date: dateStr,
    predicted_start_date: predictedStr
  })

  isSaving.value = false
  if (error) {
    // 23505 = วันนี้บันทึกไปแล้ว (ชนกับ UNIQUE)
    errorText.value = error.code === '23505' ? 'วันนี้บันทึกไว้แล้ว' : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'
    return
  }

  // เกิน 2 วันถึงแจ้ง เพราะคลาดเคลื่อน 1-2 วันถือเป็นเรื่องปกติ
  if (drift !== null && drift > 2) emit('changed', `บันทึกแล้ว มาช้ากว่าที่คาดไว้ ${drift} วัน`)
  else if (drift !== null && drift < -2) emit('changed', `บันทึกแล้ว มาเร็วกว่าที่คาดไว้ ${-drift} วัน`)
  else emit('changed', 'บันทึกแล้ว')
}

// ---------- ปุ่ม 2: ประจำเดือนหมดวันนี้ ----------
async function logEnd() {
  const row = rowToEnd.value
  if (!row?.id || isSaving.value) return
  isSaving.value = true
  errorText.value = ''

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed
    .from('period_cycles')
    .update({ confirmed_end_date: getLocalDateString(props.date) })
    .eq('id', row.id)

  isSaving.value = false
  if (error) {
    errorText.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'
    return
  }
  emit('changed', 'บันทึกวันที่หมดแล้ว')
}

// ---------- ปุ่ม 3: ลบการบันทึกรอบนี้ (กรณีกดผิด) ----------
async function removeRow() {
  const row = rowCovering.value
  if (!row?.id || isSaving.value) return
  isSaving.value = true
  errorText.value = ''

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('period_cycles').delete().eq('id', row.id)

  isSaving.value = false
  if (error) {
    errorText.value = 'ลบไม่สำเร็จ ลองใหม่อีกครั้งนะ'
    return
  }
  emit('changed', 'ลบแล้ว')
}
</script>

<template>
  <!-- พื้นหลังมืด: กดตรงนี้เพื่อปิดเมนู -->
  <div class="fixed inset-0 z-50 flex items-end bg-black/30" @click.self="emit('close')">
    <div class="w-full rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl">
      <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-moon-ink/15" />
      <p class="mb-4 text-center font-['Anuphan'] text-base font-semibold text-moon-ink">{{ dateLabel }}</p>

      <div class="flex flex-col gap-3 font-['Anuphan']">
        <!-- ปุ่มหลัก: ประจำเดือนมา (ใช้ได้เฉพาะวันที่ถึงแล้ว) -->
        <button
          v-if="!rowCovering"
          type="button"
          :disabled="isSaving || isFuture"
          class="w-full rounded-full bg-moon-pink py-3.5 font-semibold text-moon-ink shadow-sm transition active:scale-95 disabled:opacity-40"
          @click="logStart"
        >
          {{ isSaving ? 'กำลังบันทึก...' : 'ประจำเดือนมาวันนี้' }}
        </button>
        <p v-if="!rowCovering && isFuture" class="text-center text-xs text-moon-ink/60">ยังไม่ถึงวันนี้ จึงบันทึกไม่ได้</p>

        <!-- ปุ่มรอง: ประจำเดือนหมด -->
        <button
          v-if="rowToEnd && !isFuture"
          type="button"
          :disabled="isSaving"
          class="w-full rounded-full border-2 border-moon-pink bg-white py-3.5 font-semibold text-moon-ink transition active:scale-95 disabled:opacity-40"
          @click="logEnd"
        >
          ประจำเดือนหมดวันนี้
        </button>

        <!-- ปุ่มเล็ก: ลบ (เฉพาะวันที่เคยบันทึกไว้แล้ว) -->
        <button
          v-if="rowCovering"
          type="button"
          :disabled="isSaving"
          class="w-full rounded-full py-2.5 text-sm text-red-500 transition active:scale-95 disabled:opacity-40"
          @click="removeRow"
        >
          ลบการบันทึกประจำเดือนครั้งนี้
        </button>

        <p v-if="errorText" class="text-center text-sm text-red-500">{{ errorText }}</p>

        <button type="button" class="w-full py-2 text-sm text-moon-ink/60" @click="emit('close')">ปิด</button>
      </div>
    </div>
  </div>
</template>

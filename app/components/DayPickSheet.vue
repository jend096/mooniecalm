<script setup lang="ts">
import { parseLocalDate } from '~/utils/period-prediction'

// ===== เมนูปฏิทินเด้งขึ้นจากด้านล่างให้เลือกวัน (app/components/DayPickSheet.vue) =====
// ใช้ในหน้าเช็คอิน: เลือกวันเก่าเพื่อ "ดูย้อนหลัง" (วันที่ยังไม่ถึงกดไม่ได้)
// selected / max เป็นสตริง YYYY-MM-DD (max = วันนี้) กดวันแล้วส่ง pick กลับไป
const props = defineProps<{
  selected: string // วันที่กำลังดูอยู่
  max: string // วันล่าสุดที่เลือกได้ (วันนี้)
}>()

const emit = defineEmits<{
  pick: [dateStr: string]
  close: []
}>()

// เดือนที่กำลังแสดง (เริ่มที่เดือนของวันที่กำลังดู)
const initial = parseLocalDate(props.selected)
const viewYear = ref(initial.getFullYear())
const viewMonth = ref(initial.getMonth()) // 0-11

const maxDate = parseLocalDate(props.max)
const monthLabel = computed(() => `${THAI_MONTHS[viewMonth.value]} ${viewYear.value + 543}`)

// ช่องในตาราง: ช่องว่างก่อนวันที่ 1 แล้วตามด้วยวันที่ 1..สิ้นเดือน
const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const total = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const blanks: null[] = Array.from({ length: first.getDay() }, () => null)
  const days = Array.from({ length: total }, (_, i) => {
    const date = new Date(viewYear.value, viewMonth.value, i + 1)
    const key = getLocalDateString(date)
    return { day: i + 1, key, disabled: date.getTime() > maxDate.getTime() }
  })
  return [...blanks, ...days]
})

// ไม่ให้ไปเดือนที่อยู่หลังเดือนปัจจุบัน
const canGoNext = computed(() => viewYear.value < maxDate.getFullYear() || (viewYear.value === maxDate.getFullYear() && viewMonth.value < maxDate.getMonth()))

function shiftMonth(step: number) {
  if (step > 0 && !canGoNext.value) return
  const d = new Date(viewYear.value, viewMonth.value + step, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end bg-moon-ink/30" @click.self="emit('close')">
    <div class="w-full rounded-t-[24px] bg-moon-card px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 text-moon-ink">
      <!-- ขีดจับด้านบน -->
      <div class="mx-auto h-1 w-10 rounded-sm bg-moon-handle" />

      <!-- หัวเดือน + ปุ่มเลื่อนเดือน -->
      <div class="mt-6 flex items-center justify-between">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-moon-pink-soft bg-moon-card transition active:scale-95"
          aria-label="เดือนก่อนหน้า"
          @click="shiftMonth(-1)"
        >
          <FaIcon name="chevron-left" class="h-3 w-[7px] text-moon-ink" />
        </button>
        <p class="text-base font-semibold">{{ monthLabel }}</p>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-moon-pink-soft bg-moon-card transition active:scale-95 disabled:opacity-30"
          aria-label="เดือนถัดไป"
          :disabled="!canGoNext"
          @click="shiftMonth(1)"
        >
          <FaIcon name="chevron-right" class="h-3 w-[7px] text-moon-ink" />
        </button>
      </div>

      <div class="mt-4 grid grid-cols-7 gap-y-1 text-center">
        <span v-for="w in THAI_WEEKDAYS" :key="w" class="text-xxs text-moon-muted">{{ w }}</span>

        <template v-for="(cell, i) in cells" :key="i">
          <button
            v-if="cell"
            type="button"
            :disabled="cell.disabled"
            class="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition active:scale-90"
            :class="cell.key === selected
              ? 'bg-moon-coral font-bold text-white'
              : cell.key === max
                ? 'border-2 border-moon-coral font-medium'
                : cell.disabled
                  ? 'text-moon-muted/40'
                  : 'font-medium'"
            @click="emit('pick', cell.key)"
          >
            {{ cell.day }}
          </button>
          <span v-else />
        </template>
      </div>

      <p class="mt-3 text-center text-xs text-moon-muted">วันที่ผ่านมาแล้วดูได้อย่างเดียว แก้ไขไม่ได้นะคะ</p>

      <button
        type="button"
        class="btn-primary mt-5 w-full"
        @click="emit('close')"
      >
        ปิด
      </button>
    </div>
  </div>
</template>

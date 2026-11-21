<script setup lang="ts">
import { MAX_COMPARE_MONTHS, type CycleOption } from '~/utils/monthly-summary'

// ===== ชีตเลือกเดือนที่จะเทียบ (app/components/MonthPickerSheet.vue) =====
// เด้งขึ้นจากด้านล่างเหมือน DayPickSheet: ติ๊กได้สูงสุด 3 เดือน (ต้องเลือกอย่างน้อย 1) กด "ตกลง" แล้วส่ง apply กลับไป
const props = defineProps<{
  cycles: CycleOption[] // เรียงใหม่สุดก่อน
  selected: string[]
}>()

const emit = defineEmits<{
  apply: [keys: string[]]
  close: []
}>()

const picked = ref<string[]>([...props.selected])
const full = computed(() => picked.value.length >= MAX_COMPARE_MONTHS)

function toggle(key: string) {
  if (picked.value.includes(key)) {
    if (picked.value.length > 1) picked.value = picked.value.filter(k => k !== key)
  } else if (!full.value) {
    picked.value = [...picked.value, key]
  }
}

function apply() {
  // ส่งกลับเรียงใหม่สุดก่อนเสมอ (ลำดับนี้ใช้กำหนดสีเส้นในกราฟ)
  emit('apply', props.cycles.filter(c => picked.value.includes(c.key)).map(c => c.key))
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end bg-moon-ink/30" @click.self="emit('close')">
    <div class="w-full rounded-t-[24px] bg-moon-card px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 text-moon-ink">
      <div class="mx-auto h-1 w-10 rounded-sm bg-moon-handle" />

      <h2 class="mt-5 text-center text-lg">เลือกเดือนที่จะเทียบ</h2>
      <p class="text-center text-xs text-moon-muted">เลือกได้สูงสุด {{ MAX_COMPARE_MONTHS }} เดือน (เลือกแล้ว {{ picked.length }})</p>

      <ul class="mt-4 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
        <li v-for="c in cycles" :key="c.key">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-40"
            :class="picked.includes(c.key) ? 'bg-moon-pink-soft' : 'bg-moon-chip'"
            :disabled="!picked.includes(c.key) && full"
            :aria-pressed="picked.includes(c.key)"
            @click="toggle(c.key)"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
              :class="picked.includes(c.key) ? 'border-moon-period bg-moon-period text-white' : 'border-moon-hint bg-moon-card'"
            >
              <FaIcon v-if="picked.includes(c.key)" name="check" class="h-3 w-3" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium">{{ c.fullLabel }}</span>
              <span class="block text-xs text-moon-muted">{{ c.rangeText }} · {{ c.length }} วัน</span>
            </span>
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="mt-5 flex w-full items-center justify-center rounded-full bg-moon-ink py-4 text-base font-semibold text-moon-on-ink transition active:scale-[0.98]"
        @click="apply"
      >
        ตกลง
      </button>
    </div>
  </div>
</template>

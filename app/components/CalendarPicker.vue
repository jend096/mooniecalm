<script setup lang="ts">
const props = defineProps<{
  year: number // Buddhist Era year
  month: number // 0-indexed
  modelValue: number | null
}>()

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const yearAD = computed(() => props.year - 543)
const daysInMonth = computed(() => new Date(yearAD.value, props.month + 1, 0).getDate())
const firstWeekday = computed(() => new Date(yearAD.value, props.month, 1).getDay())

const gridCells = computed(() => {
  const blanks: null[] = Array.from({ length: firstWeekday.value }, () => null)
  const dayNumbers = Array.from({ length: daysInMonth.value }, (_, i) => i + 1)
  return [...blanks, ...dayNumbers]
})

function selectDay(day: number | null) {
  if (day === null) return
  emit('update:modelValue', day)
}
</script>

<template>
  <!-- การ์ดปฏิทิน: พื้นขาว ขอบชมพูอ่อน มุมโค้ง 24 ตาม Figma / วันที่เลือกเป็นวงกลมสีโคเรล -->
  <div class="rounded-3xl border border-moon-pink-soft bg-moon-card p-4">
    <div class="grid grid-cols-7 gap-y-2 text-center">
      <span
        v-for="w in THAI_WEEKDAYS"
        :key="w"
        class="text-xxs font-normal text-moon-muted"
      >
        {{ w }}
      </span>

      <template v-for="(cell, i) in gridCells" :key="i">
        <button
          v-if="cell !== null"
          type="button"
          class="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm"
          :class="cell === modelValue
            ? 'bg-moon-coral font-bold text-white'
            : 'font-medium text-moon-ink'"
          @click="selectDay(cell)"
        >
          {{ cell }}
        </button>
        <span v-else />
      </template>
    </div>
  </div>
</template>

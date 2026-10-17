<script setup lang="ts">
// การ์ดคำตอบของคำถามสร้างอวตาร (กดเพื่อเลือก ยังไม่ไปหน้าถัดไปจนกว่าจะกดปุ่ม "ถัดไป")
defineProps<{ label: string, selected?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <!-- พื้นขาว มีเส้นกรอบสีชมพูอ่อนเหมือนการ์ดหน้าอื่นๆ สูง 56 ตาม Figma
       ตอนถูกเลือก: เส้นกรอบและวงติ๊กเป็นสีประจำเดือน (moon-period) (เหมือนหน้าแพ้อาหาร) -->
  <button
    type="button"
    class="flex w-full items-center justify-between rounded-2xl border bg-moon-card px-5 py-[15px] text-left text-base font-medium text-moon-ink transition [-webkit-tap-highlight-color:transparent] active:scale-[0.98]"
    :class="selected ? 'border-moon-period' : 'border-moon-pink-soft'"
    :aria-pressed="selected"
    @click="$emit('click')"
  >
    {{ label }}
    <span
      class="ml-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
      :class="selected ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
    >
      <FaIcon v-if="selected" name="check" class="h-3 w-3 text-white" />
    </span>
  </button>
</template>

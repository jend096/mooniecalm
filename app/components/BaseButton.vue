<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    loading?: boolean // true = กำลังทำงาน: โชว์กระต่ายโผล่ขึ้น-หุบลงหน้าข้อความ และกดซ้ำไม่ได้
    type?: 'button' | 'submit'
  }>(),
  {
    label: 'ถัดไป',
    disabled: false,
    loading: false,
    type: 'button'
  }
)

defineEmits<{ click: [] }>()
</script>

<template>
  <!-- ปุ่มหลัก: พื้นดำ(ink) ตัวหนังสือขาว มุมโค้ง 24 สูง 59px ตาม Figma -->
  <button
    :type="type"
    :disabled="disabled || loading"
    class="flex h-[59px] w-full items-center justify-center gap-2 rounded-3xl bg-moon-ink px-4 text-center text-lg font-semibold text-white transition [-webkit-tap-highlight-color:transparent] enabled:hover:bg-moon-ink/85 enabled:active:bg-moon-ink/65 disabled:cursor-not-allowed disabled:bg-moon-ink/30"
    :class="loading ? '!bg-moon-ink' : ''"
    @click="$emit('click')"
  >
    <!-- ตอนกำลังโหลด: โลโก้กระต่ายตัวจิ๋ว (ตัวเดียวกับหน้ารอโหลด) -->
    <BrandLogoMark v-if="loading" :size="34" stage="bob" />
    {{ label }}
  </button>
</template>

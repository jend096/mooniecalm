<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    label: 'ถัดไป',
    disabled: false,
    type: 'button'
  }
)

defineEmits<{ click: [] }>()
</script>

<template>
  <!-- ปุ่มหลัก: พื้นดำ(ink) ตัวหนังสือขาว มุมโค้ง 24 สูง 59px ตาม Figma -->
  <button
    :type="type"
    :disabled="disabled"
    class="flex h-[59px] w-full items-center justify-center rounded-3xl bg-moon-ink px-4 text-center text-lg font-semibold text-white transition [-webkit-tap-highlight-color:transparent] enabled:hover:bg-moon-ink/85 enabled:active:scale-95 enabled:active:bg-moon-ink/65 disabled:cursor-not-allowed disabled:bg-moon-ink/30"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>

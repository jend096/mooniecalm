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
  <button
    :type="type"
    :disabled="disabled"
    class="w-full rounded-full bg-slate-900 py-3 text-center font-medium text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>

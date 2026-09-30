<script setup lang="ts">
defineProps<{ label: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="w-full rounded-2xl bg-white px-5 py-4 text-left font-['Anuphan'] text-base font-medium text-slate-800 shadow-sm transition active:scale-[0.98]"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
defineProps<{
  currentStep: number
  totalSteps: number
}>()
</script>

<template>
  <div class="flex min-h-dvh flex-col rounded-3xl bg-white p-6">
    <div class="mb-8 flex justify-center gap-2">
      <span
        v-for="step in totalSteps"
        :key="step"
        class="h-2 w-2 rounded-full transition"
        :class="step <= currentStep ? 'bg-slate-900' : 'bg-slate-200'"
      />
    </div>

    <div class="flex flex-1 flex-col">
      <slot />
    </div>
  </div>
</template>

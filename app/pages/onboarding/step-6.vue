<script setup lang="ts">
const onboarding = useOnboardingStore()

const durations = Array.from({ length: 14 }, (_, i) => i + 1) // 1-14 days
const durationIndex = ref(Math.max(durations.indexOf(5), 0))

function next() {
  onboarding.periodDurationDays = durations[durationIndex.value]
  navigateTo('/onboarding/allergy')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
    <div class="pointer-events-none absolute -right-16 -top-16 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -left-16 top-1/2 z-0 h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -right-16 top-1/2 z-0 h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-20 -right-10 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />

    <div class="relative z-10 flex flex-1 flex-col px-6 pt-16">
      <h1 class="text-left font-['Anuphan'] text-[28px] font-semibold leading-tight text-slate-900">
        โดยปกติประจำเดือนของคุณ<br>มีระยะเวลาเท่าไหร่ ?
      </h1>

      <div class="relative mt-10 flex flex-1 items-center justify-center">
        <div class="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 border-y border-slate-200" />
        <WheelPicker v-model="durationIndex" :items="durations" unit="วัน" width="w-24" />
      </div>
    </div>

    <div class="relative z-10 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

<script setup lang="ts">
const onboarding = useOnboardingStore()

const days = Array.from({ length: 31 }, (_, i) => i + 1)
const thaiMonths = THAI_MONTHS
const currentYearBE = new Date().getFullYear() + 543
const years = Array.from({ length: 100 }, (_, i) => currentYearBE - 99 + i)

const today = new Date()
const dayIndex = ref(today.getDate() - 1)
const monthIndex = ref(today.getMonth())
const yearIndex = ref(Math.max(years.indexOf(currentYearBE - 20), 0))

function next() {
  onboarding.birthDate = thaiDateToIso(days[dayIndex.value], monthIndex.value, years[yearIndex.value])
  navigateTo('/onboarding/step-4')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white">
    <div class="flex flex-1 flex-col px-6 pt-16">
      <h1 class="text-left font-['Anuphan'] text-[28px] font-semibold leading-tight text-slate-900">
        โปรดบันทึกวันเกิดของคุณ
      </h1>
      <p class="mt-2 text-left font-['Anuphan'] text-[14px] font-normal text-slate-500">
        วัน / เดือน / ปี เกิดของคุณ
      </p>

      <div class="relative mt-10 flex justify-center gap-2">
        <div class="pointer-events-none absolute inset-x-0 top-[88px] h-11 border-y border-slate-200" />

        <WheelPicker v-model="dayIndex" :items="days" width="w-16" />
        <WheelPicker v-model="monthIndex" :items="thaiMonths" width="w-28" />
        <WheelPicker v-model="yearIndex" :items="years" width="w-20" />
      </div>
    </div>

    <div class="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

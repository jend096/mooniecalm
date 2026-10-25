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
  // โปรเจกต์เปิด noUncheckedIndexedAccess: อ่านค่าจากลิสต์ด้วย [index] จะได้ "ตัวเลข หรือ undefined"
  // จึงใส่ค่าสำรอง (??) กันไว้ให้ TypeScript หายแดง (ปกติวงล้อไม่เลือกเกินลิสต์อยู่แล้ว)
  const day = days[dayIndex.value] ?? 1
  const yearBE = years[yearIndex.value] ?? currentYearBE - 20
  onboarding.birthDate = thaiDateToIso(day, monthIndex.value, yearBE)
  navigateTo('/onboarding/step-4')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col px-6 pt-24">
      <h1 class="text-left text-2xl font-semibold text-moon-ink">
        โปรดบันทึกวันเกิดของคุณ
      </h1>
      <p class="mt-0.5 text-left text-base font-normal text-moon-muted">
        วัน / เดือน / ปี เกิดของคุณ
      </p>
    </div>

    <!-- วงล้อ 3 คอลัมน์: อยู่กึ่งกลางจอ สูง 300px (5 แถว x 60px) กึ่งกลางคอลัมน์ = 78 / 190 / 302 px จากขอบกล่อง (เดือนอยู่กลางจอพอดี วัน-ปีห่างจากเดือนเท่ากันข้างละ 112px) -->
    <div class="absolute inset-x-6 top-1/2 h-[300px] -translate-y-1/2">
      <div class="absolute left-[calc(50%-112px)] top-0 -translate-x-1/2">
        <WheelPicker v-model="dayIndex" :items="days" width="w-24" />
      </div>
      <div class="absolute left-1/2 top-0 -translate-x-1/2">
        <WheelPicker v-model="monthIndex" :items="thaiMonths" width="w-[124px]" />
      </div>
      <div class="absolute left-[calc(50%+112px)] top-0 -translate-x-1/2">
        <WheelPicker v-model="yearIndex" :items="years" width="w-24" />
      </div>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

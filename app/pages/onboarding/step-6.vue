<script setup lang="ts">
const onboarding = useOnboardingStore()

const durations = Array.from({ length: 14 }, (_, i) => i + 1) // 1-14 days
const durationIndex = ref(Math.max(durations.indexOf(5), 0))

function next() {
  onboarding.periodDurationDays = durations[durationIndex.value] ?? 5 // ถ้าหาค่าไม่เจอ ใช้ 5 วัน (ค่าเริ่มต้นของหน้านี้)
  navigateTo('/onboarding/allergy')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col px-6 pt-24">
      <h1 class="text-left text-2xl font-semibold text-moon-ink">
        โดยปกติประจำเดือนของคุณ<br>มีระยะเวลาเท่าไหร่ ?
      </h1>
    </div>

    <!-- วงล้อ 1 คอลัมน์: กึ่งกลางจอ -->
    <div class="absolute inset-x-6 top-1/2 h-[300px] -translate-y-1/2">
      <div class="pointer-events-none absolute inset-x-0 top-[120px] h-[60px] rounded-2xl bg-white/80 shadow-[0_2px_10px_rgba(41,41,41,0.12)]" />
      <div class="absolute left-1/2 top-0 -translate-x-1/2">
        <WheelPicker v-model="durationIndex" :items="durations" unit="วัน" width="w-32" />
      </div>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

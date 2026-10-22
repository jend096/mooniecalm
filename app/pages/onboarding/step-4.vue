<script setup lang="ts">
const onboarding = useOnboardingStore()

const weights = Array.from({ length: 121 }, (_, i) => i + 30) // 30-150 kg
const heights = Array.from({ length: 121 }, (_, i) => i + 100) // 100-220 cm

const weightIndex = ref(Math.max(weights.indexOf(55), 0))
const heightIndex = ref(Math.max(heights.indexOf(160), 0))

function next() {
  onboarding.weightKg = weights[weightIndex.value]
  onboarding.heightCm = heights[heightIndex.value]
  navigateTo('/onboarding/step-5')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col px-6 pt-24">
      <h1 class="text-left text-2xl font-semibold text-moon-ink">
        ตอนนี้คุณน้ำหนักส่วนสูง<br>เท่าไหร่แล้ว?
      </h1>
    </div>

    <!-- วงล้อ 2 คอลัมน์: กึ่งกลางคอลัมน์ 114 / 266 px จากขอบกล่อง (ซ้าย-ขวาสมมาตรรอบกลางจอ) -->
    <div class="absolute inset-x-6 top-1/2 h-[300px] -translate-y-1/2">
      <div class="pointer-events-none absolute inset-x-0 top-[120px] h-[60px] rounded-2xl bg-white/80 shadow-[0_2px_10px_rgba(41,41,41,0.12)]" />
      <div class="absolute left-[calc(50%-76px)] top-0 -translate-x-1/2">
        <WheelPicker v-model="weightIndex" :items="weights" unit="kg" width="w-32" />
      </div>
      <div class="absolute left-[calc(50%+76px)] top-0 -translate-x-1/2">
        <WheelPicker v-model="heightIndex" :items="heights" unit="cm" width="w-32" />
      </div>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

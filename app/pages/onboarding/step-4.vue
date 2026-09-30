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
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
    <div class="pointer-events-none absolute -right-16 -top-16 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -left-16 top-10 z-0 h-56 w-56 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-20 -right-10 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />

    <div class="relative z-10 flex flex-1 flex-col px-6 pt-16">
      <h1 class="text-left font-['Anuphan'] text-[28px] font-semibold leading-tight text-slate-900">
        ตอนนี้คุณน้ำหนักส่วนสูง<br>เท่าไหร่แล้ว?
      </h1>

      <div class="relative mt-10 flex justify-center gap-10">
        <div class="pointer-events-none absolute inset-x-0 top-[88px] h-11 border-y border-slate-200" />

        <WheelPicker v-model="weightIndex" :items="weights" unit="kg" width="w-24" />
        <WheelPicker v-model="heightIndex" :items="heights" unit="cm" width="w-24" />
      </div>
    </div>

    <div class="relative z-10 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

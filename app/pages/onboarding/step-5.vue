<script setup lang="ts">
const onboarding = useOnboardingStore()

const currentYearBE = new Date().getFullYear() + 543
const years = Array.from({ length: 3 }, (_, i) => currentYearBE - 2 + i)

const monthIndex = ref(new Date().getMonth())
const yearBE = ref(currentYearBE)
const selectedDay = ref<number | null>(null)
const isPickerOpen = ref(false)

function selectMonthYear(month: number, year: number) {
  monthIndex.value = month
  yearBE.value = year
  selectedDay.value = null
  isPickerOpen.value = false
}

function next() {
  if (selectedDay.value === null) return
  onboarding.lastPeriodDate = thaiDateToIso(selectedDay.value, monthIndex.value, yearBE.value)
  navigateTo('/onboarding/step-6')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
    <div class="pointer-events-none absolute -right-16 -top-16 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -right-10 top-32 z-0 h-56 w-56 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-20 -right-10 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />

    <div class="relative z-10 flex flex-1 flex-col px-6 pt-16">
      <h1 class="text-left font-['Anuphan'] text-[28px] font-semibold leading-tight text-slate-900">
        ประจำเดือนครั้งล่าสุด<br>ของคุณเริ่มวันไหน ?
      </h1>

      <div class="relative mt-8">
        <button
          type="button"
          class="flex items-center gap-1 font-['Anuphan'] text-base font-normal text-slate-900"
          @click="isPickerOpen = !isPickerOpen"
        >
          {{ THAI_MONTHS[monthIndex] }} {{ yearBE }}
          <svg
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-180': isPickerOpen }"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div
          v-if="isPickerOpen"
          class="absolute left-0 top-9 z-20 flex gap-2 rounded-2xl bg-white p-3 shadow-lg"
        >
          <select
            class="rounded-xl border border-slate-200 bg-white px-2 py-1 font-['Anuphan'] text-sm font-normal"
            :value="monthIndex"
            @change="selectMonthYear(Number(($event.target as HTMLSelectElement).value), yearBE)"
          >
            <option v-for="(m, i) in THAI_MONTHS" :key="m" :value="i">
              {{ m }}
            </option>
          </select>
          <select
            class="rounded-xl border border-slate-200 bg-white px-2 py-1 font-['Anuphan'] text-sm font-normal"
            :value="yearBE"
            @change="selectMonthYear(monthIndex, Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="y in years" :key="y" :value="y">
              {{ y }}
            </option>
          </select>
        </div>
      </div>

      <CalendarPicker
        v-model="selectedDay"
        :month="monthIndex"
        :year="yearBE"
        class="mt-4"
      />
    </div>

    <div class="relative z-10 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton :disabled="selectedDay === null" @click="next" />
    </div>
  </div>
</template>

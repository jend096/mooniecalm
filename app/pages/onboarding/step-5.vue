<script setup lang="ts">
const onboarding = useOnboardingStore()

const currentYearBE = new Date().getFullYear() + 543
const years = Array.from({ length: 3 }, (_, i) => currentYearBE - 2 + i)

const monthIndex = ref(new Date().getMonth())
const yearBE = ref(currentYearBE)
const selectedDay = ref<number | null>(null)
const isPickerOpen = ref(false)

// เลื่อนวงล้อเดือน/ปี: เปลี่ยนค่าแล้วล้างวันที่ที่เลือกไว้ (กล่องยังเปิดอยู่ กดข้างนอกเพื่อปิด)
function onMonthWheel(index: number) {
  if (index === monthIndex.value) return
  monthIndex.value = index
  selectedDay.value = null
}

function onYearWheel(index: number) {
  const year = years[index]
  if (year === undefined || year === yearBE.value) return
  yearBE.value = year
  selectedDay.value = null
}

function next() {
  if (selectedDay.value === null) return
  onboarding.lastPeriodDate = thaiDateToIso(selectedDay.value, monthIndex.value, yearBE.value)
  navigateTo('/onboarding/step-6')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col px-6 pb-8 pt-24">
      <h1 class="text-left text-2xl font-semibold text-moon-ink">
        ประจำเดือนครั้งล่าสุด<br>ของคุณเริ่มวันไหน ?
      </h1>

      <!-- ปุ่มเดือน/ปี: กดแล้วตัวปุ่มขยายลงมาเป็นกล่องวงล้อเลือกเดือนกับปี (ไม่มีปุ่มหรือกล่องซ้อนอีกชั้น) -->
      <div class="relative mt-[53px] flex h-[42px] justify-end">
        <!-- ฉากโปร่งใสเต็มจอ: กดตรงไหนก็ได้นอกกล่องเพื่อปิด -->
        <div v-if="isPickerOpen" class="fixed inset-0 z-10" @click="isPickerOpen = false" />

        <div
          class="absolute right-0 top-0 z-20 overflow-hidden border border-moon-pink-soft bg-moon-card"
          :class="isPickerOpen ? 'w-44 rounded-3xl shadow-lg' : 'rounded-full shadow-sm'"
        >
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-1.5 py-1.5 pl-1.5 pr-3 text-sm font-medium text-moon-ink transition active:bg-moon-pink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-moon-pink"
            :aria-expanded="isPickerOpen"
            @click="isPickerOpen = !isPickerOpen"
          >
            <span class="flex items-center gap-1.5">
              <span class="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-moon-pink-soft text-moon-coral">
                <FaIcon name="calendar-days-regular" class="h-4 w-4" />
              </span>
              {{ THAI_MONTHS[monthIndex] }} {{ yearBE }}
            </span>
            <FaIcon
              name="chevron-down"
              class="h-3 w-3 text-moon-muted transition-transform"
              :class="{ 'rotate-180': isPickerOpen }"
            />
          </button>

          <!-- ส่วนที่ขยายลงมา: วงล้อเดือน + ปี (เห็น 3 แถว ตัวอักษร 14px กดแล้วขึ้นมาทันที ไม่มีแอนิเมชัน) -->
          <div v-if="isPickerOpen" class="relative flex justify-center gap-2 px-3 pb-3">
            <div class="pointer-events-none absolute inset-x-3 top-[44px] h-[44px] rounded-xl bg-white/80 shadow-[0_2px_8px_rgba(41,41,41,0.12)]" />
            <WheelPicker
              :model-value="monthIndex"
              :items="THAI_MONTHS"
              :rows="3"
              :item-height="44"
              text-class="text-sm"
              width="w-20"
              @update:model-value="onMonthWheel"
            />
            <WheelPicker
              :model-value="years.indexOf(yearBE)"
              :items="years"
              :rows="3"
              :item-height="44"
              text-class="text-sm"
              width="w-16"
              @update:model-value="onYearWheel"
            />
          </div>
        </div>
      </div>

      <!-- จองที่ไว้ให้ปฏิทินสูงสุด 6 แถว (314px) เสมอ เปลี่ยนเดือนแล้วปุ่มถัดไปด้านล่างจะได้ไม่เด้งขึ้นลง -->
      <div class="mt-[18px] min-h-[314px]">
        <CalendarPicker
          v-model="selectedDay"
          :month="monthIndex"
          :year="yearBE"
        />
      </div>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton :disabled="selectedDay === null" @click="next" />
    </div>
  </div>
</template>

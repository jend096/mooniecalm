<script setup lang="ts">
const onboarding = useOnboardingStore()

const NO_ALLERGY = 'ไม่มีอาการแพ้อาหาร'

const options = [
  'นม',
  'ไข่',
  'ถั่ว / ถั่วลิสง',
  'แป้งสาลี / กลูเตน',
  'ถั่วเหลือง',
  'งา',
  'อาหารทะเล',
  NO_ALLERGY
]

const selected = ref<string[]>([...onboarding.foodAllergies])

function toggle(option: string) {
  if (option === NO_ALLERGY) {
    selected.value = selected.value.includes(NO_ALLERGY) ? [] : [NO_ALLERGY]
    return
  }

  const withoutNoAllergy = selected.value.filter(o => o !== NO_ALLERGY)
  selected.value = withoutNoAllergy.includes(option)
    ? withoutNoAllergy.filter(o => o !== option)
    : [...withoutNoAllergy, option]
}

function back() {
  navigateTo('/onboarding/step-6')
}

function next() {
  if (selected.value.length === 0) return
  onboarding.foodAllergies = [...selected.value]
  navigateTo('/onboarding/question-1')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white">
    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
      @click="back"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="flex flex-1 flex-col px-6 pt-20">
      <h1 class="text-left font-['Anuphan'] text-[24px] font-semibold leading-snug text-slate-900">
        คุณแพ้อาหารกลุ่มไหนบ้าง?
      </h1>
      <p class="mt-2 text-left font-['Anuphan'] text-[13px] font-normal leading-relaxed text-slate-500">
        เลือกได้มากกว่า 1 ข้อ<br>
        ระบบจะกรองของว่างที่มีส่วนผสมนี้ออกให้อัตโนมัติทุกครั้ง
      </p>

      <div class="mt-6 flex flex-col gap-3">
        <button
          v-for="option in options"
          :key="option"
          type="button"
          class="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 text-left font-['Anuphan'] text-base font-medium text-slate-800"
          @click="toggle(option)"
        >
          {{ option }}
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
            :class="selected.includes(option) ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'"
          >
            <svg v-if="selected.includes(option)" class="h-3 w-3" viewBox="0 0 20 20" fill="none">
              <path d="M4 10.5L8 14.5L16 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </div>

    <div class="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton :disabled="selected.length === 0" @click="next" />
    </div>
  </div>
</template>

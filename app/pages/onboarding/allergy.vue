<script setup lang="ts">
import {
  OTHER_ALLERGY_MAX_COUNT,
  OTHER_ALLERGY_MAX_LENGTH,
  OTHER_ALLERGY_MIN_LENGTH,
  OTHER_ALLERGY_PREFIX,
  cleanOtherAllergyWord,
  isOtherAllergyLabel,
  otherAllergyWords,
  toOtherAllergyLabel
} from '~/utils/snack-picker'

const onboarding = useOnboardingStore()

const NO_ALLERGY = 'ไม่มีอาการแพ้อาหาร'
// ปุ่ม "อื่นๆ" ไม่ได้เก็บเป็นคำตอบเอง — มันแค่เปิดช่องให้พิมพ์ (คำที่พิมพ์จะเก็บเป็น "อื่นๆ: ...")
const OTHER = 'อื่นๆ'

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

// ----- แพ้อย่างอื่นที่ไม่มีในปุ่ม: กด "อื่นๆ" แล้วค่อยขึ้นช่องให้พิมพ์ -----
const otherInput = ref('')
const otherError = ref('')
const otherLabels = computed(() => selected.value.filter(isOtherAllergyLabel))
// ถ้าเคยพิมพ์คำอื่นๆ ไว้แล้ว (กลับมาหน้านี้) ให้ช่องพิมพ์เปิดค้างไว้
const otherOpen = ref(otherLabels.value.length > 0)

// โชว์เฉพาะคำที่พิมพ์ (ตัดคำนำหน้า "อื่นๆ: " ออก ไม่ต่อท้ายว่าพิมพ์เอง)
function otherWord(label: string) {
  return label.slice(OTHER_ALLERGY_PREFIX.length)
}

function toggle(option: string) {
  if (option === NO_ALLERGY) {
    selected.value = selected.value.includes(NO_ALLERGY) ? [] : [NO_ALLERGY]
    // "ไม่มีอาการแพ้" เลือกพร้อมกับ "อื่นๆ" ไม่ได้ → ปิดช่องพิมพ์
    otherOpen.value = false
    otherInput.value = ''
    otherError.value = ''
    return
  }

  if (option === OTHER) {
    if (otherOpen.value) {
      // กดซ้ำ = ปิดช่องพิมพ์ และเอาคำที่เคยพิมพ์ออก (กันคำที่มองไม่เห็นค้างอยู่ในคำตอบ)
      otherOpen.value = false
      otherInput.value = ''
      otherError.value = ''
      selected.value = selected.value.filter(o => !isOtherAllergyLabel(o))
    } else {
      otherOpen.value = true
      selected.value = selected.value.filter(o => o !== NO_ALLERGY)
    }
    return
  }

  const withoutNoAllergy = selected.value.filter(o => o !== NO_ALLERGY)
  selected.value = withoutNoAllergy.includes(option)
    ? withoutNoAllergy.filter(o => o !== option)
    : [...withoutNoAllergy, option]
}

// คืนค่า true ถ้าเพิ่มคำได้ (หรือซ้ำกับที่มีอยู่แล้ว)
function addOther(): boolean {
  otherError.value = ''
  const word = cleanOtherAllergyWord(otherInput.value)
  if (word.length < OTHER_ALLERGY_MIN_LENGTH) {
    otherError.value = `พิมพ์อย่างน้อย ${OTHER_ALLERGY_MIN_LENGTH} ตัวอักษร`
    return false
  }
  const label = toOtherAllergyLabel(word)
  if (selected.value.includes(label)) {
    otherInput.value = ''
    return true
  }
  if (otherAllergyWords(selected.value).length >= OTHER_ALLERGY_MAX_COUNT) {
    otherError.value = `เพิ่มได้สูงสุด ${OTHER_ALLERGY_MAX_COUNT} คำ`
    return false
  }
  // เพิ่มคำที่พิมพ์ และล้าง "ไม่มีอาการแพ้อาหาร" ออก (เลือกพร้อมกันไม่ได้)
  selected.value = [...selected.value.filter(o => o !== NO_ALLERGY), label]
  otherInput.value = ''
  return true
}

function removeOther(label: string) {
  selected.value = selected.value.filter(o => o !== label)
}

function next() {
  // ถ้าพิมพ์คำไว้แต่ยังไม่ได้กด "เพิ่ม" ให้เพิ่มให้เลย (ไม่ให้คำหาย)
  if (otherOpen.value && otherInput.value.trim() && !addOther()) return
  if (selected.value.length === 0) return
  onboarding.foodAllergies = [...selected.value]
  navigateTo('/onboarding/question-1')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col px-6 pb-6 pt-24">
      <h1 class="text-left text-2xl font-semibold text-moon-ink">
        คุณแพ้อะไรบ้าง?
      </h1>
      <p class="mt-3 text-left text-xs font-normal text-moon-ink">
        สามารถเลือกได้มากกว่า 1 ข้อ 
      </p>

      <div class="mt-[42px] flex flex-col gap-3">
        <button
          v-for="option in options"
          :key="option"
          type="button"
          class="flex w-full items-center justify-between rounded-2xl border bg-moon-card px-5 py-4 text-left text-base font-medium text-moon-ink"
          :class="selected.includes(option) ? 'border-moon-period' : 'border-moon-pink-soft'"
          @click="toggle(option)"
        >
          {{ option }}
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
            :class="selected.includes(option) ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
          >
            <FaIcon v-if="selected.includes(option)" name="check" class="h-3 w-3 text-white" />
          </span>
        </button>

        <!-- "อื่นๆ" อยู่ล่างสุด เป็นกล่องเดียวกัน: กดแล้วกล่องขยายลงมา มีช่องพิมพ์อยู่ข้างในกล่องนั้น -->
        <div
          class="w-full overflow-hidden rounded-2xl border bg-moon-card"
          :class="otherOpen ? 'border-moon-period' : 'border-moon-pink-soft'"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between px-5 py-4 text-left text-base font-medium text-moon-ink"
            @click="toggle(OTHER)"
          >
            {{ OTHER }}
            <span
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
              :class="otherOpen ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
            >
              <FaIcon v-if="otherOpen" name="check" class="h-3 w-3 text-white" />
            </span>
          </button>

          <div v-if="otherOpen" class="px-5 pb-4">
            <div v-if="otherLabels.length" class="mb-3 flex flex-wrap gap-2">
              <button
                v-for="label in otherLabels"
                :key="label"
                type="button"
                class="rounded-full bg-moon-ink px-3 py-1.5 text-xs font-medium text-white"
                @click="removeOther(label)"
              >
                {{ otherWord(label) }}<FaIcon name="xmark" class="ml-1 inline h-3 w-3" />
              </button>
            </div>
            <form class="flex gap-2" @submit.prevent="addOther">
              <input
                v-model="otherInput"
                type="text"
                :maxlength="OTHER_ALLERGY_MAX_LENGTH"
                placeholder="โปรดใส่สิ่งที่คุณแพ้"
                class="min-w-0 flex-1 rounded-full border border-moon-pink-soft bg-moon-bg px-4 py-2.5 text-sm text-moon-ink outline-none placeholder:text-moon-muted focus:border-moon-pink"
              >
              <button
                type="submit"
                class="shrink-0 rounded-full bg-moon-ink px-5 py-2.5 text-sm font-medium text-white"
              >
                เพิ่ม
              </button>
            </form>
            <p v-if="otherError" class="mt-2 text-xs text-moon-error">
              {{ otherError }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton :disabled="selected.length === 0" @click="next" />
    </div>
  </div>
</template>

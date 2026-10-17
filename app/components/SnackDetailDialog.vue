<script setup lang="ts">
// ===== การ์ดรายละเอียดของว่าง (app/components/SnackDetailDialog.vue) =====
// ใช้ที่หน้าเช็คอิน: กดการ์ดของว่างที่เลือกไว้เพื่อกลับมาดูรายละเอียดอีกครั้ง (รูป คำอธิบาย กินคู่กับ วัตถุดิบ คำเตือน)
// หน้าตาสไตล์เดียวกับ GuideDetailDialog / การ์ดผลลัพธ์ในหน้า snack คอมโพเนนต์นี้แค่โชว์ กดปุ่มหรือพื้นที่ว่างแล้วส่งสัญญาณ "close"
import type { SnackCategory } from '~/utils/snack-picker'

const props = defineProps<{
  name: string
  category?: SnackCategory | null
  imageUrl?: string | null // ค่าจาก snack_items.image_url (ชื่อไฟล์ใน Storage หรือลิงก์เต็ม)
  description?: string | null
  pairingTip?: string | null
  ingredients?: string[] | null
  recommended?: boolean // true = โชว์ป้าย "แนะนำสำหรับคุณ"
  buttonLabel: string
}>()

const emit = defineEmits<{ close: [] }>()

// รูปจาก Supabase Storage (ที่เก็บ snacks) ถ้าโหลดไม่ได้โชว์กล่องสีแทน
const supabaseUrl = useRuntimeConfig().public.supabase?.url ?? ''
const storageBase = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/snacks` : ''
const candidates = computed(() => snackImageCandidates(props.imageUrl, storageBase))
const tryIndex = ref(0)
const failed = ref(false)
const imageSrc = computed(() => candidates.value[tryIndex.value] ?? '')
function onImageError() {
  if (tryIndex.value + 1 < candidates.value.length) tryIndex.value++
  else failed.value = true
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-moon-ink/30 px-6" @click.self="emit('close')">
    <div class="relative flex max-h-[85dvh] w-full max-w-[380px] flex-col overflow-hidden rounded-[24px] bg-white pb-6 font-['Anuphan'] text-moon-ink shadow-[0_25px_50px_rgba(0,0,0,0.25)]">
      <div class="min-h-0 flex-1 overflow-y-auto">
        <img
          v-if="imageSrc && !failed"
          :src="imageSrc"
          :alt="name"
          class="h-44 w-full object-cover"
          @error="onImageError"
        >
        <div v-else class="flex h-32 w-full items-center justify-center bg-[#D9D9D9]/40 text-xs text-moon-muted">
          ยังไม่มีรูป
        </div>

        <div class="px-6 pt-4">
          <p v-if="category" class="text-xs font-medium leading-[18px] text-moon-muted">{{ SNACK_CATEGORY_LABEL[category] }}</p>
          <h2 class="text-xl font-semibold leading-[30px]">{{ name }}</h2>
          <p v-if="recommended" class="mt-1"><RecommendBadge large /></p>
          <p v-if="description" class="mt-2 text-sm leading-[21px] text-moon-ink/70">{{ description }}</p>

          <p v-if="pairingTip" class="mt-3 flex items-start gap-1 rounded-2xl bg-moon-lavender p-3 text-xs leading-[18px] text-white">
            <FaIcon name="wand-magic-sparkles" class="mt-[3px] h-[13px] w-[14px] shrink-0 text-moon-coral" />
            <span>กินคู่กับ: {{ pairingTip }}</span>
          </p>
          <p v-if="ingredients?.length" class="mt-3 text-xs text-moon-muted">วัตถุดิบหลัก: {{ ingredients.join(', ') }}</p>

          <p class="mt-5 text-xs leading-relaxed text-moon-coral/70">{{ SNACK_SAFETY_NOTE }}</p>
          <p class="mt-2 text-xs leading-relaxed text-moon-coral/70">{{ SNACK_LABEL_NOTE }}</p>
        </div>
      </div>

      <div class="px-6 pt-4">
        <button
          type="button"
          class="w-full rounded-full bg-moon-ink py-[14px] text-base font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition active:scale-95"
          @click="emit('close')"
        >
          {{ buttonLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

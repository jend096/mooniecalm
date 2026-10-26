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
    <div class="relative flex max-h-[85dvh] w-full max-w-[380px] flex-col overflow-hidden rounded-[24px] bg-moon-card pb-6 text-moon-ink shadow-[0_25px_50px_rgba(0,0,0,0.25)]">
      <div class="min-h-0 flex-1 overflow-y-auto">
        <img
          v-if="imageSrc && !failed"
          :src="imageSrc"
          :alt="name"
          class="h-44 w-full object-cover"
          @error="onImageError"
        >
        <div v-else class="flex h-32 w-full items-center justify-center bg-moon-placeholder/40 text-xs text-moon-muted">
          ยังไม่มีรูป
        </div>

        <div class="px-6 pt-4">
          <p v-if="category" class="text-xs font-medium leading-[18px] text-moon-muted">{{ SNACK_CATEGORY_LABEL[category] }}</p>
          <!-- ชื่อเมนู (ซ้าย) + ป้ายแนะนำ (ชิดขวา) อยู่บรรทัดเดียวกัน -->
          <div class="flex items-start justify-between gap-2">
            <h2 class="min-w-0 text-xl font-semibold leading-[30px]">{{ name }}</h2>
            <RecommendBadge v-if="recommended" large class="mt-[6px]" />
          </div>
          <p v-if="description" class="mt-2 text-sm leading-[21px] text-moon-ink/70">{{ description }}</p>

          <!-- กล่องม่วง "กินคู่กับ": ความโค้งมน = rounded-2xl (ใหญ่ขึ้น: rounded-3xl / เล็กลง: rounded-xl) สีตัวอักษรเข้มให้อ่านง่ายบนม่วงพาสเทล -->
          <p v-if="pairingTip" class="mt-3 flex items-start gap-1.5 rounded-2xl bg-moon-lavender p-3 text-xs leading-[18px] text-moon-ink">
            <svg viewBox="0 0 24 24" class="mt-[2px] h-[14px] w-[14px] shrink-0 text-moon-coral" fill="currentColor" aria-hidden="true"><path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" /></svg>
            <span>กินคู่กับ: {{ pairingTip }}</span>
          </p>
          <p v-if="ingredients?.length" class="mt-3 text-xs text-moon-muted">วัตถุดิบหลัก: {{ ingredients.join(', ') }}</p>

          <!-- คำเตือน: กล่องโทนแดงอ่อน ตัวหนังสือเข้มให้อ่านง่าย (ข้อความอยู่ใน snack-picker.ts) -->
          <p class="mt-5 rounded-2xl bg-moon-coral/10 p-[10px] text-xs leading-[20px] text-moon-ink/80">{{ SNACK_SAFETY_NOTE }}</p>
        </div>
      </div>

      <div class="px-6 pt-4">
        <button
          type="button"
          class="btn-primary w-full"
          @click="emit('close')"
        >
          {{ buttonLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

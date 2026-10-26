<script setup lang="ts">
// ===== ป๊อปอัพถามผู้ใช้ (app/components/PromptDialog.vue) =====
// ใช้ซ้ำได้กับการแจ้งเตือนทุกประเภท: หน้าที่เรียกใช้ส่ง "หัวข้อ ข้อความ ชื่อปุ่ม" เข้ามา
// คอมโพเนนต์นี้ไม่รู้ว่าถามเรื่องอะไร ทำแค่แสดงกล่อง แล้วส่งสัญญาณกลับว่าผู้ใช้กดปุ่มไหน
const props = defineProps<{
  title: string // หัวข้อ เช่น "ประจำเดือนหมดหรือยัง"
  message: string // ข้อความอธิบายใต้หัวข้อ
  primaryLabel: string // ปุ่มหลัก (สีชมพู) เช่น "หมดแล้ว"
  secondaryLabel?: string // ปุ่มรอง (ขอบชมพู) เช่น "ยังไม่หมด" ไม่ใส่ = ไม่มีปุ่มนี้
  lockBackdrop?: boolean // true = กดพื้นหลังแล้วไม่เกิดอะไรขึ้น (ต้องกดปุ่มเท่านั้น กันกดพลาดแล้วบันทึกเป็นคำตอบ)
  closable?: boolean // true = มีปุ่มกากบาทมุมขวาบน และกดพื้นหลังเพื่อ "ปิดเฉยๆ" ได้ (ไม่นับเป็นคำตอบ ไม่บันทึกอะไร) ใช้กับป๊อปอัพถามความรู้สึกที่ตอบทีหลังได้
}>()

const emit = defineEmits<{
  primary: [] // กดปุ่มหลัก
  secondary: [] // กดปุ่มรอง
  close: [] // ปิดเฉยๆ (กดกากบาท หรือกดพื้นหลังตอนเปิด closable) หน้าที่เรียกใช้แค่ปิดป๊อปอัพ ไม่ต้องบันทึกคำตอบ
}>()

// กดพื้นหลังมืดข้างนอกกล่อง: ถ้ามีปุ่มรองให้นับเป็นปุ่มรอง (เช่น "ยังไม่หมด") ถ้าไม่มีให้นับเป็นปุ่มหลัก (เช่น "รับทราบ")
function onBackdropClick() {
  if (props.closable) { emit('close'); return } // closable: กดพื้นหลัง = ปิดเฉยๆ
  if (props.lockBackdrop) return
  if (props.secondaryLabel) emit('secondary')
  else emit('primary')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6" @click.self="onBackdropClick">
    <div class="relative w-full max-w-sm rounded-3xl bg-moon-card px-6 pb-6 pt-7 text-center shadow-2xl">
      <!-- ปุ่มกากบาทปิด (เฉพาะตอนใส่ closable) -->
      <button
        v-if="closable"
        type="button"
        class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-moon-gray"
        aria-label="ปิด"
        @click="emit('close')"
      >
        <FaIcon name="xmark" class="h-4 w-4 text-moon-ink" />
      </button>

      <p class="px-6 text-lg font-semibold text-moon-ink">{{ title }}</p>
      <p class="mt-2 text-sm leading-relaxed text-moon-ink/70">{{ message }}</p>

      <div class="mt-6 flex flex-col gap-2">
        <button
          type="button"
          class="btn-primary w-full"
          @click="emit('primary')"
        >
          {{ primaryLabel }}
        </button>
        <button
          v-if="secondaryLabel"
          type="button"
          class="btn-secondary w-full"
          @click="emit('secondary')"
        >
          {{ secondaryLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

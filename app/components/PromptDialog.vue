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
}>()

const emit = defineEmits<{
  primary: [] // กดปุ่มหลัก
  secondary: [] // กดปุ่มรอง
}>()

// กดพื้นหลังมืดข้างนอกกล่อง: ถ้ามีปุ่มรองให้นับเป็นปุ่มรอง (เช่น "ยังไม่หมด") ถ้าไม่มีให้นับเป็นปุ่มหลัก (เช่น "รับทราบ")
function onBackdropClick() {
  if (props.lockBackdrop) return
  if (props.secondaryLabel) emit('secondary')
  else emit('primary')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6" @click.self="onBackdropClick">
    <div class="w-full max-w-sm rounded-3xl bg-white px-6 pb-6 pt-7 text-center shadow-2xl">
      <p class="text-lg font-semibold text-moon-ink">{{ title }}</p>
      <p class="mt-2 text-sm leading-relaxed text-moon-ink/70">{{ message }}</p>

      <div class="mt-6 flex flex-col gap-2">
        <button
          type="button"
          class="w-full rounded-full bg-moon-pink py-3.5 font-semibold text-moon-ink shadow-sm transition active:scale-95"
          @click="emit('primary')"
        >
          {{ primaryLabel }}
        </button>
        <button
          v-if="secondaryLabel"
          type="button"
          class="w-full rounded-full border-2 border-moon-pink bg-white py-3.5 font-semibold text-moon-ink transition active:scale-95"
          @click="emit('secondary')"
        >
          {{ secondaryLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

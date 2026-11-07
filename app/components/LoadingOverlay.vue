<script setup lang="ts">
// ===== หน้ารอโหลด (app/components/LoadingOverlay.vue) =====
// ครอบทั้งจอแบบโปร่งๆ มีโลโก้ MoonieCalm ที่กระต่ายโผล่ขึ้น-หุบลงวนไปเรื่อยๆ ใช้ตอน "กดส่งอีเมล" และตอน "สลับวันในปฏิทิน"
// ใช้: <LoadingOverlay v-if="loading" text="กำลังส่งลิงก์..." />  (แสดง/ซ่อนด้วย v-if จากหน้าที่เรียกใช้)
// หน้ารอจะ "ค่อยโผล่" หลังผ่านไป delay มิลลิวินาที: ถ้างานเสร็จก่อนนั้น ผู้ใช้จะไม่เห็นหน้ารอเลย (ไม่วาบขึ้นมารำคาญ)
// ระหว่างรอ หน้ารอโปร่งใสแต่ยังกันการกดซ้ำอยู่ (ไม่ต้องใช้ตัวจับเวลา ใช้ animation-delay ใน CSS)
const OVERLAY_DEFAULT_DELAY_MS = 400

defineProps<{
  text?: string // ข้อความใต้โลโก้ ไม่ใส่ = "กำลังโหลด..."
  delay?: number // รอกี่มิลลิวินาทีก่อนโผล่ ไม่ใส่ = 400 (ใส่ 0 = โผล่ทันที)
}>()

// ถ้ามีหน้ารอโหลดซ้อนกันหลายอัน (เช่น ตอนเปลี่ยนหน้า + หน้านั้นกำลังดึงข้อมูล) ให้โชว์แค่อันที่ขึ้นก่อน
// อันที่เหลือซ่อนรออยู่ พออันบนหายไปค่อยโผล่ต่อ จะได้ไม่เห็นกระต่ายซ้อนกันสองตัว
const id = useId()
const stack = useState<string[]>('loading-overlay-stack', () => [])
const isTop = computed(() => stack.value.length === 0 || stack.value[0] === id)
onMounted(() => { stack.value = [...stack.value, id] })
onBeforeUnmount(() => { stack.value = stack.value.filter(x => x !== id) })
</script>

<template>
  <div
    v-show="isTop"
    class="loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-moon-card/70 px-6 backdrop-blur-[2px]"
    role="status"
    aria-live="polite"
    :style="{ animationDelay: `${delay ?? OVERLAY_DEFAULT_DELAY_MS}ms` }"
  >
    <!-- ไม่มีกรอบ/พื้นขาวครอบ: กระต่ายกับข้อความลอยบนพื้นโปร่งๆ -->
    <div class="flex flex-col items-center gap-3">
      <BrandLogoMark :size="104" stage="bob" />
      <p class="text-sm font-medium text-moon-ink">{{ text || 'กำลังโหลด...' }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  animation: overlay-in 0.18s ease-out both; /* both = ระหว่างรอ delay ยังโปร่งใสอยู่ */
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-overlay {
    animation: none;
  }
}
</style>

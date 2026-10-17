<script setup lang="ts">
// ===== หน้ารอโหลด (app/components/LoadingOverlay.vue) =====
// ครอบทั้งจอแบบโปร่งๆ มีโลโก้ MoonieCalm ที่กระต่ายโผล่ขึ้น-หุบลงวนไปเรื่อยๆ ใช้ตอน "กดส่งอีเมล" และตอน "สลับวันในปฏิทิน"
// ใช้: <LoadingOverlay v-if="loading" text="กำลังส่งลิงก์..." />  (แสดง/ซ่อนด้วย v-if จากหน้าที่เรียกใช้)
defineProps<{
  text?: string // ข้อความใต้โลโก้ ไม่ใส่ = "กำลังโหลด..."
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
    class="loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-white/70 px-6 backdrop-blur-[2px]"
    role="status"
    aria-live="polite"
  >
    <!-- ไม่มีกรอบ/พื้นขาวครอบ: กระต่ายกับข้อความลอยบนพื้นโปร่งๆ -->
    <div class="flex flex-col items-center gap-3">
      <BrandLogoMark :size="104" stage="bob" />
      <p class="font-['Anuphan'] text-sm font-medium text-moon-ink">{{ text || 'กำลังโหลด...' }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  animation: overlay-in 0.18s ease-out;
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

<script setup lang="ts">
// ===== หน้ารอโหลด (app/components/LoadingOverlay.vue) =====
// ครอบทั้งจอแบบโปร่งๆ มีโลโก้ MoonieCalm ที่กระต่ายโผล่ขึ้น-หุบลงวนไปเรื่อยๆ ใช้ตอน "กดส่งอีเมล" และตอน "สลับวันในปฏิทิน"
// ใช้: <LoadingOverlay v-if="loading" text="กำลังส่งลิงก์..." />  (แสดง/ซ่อนด้วย v-if จากหน้าที่เรียกใช้)
defineProps<{
  text?: string // ข้อความใต้โลโก้ ไม่ใส่ = "กำลังโหลด..."
}>()
</script>

<template>
  <div
    class="loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-white/70 px-6 backdrop-blur-[2px]"
    role="status"
    aria-live="polite"
  >
    <div class="flex flex-col items-center gap-3 rounded-3xl bg-white px-8 py-6 shadow-[0_12px_32px_rgba(41,41,41,0.12)]">
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

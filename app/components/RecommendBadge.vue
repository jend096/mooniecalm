<script setup lang="ts">
// ===== ป้าย "แนะนำสำหรับคุณ" + ดาวระยิบ (app/components/RecommendBadge.vue) =====
// ใช้กับรายการที่ตรงกับเป้าหมายของผู้ใช้ (คู่มือ/ของว่าง) ทุกหน้าใช้ป้ายเดียวกัน หน้าตาจะได้เหมือนกัน
// ใส่ large = ป้ายใหญ่ขึ้น (ไว้ในป๊อปอัพ)
defineProps<{ large?: boolean }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full bg-moon-cream font-medium"
    :class="large ? 'px-3 py-1 text-xs' : 'px-2 py-[2px] text-xxs'"
  >
    <svg viewBox="0 0 24 24" class="badge-star shrink-0 text-moon-coral" :class="large ? 'h-3.5 w-3.5' : 'h-3 w-3'" fill="currentColor" aria-hidden="true">
      <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
    </svg>
    แนะนำสำหรับคุณ
  </span>
</template>

<style scoped>
/* ดาวกะพริบเบาๆ ให้ดูมีประกาย */
.badge-star {
  animation: badge-twinkle 2.2s ease-in-out infinite;
}

@keyframes badge-twinkle {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(0.7) rotate(25deg); opacity: 0.6; }
}

@media (prefers-reduced-motion: reduce) {
  .badge-star {
    animation: none;
  }
}
</style>

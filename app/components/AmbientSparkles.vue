<script setup lang="ts">
// ===== ประกายดาวจางๆ ลอยตกแต่งพื้นหลัง (app/components/AmbientSparkles.vue) =====
// วางไว้หลังเนื้อหาของหน้า (z-0) กดอะไรไม่ได้ ไม่บังข้อความ ใช้ได้ทุกหน้าที่อยากได้ความฟรุ้งฟริ้ง
// ตำแหน่งเป็น % ของจอ, op = ความเข้มสูงสุด (ตั้งให้จางกว่าหน้า reveal), dur/delay = วินาที
const sparkles = [
  { left: '4%', top: '6%', size: 22, dur: 9, delay: 0, color: 'text-moon-coral', op: 0.4 },
  { left: '90%', top: '5%', size: 16, dur: 8, delay: 1.5, color: 'text-moon-lavender', op: 0.6 },
  { left: '50%', top: '3%', size: 9, dur: 7, delay: 3.4, color: 'text-moon-period-predicted', op: 0.5 },
  { left: '8%', top: '30%', size: 14, dur: 8, delay: 2.6, color: 'text-moon-period-predicted', op: 0.5 },
  { left: '92%', top: '28%', size: 26, dur: 11, delay: 0.8, color: 'text-moon-coral', op: 0.35 },
  { left: '3%', top: '48%', size: 18, dur: 10, delay: 4.2, color: 'text-moon-lavender', op: 0.6 },
  { left: '94%', top: '50%', size: 11, dur: 7, delay: 2.2, color: 'text-moon-coral', op: 0.5 },
  { left: '6%', top: '68%', size: 24, dur: 11, delay: 2.8, color: 'text-moon-coral', op: 0.35 },
  { left: '91%', top: '70%', size: 14, dur: 8, delay: 0.4, color: 'text-moon-lavender', op: 0.6 },
  { left: '12%', top: '88%', size: 10, dur: 7, delay: 3.6, color: 'text-moon-lavender', op: 0.6 },
  { left: '86%', top: '90%', size: 20, dur: 9, delay: 1.9, color: 'text-moon-period-predicted', op: 0.5 },
  { left: '48%', top: '94%', size: 8, dur: 8, delay: 4.6, color: 'text-moon-coral', op: 0.5 }
]
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
    <svg
      v-for="(s, i) in sparkles"
      :key="i"
      viewBox="0 0 24 24"
      class="ambient absolute"
      :class="s.color"
      :style="{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, '--op': s.op, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }"
      fill="currentColor"
    >
      <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
    </svg>
  </div>
</template>

<style scoped>
/* ค่อยๆ ปรากฏ หมุนเบาๆ ลอยขึ้น แล้วจางหาย แต่ละดวงเริ่มไม่พร้อมกัน */
.ambient {
  opacity: 0;
  animation-name: ambient-float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes ambient-float {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5) rotate(0deg);
  }
  30%,
  70% {
    opacity: var(--op);
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(1) rotate(70deg);
  }
}

/* คนที่ตั้งค่าลดแอนิเมชันไว้ ให้ประกายนิ่งๆ ไม่ขยับ */
@media (prefers-reduced-motion: reduce) {
  .ambient {
    animation: none;
    opacity: 0.25;
  }
}
</style>

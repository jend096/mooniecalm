<script setup lang="ts">
// ===== ชื่อแอป "Moonie Calm" (app/components/BrandWordmark.vue) =====
// ใช้รูป SVG ที่ส่งออกจากฟิกม่า (ตัวหนังสือถูกแปลงเป็นเส้นแล้ว) จึงไม่ขึ้นกับฟอนต์ในเครื่อง
// หูกระต่ายอยู่ในรูปเดียวกัน ส่วนประกายฟรุ้งฟริ้งรอบชื่อวาดแยกไว้ที่หน้า index.vue (ไฟล์ชื่อไม่มีประกายแล้ว)
//   lines = 'two' -> สองบรรทัด (Moonie / Calm) = Group 254 ใช้ในหน้าเปิดแอป
//   lines = 'one' -> บรรทัดเดียว (Moonie Calm)  = Group 255 ใช้ในหน้า index
// size = ขนาดตัวอักษรเทียบกับฟิกม่า (ในฟิกม่าใช้ 64) รูปย่อ/ขยายตามสัดส่วนนี้
const props = withDefaults(defineProps<{ lines?: 'one' | 'two', size?: number }>(), { lines: 'two', size: 64 })

// ขนาดจริงของไฟล์ SVG ที่ ณ ตัวอักษร 64px (กว้าง x สูง)
const FILES = {
  one: { src: '/brand/wordmark-one.svg', w: 387, h: 71 }, // ขนาดตามไฟล์ล่าสุดที่ส่งออกจากฟิกม่า (ถ้าเปลี่ยนไฟล์ แล้วขนาดไม่เท่านี้ ให้แก้เลขสองตัวนี้)
  two: { src: '/brand/wordmark-two.svg', w: 236, h: 159 },
} as const

const file = computed(() => FILES[props.lines])
const scale = computed(() => props.size / 64)
</script>

<template>
  <img
    class="wordmark"
    :src="file.src"
    :width="Math.round(file.w * scale)"
    :height="Math.round(file.h * scale)"
    alt="Moonie Calm"
    draggable="false"
  >
</template>

<style scoped>
.wordmark {
  display: block; /* ไม่ใช้ inline เพราะจะมีช่องว่างใต้รูปเท่าตัวอักษร ทำให้หน้าที่ใช้เลื่อนลงไปอีก ~4px */
  max-width: none;
  user-select: none;
  -webkit-user-drag: none;
}
</style>

<script setup lang="ts">
// ===== โลโก้รองมุมขวาบนของทุกหน้า (app/components/BrandCorner.vue) =====
// วางที่ app.vue ที่เดียว ทุกหน้าได้โลโก้ตัวเล็ก (พระจันทร์ + กระต่าย) โดยไม่ต้องใส่ทีละหน้า
// โลโก้นี้เป็น "โลโก้รอง" ส่วนโลโก้หลัก (ชื่อ Moonie Calm) ใช้ที่หน้าแรกกับหน้ารอ (หน้าเผยอวตารใช้โลโก้รองนี้เหมือนหน้าอื่น)
// หน้าที่ไม่ใส่โลโก้มุมนี้ (มีโลโก้ของตัวเองอยู่แล้ว หรือมุมขวาบนไม่ว่าง) ดูที่ HIDDEN ด้านล่าง
const route = useRoute()

// หน้าแรก / หน้ารอ มีโลโก้ใหญ่ของตัวเอง, ปฏิทินวางโลโก้ไว้ในแถบบนของหน้าเอง (ขวาบนมีคำอธิบายสัญลักษณ์)
const HIDDEN = new Set(['/', '/onboarding/loading', '/calendar'])
const LOGO_SIZE = 42 // ขนาดโลโก้รอง (px) พี่เบอร์รี่ว่าตัวเล็กไปไม่ชัด จึงขยายจาก 34
// หน้าที่มีปุ่มย้อนกลับกลมซ้ายบน (กลางปุ่มอยู่ที่ 44px จากขอบบน) จัดโลโก้ให้กึ่งกลางเท่าปุ่ม (top = 44 - ครึ่งหนึ่งของโลโก้)
const WITH_BACK_BUTTON = new Set(['/checkin', '/guide', '/snack', '/symptoms'])

const visible = computed(() => !HIDDEN.has(route.path))
// หน้า onboarding มีแถบความคืบหน้าอยู่ใต้โลโก้ (ขอบบนแถบอยู่ราว 56px) เลยยกโลโก้ขึ้นให้ไม่ทับแถบ
const top = computed(() => {
  if (WITH_BACK_BUTTON.has(route.path)) return 44 - LOGO_SIZE / 2
  if (route.path.startsWith('/onboarding/')) return 8
  return 18
})
const right = computed(() => (route.path === '/home' ? 38 : 24)) // หน้าหลักเว้นขอบ 38px ตามหัวหน้าของหน้านั้น
</script>

<template>
  <div
    v-if="visible"
    class="pointer-events-none absolute z-[25]"
    :style="{ top: `${top}px`, right: `${right}px` }"
    aria-hidden="true"
  >
    <BrandLogoMark :size="LOGO_SIZE" />
  </div>
</template>

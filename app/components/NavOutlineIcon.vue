<script setup lang="ts">
// ไอคอนแบบ "เส้น" (outline) สำหรับปุ่มในแถบเมนูล่างตอนที่ยังไม่ได้กด (BottomNav.vue)
// ตอนกด (หน้าที่เปิดอยู่) จะเปลี่ยนไปใช้ไอคอนแบบทึบจาก FaIcon แทน
// รูปร่างเส้นมาจากชุดไอคอน Lucide (https://lucide.dev ไลเซนส์ ISC ใช้ได้ฟรีในโปรเจคจริง ควรใส่เครดิตในสไลด์ลิขสิทธิ์ไอคอน)
// เส้นใช้สีตามตัวหนังสือรอบข้าง (currentColor) ความหนาปรับที่ stroke-width
// อยากเพิ่มไอคอนใหม่: เพิ่มชื่อใน NavOutlineName แล้วใส่ path ใน PATHS (ทุกอันวาดบนกรอบ 24 x 24)
export type NavOutlineName = 'house' | 'clipboard-check' | 'square-plus' | 'chart-line' | 'location-dot'

const PATHS: Record<NavOutlineName, string[]> = {
  'house': [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'
  ],
  'clipboard-check': [
    'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z',
    'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
    'm9 14 2 2 4-4'
  ],
  'square-plus': [
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M8 12h8',
    'M12 8v8'
  ],
  'chart-line': [
    'M3 3v16a2 2 0 0 0 2 2h16',
    'm19 9-5 5-4-4-3 3'
  ],
  'location-dot': [
    'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
    'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'
  ]
}

defineProps<{ name: NavOutlineName }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in PATHS[name]" :key="i" :d="d" />
  </svg>
</template>

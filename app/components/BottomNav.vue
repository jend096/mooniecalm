<script setup lang="ts">
import type { FaIconName } from '~/utils/fa-icons'

// แถบเมนูล่าง 5 ปุ่ม ตามฟิกม่า (หน้าหลัก / เช็คอิน / บันทึก / สรุปเดือน / รพ.ใกล้ฉัน)
// active = ปุ่มที่กำลังอยู่ (สีชมพู) ส่ง 'none' ถ้าหน้านั้นไม่ใช่ปุ่มใดเลย
withDefaults(
  defineProps<{ active?: 'home' | 'checkin' | 'symptoms' | 'summary' | 'hospital' | 'none' }>(),
  { active: 'home' }
)

// to = null แปลว่ายังไม่มีหน้านี้ (ปุ่มจะจางและกดไม่ได้ จนกว่าจะทำหน้านั้นเสร็จ แล้วค่อยใส่ path)
const tabs: { key: 'home' | 'checkin' | 'symptoms' | 'summary' | 'hospital', label: string, icon: FaIconName, to: string | null }[] = [
  { key: 'home', label: 'หน้าหลัก', icon: 'house', to: '/home' },
  { key: 'checkin', label: 'เช็คอิน', icon: 'clipboard-check', to: '/checkin' },
  { key: 'symptoms', label: 'บันทึก', icon: 'square-plus', to: '/symptoms' },
  { key: 'summary', label: 'สรุปเดือน', icon: 'chart-line', to: null },
  { key: 'hospital', label: 'รพ.ใกล้ฉัน', icon: 'location-dot', to: null }
]

</script>

<template>
  <!-- แถบโค้งตามฟิกม่า: พื้นขาว มุมบนซ้าย-ขวาโค้ง 50 ไม่มีเส้นขอบ มีเงาบางๆ ด้านบนให้ลอยขึ้นจากพื้นหลัง
       px-5 กันไม่ให้ปุ่มซ้ายสุด/ขวาสุดไปชนส่วนโค้งของมุม -->
  <nav class="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around rounded-t-[35px] bg-moon-card px-5 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-1 shadow-[0_-6px_20px_rgba(41,41,41,0.08)]">
    <template v-for="tab in tabs" :key="tab.key">
      <NuxtLink
        v-if="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-3"
        :class="active === tab.key ? 'text-moon-period' : 'text-moon-ink'"
      >
        <!-- หน้าที่เปิดอยู่: ไอคอนขยายใหญ่ขึ้น (ขยายด้วย scale เลยไม่ดันความสูงของแถบเมนู) -->
        <FaIcon
          :name="tab.icon"
          class="h-5 w-5 origin-center transition-transform duration-200"
          :class="active === tab.key ? 'scale-[1.5]' : ''"
        />
        <span :class="active === tab.key ? 'text-xs font-semibold' : 'text-[11px] font-medium'">{{ tab.label }}</span>
      </NuxtLink>

      <button
        v-else
        type="button"
        disabled
        class="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-moon-ink opacity-40"
      >
        <FaIcon :name="tab.icon" class="h-5 w-5" />
        <span class="text-[11px] font-medium">{{ tab.label }}</span>
      </button>
    </template>

  </nav>
</template>

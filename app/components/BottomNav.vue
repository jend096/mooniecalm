<script setup lang="ts">
// ชื่อไอคอนของแต่ละปุ่ม (มีทั้งแบบเส้นใน NavOutlineIcon.vue และแบบทึบใน FaIcon ชื่อเดียวกัน)
type NavIcon = 'house' | 'clipboard-check' | 'square-plus' | 'chart-line' | 'location-dot'

// แถบเมนูล่าง 5 ปุ่ม ตามฟิกม่า (หน้าหลัก / เช็คอิน / บันทึก / สรุปเดือน / รพ.ใกล้ฉัน)
// active = ปุ่มที่กำลังอยู่ ส่ง 'none' ถ้าหน้านั้นไม่ใช่ปุ่มใดเลย
// ปุ่มที่ยังไม่ได้กด = ไอคอนเส้น (NavOutlineIcon.vue) / ปุ่มที่กำลังอยู่ = ไอคอนทึบสีขาวบนวงกลมสีชมพู + ตัวหนังสือสีชมพู
withDefaults(
  defineProps<{ active?: 'home' | 'checkin' | 'symptoms' | 'summary' | 'hospital' | 'none' }>(),
  { active: 'home' }
)

// to = null แปลว่ายังไม่มีหน้านี้ (ปุ่มจะจางและกดไม่ได้ จนกว่าจะทำหน้านั้นเสร็จ แล้วค่อยใส่ path)
const tabs: { key: 'home' | 'checkin' | 'symptoms' | 'summary' | 'hospital', label: string, icon: NavIcon, to: string | null }[] = [
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
  <nav class="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around rounded-t-[35px] bg-moon-card px-5 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-1 shadow-[0_-6px_20px_color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
    <template v-for="tab in tabs" :key="tab.key">
      <NuxtLink
        v-if="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1.5"
        :class="active === tab.key ? 'text-moon-period' : 'text-moon-ink'"
      >
        <!-- วงกลมหลังไอคอน: ปุ่มที่กำลังอยู่ = วงกลมสีชมพูเข้ม (bg-moon-period) ลอยขึ้นนิดหนึ่ง + ไอคอนทึบสีขาว
             ปุ่มอื่น = ไม่มีวงกลม (โปร่งใส) ไอคอนเป็นเส้นสีเทาเข้ม  ขนาดวงกลมปรับที่ h-10 w-10 -->
        <span
          class="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
          :class="active === tab.key ? 'bg-moon-period text-white shadow-[0_4px_10px_color-mix(in_srgb,var(--color-period-day)_45%,transparent)] -translate-y-1 scale-105' : 'bg-transparent'"
        >
          <FaIcon v-if="active === tab.key" :name="tab.icon" class="h-5 w-5" />
          <NavOutlineIcon v-else :name="tab.icon" class="h-6 w-6" />
        </span>
        <span :class="active === tab.key ? 'text-xs font-semibold' : 'text-[11px] font-medium'">{{ tab.label }}</span>
      </NuxtLink>

      <button
        v-else
        type="button"
        disabled
        class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-moon-ink opacity-40"
      >
        <span class="flex h-10 w-10 items-center justify-center">
          <NavOutlineIcon :name="tab.icon" class="h-6 w-6" />
        </span>
        <span class="text-[11px] font-medium">{{ tab.label }}</span>
      </button>
    </template>

  </nav>
</template>

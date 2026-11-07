<script setup lang="ts">
// ชื่อไอคอนของแต่ละปุ่ม (มีทั้งแบบเส้นใน NavOutlineIcon.vue และแบบทึบใน FaIcon ชื่อเดียวกัน)
type NavIcon = 'house' | 'clipboard-check' | 'square-plus' | 'chart-line' | 'location-dot'

// แถบเมนูล่าง 5 ปุ่ม ตามฟิกม่า (หน้าหลัก / เช็คอิน / บันทึก / สรุปเดือน / รพ.ใกล้ฉัน)
// active = ปุ่มที่กำลังอยู่ ส่ง 'none' ถ้าหน้านั้นไม่ใช่ปุ่มใดเลย
// ปุ่มที่ยังไม่ได้กด = ไอคอนเส้น (NavOutlineIcon.vue) / ปุ่มที่กำลังอยู่ = ไอคอนทึบสีขาวบนวงกลมสีชมพู + ตัวหนังสือสีชมพู
// aboveOverlay = true: ยกแถบเมนูขึ้นมาอยู่เหนือป๊อปอัพ/พื้นหลังมืด (กดเมนูได้เลย ไม่ต้องกดปิดป๊อปอัพก่อน)
const props = withDefaults(
  defineProps<{
    active?: 'home' | 'checkin' | 'symptoms' | 'summary' | 'hospital' | 'none'
    aboveOverlay?: boolean
  }>(),
  { active: 'home', aboveOverlay: false }
)

// ปุ่มที่เพิ่งกด: ไฮไลต์ทันทีที่แตะ (ไม่ต้องรอหน้าใหม่โหลดเสร็จ) ผู้ใช้จะรู้ว่า "กดติดแล้ว" แม้เน็ตช้า
// พอเปลี่ยนหน้าเสร็จ แถบเมนูของหน้าใหม่จะถูกสร้างใหม่เองและค่านี้ก็รีเซ็ตเป็นว่าง
const tappedKey = ref<string | null>(null)
const shownActive = computed(() => tappedKey.value ?? props.active)

// to = null แปลว่ายังไม่มีหน้านี้ (ปุ่มสีเท่าปุ่มอื่นแต่กดไม่ได้ จนกว่าจะทำหน้านั้นเสร็จ แล้วค่อยใส่ path)
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
  <nav class="fixed inset-x-0 bottom-0 flex items-stretch justify-around rounded-t-[35px] bg-moon-card px-5 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-1 shadow-[0_-6px_20px_color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
    :class="aboveOverlay ? 'z-[60]' : 'z-30'"
  >
    <template v-for="tab in tabs" :key="tab.key">
      <NuxtLink
        v-if="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1.5"
        :class="shownActive === tab.key ? 'text-moon-period' : 'text-moon-ink'"
        @click="tappedKey = tab.key"
      >
        <!-- วงกลมหลังไอคอน: ปุ่มที่กำลังอยู่ = วงกลมสีชมพูเข้ม (bg-moon-period) ลอยขึ้นนิดหนึ่ง + ไอคอนทึบสีขาว
             ปุ่มอื่น = ไม่มีวงกลม (โปร่งใส) ไอคอนเป็นเส้นสีเทาเข้ม  ขนาดวงกลมปรับที่ h-10 w-10 -->
        <span
          class="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
          :class="shownActive === tab.key ? 'bg-moon-period text-white shadow-[0_4px_10px_color-mix(in_srgb,var(--color-period-day)_45%,transparent)] -translate-y-1 scale-105' : 'bg-transparent'"
        >
          <FaIcon v-if="shownActive === tab.key" :name="tab.icon" class="h-5 w-5" />
          <NavOutlineIcon v-else :name="tab.icon" class="h-6 w-6" />
        </span>
        <span :class="shownActive === tab.key ? 'text-xs font-semibold' : 'text-[11px] font-medium'">{{ tab.label }}</span>
      </NuxtLink>

      <button
        v-else
        type="button"
        disabled
        class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-moon-ink"
      >
        <span class="flex h-10 w-10 items-center justify-center">
          <NavOutlineIcon :name="tab.icon" class="h-6 w-6" />
        </span>
        <span class="text-[11px] font-medium">{{ tab.label }}</span>
      </button>
    </template>

  </nav>
</template>

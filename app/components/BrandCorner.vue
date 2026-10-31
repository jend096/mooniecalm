<script setup lang="ts">
// ===== โลโก้รองมุมขวาบนของทุกหน้า (app/components/BrandCorner.vue) =====
// วางที่ app.vue ที่เดียว ทุกหน้าได้โลโก้ตัวเล็ก (พระจันทร์ + กระต่าย) โดยไม่ต้องใส่ทีละหน้า
// โลโก้นี้เป็น "โลโก้รอง" ส่วนโลโก้หลัก (ชื่อ Moonie Calm) ใช้ที่หน้าแรกกับหน้ารอ (หน้าเผยอวตารใช้โลโก้รองนี้เหมือนหน้าอื่น)
// หน้าที่ไม่ใส่โลโก้มุมนี้ (มีโลโก้ของตัวเองอยู่แล้ว หรือมุมขวาบนไม่ว่าง) ดูที่ HIDDEN ด้านล่าง
const route = useRoute()
// path ที่ตัด "/" ท้ายออก: ตอนรันในเครื่อง (npm run dev) โฟลเดอร์ public/home ทำให้ /home ถูกพาไป /home/ (มี / ท้าย)
// ถ้าเทียบตรงๆ จะไม่ตรงกับรายการด้านล่าง เมนูเลยไม่ขึ้น จึงตัด / ท้ายออกก่อนเทียบเสมอ
const path = computed(() => route.path.replace(/\/+$/, '') || '/')

// หน้าแรก / หน้ารอ มีโลโก้ใหญ่ของตัวเอง, ปฏิทินวางโลโก้ไว้ในแถบบนของหน้าเอง (ขวาบนมีคำอธิบายสัญลักษณ์)
// หน้าเข้าสู่ระบบ (/onboarding/signup) ก็ซ่อน เพราะมีกระต่าย+ชื่อแอปใหญ่ของตัวเองแล้ว
const HIDDEN = new Set(['/', '/onboarding/loading', '/calendar', '/onboarding/signup'])
const LOGO_SIZE = 42 // ขนาดโลโก้รอง (px) พี่เบอร์รี่ว่าตัวเล็กไปไม่ชัด จึงขยายจาก 34
// หน้าที่มีปุ่มย้อนกลับกลมซ้ายบน (กลางปุ่มอยู่ที่ 44px จากขอบบน) จัดโลโก้ให้กึ่งกลางเท่าปุ่ม (top = 44 - ครึ่งหนึ่งของโลโก้)
const WITH_BACK_BUTTON = new Set(['/checkin', '/guide', '/snack', '/symptoms'])

const visible = computed(() => !HIDDEN.has(path.value))
// หน้า onboarding มีแถบความคืบหน้าอยู่ใต้โลโก้ (ขอบบนแถบอยู่ราว 56px) เลยยกโลโก้ขึ้นให้ไม่ทับแถบ
const top = computed(() => {
  if (WITH_BACK_BUTTON.has(path.value)) return 44 - LOGO_SIZE / 2
  if (path.value.startsWith('/onboarding/')) return 8
  return 18
})
const right = computed(() => (path.value === '/home' ? 38 : 24)) // หน้าหลักเว้นขอบ 38px ตามหัวหน้าของหน้านั้น

// ===== เมนู "ออกจากระบบ" ที่โลโก้มุมขวาบน =====
// หน้าที่ล็อกอินแล้ว: แตะโลโก้ -> มีกล่องเล็กๆ "ออกจากระบบ" ขึ้นมาใต้โลโก้ (แตะนอกกล่องหรือเปลี่ยนหน้า = ปิด)
// หน้าอื่น (เช่น onboarding ที่ยังไม่ได้ล็อกอิน) โลโก้เป็นแค่ลายตกแต่ง กดไม่ได้เหมือนเดิม
// อยากให้หน้าไหนมีเมนู ก็เพิ่ม path ในรายการนี้
const MENU_PAGES = new Set(['/home', '/checkin', '/guide', '/snack', '/symptoms', '/profile-photo'])
const hasMenu = computed(() => MENU_PAGES.has(path.value))
const open = ref(false)
const loggingOut = ref(false)
watch(path, () => { open.value = false }) // เปลี่ยนหน้าแล้วปิดเมนูเอง

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  open.value = false
  loggingOut.value = false
  await navigateTo('/')
}
</script>

<template>
  <!-- ไม่มีเมนู = ลายตกแต่งกดไม่ได้ (pointer-events-none) / มีเมนู = กดโลโก้แล้วเปิดกล่องออกจากระบบ -->
  <div
    v-if="visible"
    class="absolute z-[25]"
    :class="hasMenu ? '' : 'pointer-events-none'"
    :style="{ top: `${top}px`, right: `${right}px` }"
    :aria-hidden="hasMenu ? undefined : 'true'"
  >
    <BrandLogoMark v-if="!hasMenu" :size="LOGO_SIZE" />

    <template v-else>
      <!-- พื้นโปร่งใสเต็มจอ: แตะตรงไหนนอกกล่องก็ปิดเมนู -->
      <div v-if="open" class="fixed inset-0 z-0" @click="open = false" />

      <button
        type="button"
        class="relative z-10 block"
        aria-label="เมนูบัญชี"
        aria-haspopup="true"
        :aria-expanded="open"
        @click="open = !open"
      >
        <BrandLogoMark :size="LOGO_SIZE" />
      </button>

      <!-- กล่องเมนู: ลอยใต้โลโก้ชิดขวา (ปรับความกว้างที่ min-w / มุมโค้งที่ rounded) -->
      <div
        v-if="open"
        class="absolute right-0 top-full z-10 mt-2 min-w-[150px] rounded-2xl border border-moon-pink-soft bg-moon-card p-1.5 shadow-2xl"
      >
        <button
          type="button"
          class="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-moon-ink"
          :disabled="loggingOut"
          @click="logout"
        >
          ออกจากระบบ
        </button>
      </div>
    </template>
  </div>
</template>

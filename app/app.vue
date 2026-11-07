<script setup lang="ts">
// ===== โครงหน้าทั้งแอป + หน้ารอโหลดตอนเปลี่ยนหน้า =====
// เดิม: ทุกครั้งที่เปลี่ยนหน้าจะมีกระต่ายขึ้นคลุมจออย่างน้อย 0.5 วินาที ต่อให้หน้านั้นพร้อมแล้ว ทำให้เห็นวาบๆ ทุกครั้งที่กดเปลี่ยนหน้า
// ตอนนี้: ขึ้นเฉพาะตอน "รอจริงๆ" นานเกิน SHOW_AFTER_MS (เช่นกดหน้าที่ยังไม่เคยเปิดแล้วเน็ตช้า) เปลี่ยนหน้าได้เร็วก็ไม่ขึ้นเลย
// และพอหน้าใหม่พร้อมก็ปิดทันที ไม่ค้าง
// หน้าที่ดึงข้อมูลเอง (หน้าหลัก ปฏิทิน เช็คอิน ฯลฯ) มีหน้ารอของตัวเองในหน้านั้นอยู่แล้ว (ดู LoadingOverlay + page-cache)
// ข้าม: หน้าแรก (index มีแอนิเมชันเปิดแอปของตัวเอง) / onboarding/loading (มีกระต่ายให้แตะอยู่แล้ว)
const nuxtApp = useNuxtApp()
const router = useRouter()

const SKIP_PATHS = ['/', '/onboarding/loading']
const SHOW_AFTER_MS = 600 // รอนานเกินเท่านี้ถึงขึ้นหน้ารอ (ปรับเลขนี้ได้)

const navLoading = ref(false)
let appReady = false // ตอนเปิดเว็บครั้งแรกไม่ต้องขึ้น (รอให้แอปขึ้นเสร็จก่อน)
let showTimer: ReturnType<typeof setTimeout> | undefined

nuxtApp.hook('app:mounted', () => { appReady = true })

function stopNavLoading() {
  clearTimeout(showTimer)
  navLoading.value = false
}

// เริ่มเปลี่ยนหน้า -> ตั้งเวลาไว้ ถ้ายังไม่เสร็จเมื่อครบเวลาค่อยขึ้นหน้ารอ (ดูที่หน้าปลายทาง "to" เพราะตอนนี้ router ยังอยู่หน้าเดิม)
const removeGuard = router.beforeEach((to, from) => {
  if (!appReady) return
  if (to.fullPath === from.fullPath) return // กดไปหน้าเดิม ไม่ได้เปลี่ยนหน้าจริง
  if (SKIP_PATHS.includes(to.path)) return
  clearTimeout(showTimer)
  showTimer = setTimeout(() => { navLoading.value = true }, SHOW_AFTER_MS)
})
// เปลี่ยนหน้าเสร็จ (หรือพลาด) -> เลิกตั้งเวลา และปิดหน้ารอทันที
const removeAfter = router.afterEach(stopNavLoading)
const removeError = router.onError(stopNavLoading)
nuxtApp.hook('page:loading:end', stopNavLoading)

onBeforeUnmount(() => {
  removeGuard()
  removeAfter()
  removeError()
  clearTimeout(showTimer)
})
</script>

<template>
  <div class="flex min-h-dvh justify-center bg-moon-pink-soft">
    <div class="relative min-h-dvh w-full max-w-[430px] bg-moon-bg shadow-xl">
      <NuxtRouteAnnouncer />
      <NuxtPage />
      <!-- โลโก้รองมุมขวาบนของทุกหน้า (ดูเงื่อนไขในคอมโพเนนต์) -->
      <BrandCorner />
      <!-- delay 0 เพราะรอมาตั้ง SHOW_AFTER_MS แล้ว ไม่ต้องรอซ้ำ -->
      <LoadingOverlay v-if="navLoading" :delay="0" />
    </div>
  </div>
</template>

<script setup lang="ts">
// ===== โครงหน้าทั้งแอป + หน้ารอโหลดตอนเปลี่ยนหน้า =====
// ทุกครั้งที่เปลี่ยนหน้า จะมีกระต่ายโผล่ขึ้น-หุบลง (LoadingOverlay) ขึ้นคลุมจออย่างน้อย ~0.6 วินาที จะได้เห็นว่ากำลังเปลี่ยนหน้า
// ข้ามหน้าแรก (index มีแอนิเมชันเปิดแอปของตัวเอง) กับหน้า onboarding/loading (มีกระต่ายให้แตะอยู่แล้ว)
const nuxtApp = useNuxtApp()
const router = useRouter()

const SKIP_PATHS = ['/', '/onboarding/loading']
const MIN_VISIBLE_MS = 500

const navLoading = ref(false)
let appReady = false // ตอนเปิดเว็บครั้งแรกไม่ต้องขึ้น (รอให้แอปขึ้นเสร็จก่อน)
let shownAt = 0
let hideTimer: ReturnType<typeof setTimeout> | undefined

nuxtApp.hook('app:mounted', () => { appReady = true })

// เริ่มเปลี่ยนหน้า -> ขึ้นหน้ารอโหลด
nuxtApp.hook('page:start', () => {
  if (!appReady) return
  if (SKIP_PATHS.includes(router.currentRoute.value.path)) return
  clearTimeout(hideTimer)
  navLoading.value = true
  shownAt = Date.now()
})

// หน้าใหม่พร้อมแล้ว -> รอให้ครบเวลาขั้นต่ำก่อนค่อยปิด (ไม่ให้วูบหายเร็วเกินไป)
nuxtApp.hook('page:finish', () => {
  if (!navLoading.value) return
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { navLoading.value = false }, Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt)))
})
</script>

<template>
  <div class="flex min-h-dvh justify-center bg-moon-pink-soft">
    <div class="min-h-dvh w-full max-w-[430px] bg-moon-bg shadow-xl">
      <NuxtRouteAnnouncer />
      <NuxtPage />
      <LoadingOverlay v-if="navLoading" />
    </div>
  </div>
</template>

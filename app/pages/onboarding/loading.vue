<script setup lang="ts">
// ===== หน้า loading (หลังเลือกรูปโปรไฟล์ ก่อนไปหน้าเฉลยตัวละคร) =====
// หน้าตาเหมือนหน้า index (พื้นหลัง/หูกระต่าย/ประกายตกแต่ง/โลโก้) แต่ไม่มีข้อความ
//   เริ่มด้วยพระจันทร์เปล่าๆ + วงจางๆ ขยายออก + ข้อความใบ้ให้แตะ
//   แตะ -> กระต่ายถูกดึงขึ้นมาในโลโก้ -> วาบ + ประกายพุ่งออกด้านหลังโลโก้ -> ไปหน้า reveal
//   ไม่แตะ -> รอ AUTO_PULL_MS แล้วเล่นให้เองแบบเดียวกัน (ผู้ใช้จะได้ไม่ค้างอยู่หน้านี้)
const AUTO_PULL_MS = 3500 // ไม่แตะนานเท่านี้ ระบบดึงกระต่ายให้เอง
const CELEBRATE_MS = 2800 // จากกระต่ายเริ่มขึ้น ถึงตอนไปหน้าถัดไป (ให้ประกายพุ่งครบก่อน)
const REDUCED_MS = 1500 // คนที่ตั้งค่า "ลดแอนิเมชัน" ไว้ในเครื่อง: โชว์โลโก้ครบเลย แล้วไปหน้าถัดไป

type Stage = 'moon' | 'rising' | 'full'
const stage = ref<Stage>('moon')
const timers: ReturnType<typeof setTimeout>[] = []
let autoTimer: ReturnType<typeof setTimeout> | undefined

// ประกายตกแต่ง 4 ดวง ตำแหน่งเดียวกับหน้า index
const staticSparkles = [
  { left: '11.9%', top: '22%', size: 16, color: 'var(--color-period-predicted)' },
  { left: '4.9%', top: '34%', size: 24, color: 'var(--color-lavender)' },
  { left: '81.5%', top: '43.1%', size: 26, color: 'var(--color-lavender)' },
  { left: '92%', top: '76%', size: 14, color: 'var(--color-coral)' }
]

function goNext() {
  navigateTo('/onboarding/reveal')
}

const SKIP_GUARD_MS = 500 // หลังเริ่มดึงกระต่ายแล้ว ต้องผ่านเวลานี้ก่อนถึงจะแตะข้ามได้ (กันแตะรัวสองทีแล้วข้ามทันทีโดยไม่ได้เห็นอนิเมชัน)
let risingAt = 0

// แตะ (หรือครบเวลารอ) -> ดึงกระต่ายขึ้น แล้วไปหน้าถัดไป
// แตะซ้ำตอนอนิเมชันกำลังเล่นอยู่ (stage = rising) -> ข้ามอนิเมชัน ไปหน้าถัดไปเลย (แตะตรงไหนของจอก็ได้)
function pullRabbit() {
  if (stage.value === 'rising') {
    if (Date.now() - risingAt < SKIP_GUARD_MS) return
    timers.forEach(clearTimeout)
    timers.length = 0
    goNext()
    return
  }
  if (stage.value !== 'moon') return
  if (autoTimer) clearTimeout(autoTimer)
  stage.value = 'rising'
  risingAt = Date.now()
  timers.push(setTimeout(goNext, CELEBRATE_MS))
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stage.value = 'full'
    timers.push(setTimeout(goNext, REDUCED_MS))
    return
  }
  autoTimer = setTimeout(pullRabbit, AUTO_PULL_MS)
})

onBeforeUnmount(() => {
  if (autoTimer) clearTimeout(autoTimer)
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div class="loading-page" @click="pullRabbit">
    <!-- ตกแต่งเหมือนหน้า index: หูกระต่ายสีพาสเทลบน/ล่าง + ประกายลอยจางๆ -->
    <div class="deco" aria-hidden="true">
      <img class="ears ears-top" src="/brand/ears-top.svg" alt="" draggable="false">
      <img class="ears ears-bottom" src="/brand/ears-bottom.svg" alt="" draggable="false">
      <AmbientSparkles />
      <svg
        v-for="(s, i) in staticSparkles"
        :key="i"
        class="static-spark"
        viewBox="0 0 20 20"
        :fill="s.color"
        :style="{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, animationDelay: `${i * -0.7}s` }"
      >
        <path d="M10 0C10.778 5.889 14.111 9.222 20 10C14.111 10.778 10.778 14.111 10 20C9.222 14.111 5.889 10.778 0 10C5.889 9.222 9.222 5.889 10 0Z" />
      </svg>
    </div>

    <div class="logo-box">
      <BrandLogoMark :size="212" :stage="stage" />
      <!-- ปุ่มโปร่งใสทับพระจันทร์ (แตะตรงไหนของหน้าก็ได้ ปุ่มนี้ไว้ให้คนใช้คีย์บอร์ด/โปรแกรมอ่านจอ) -->
      <button v-if="stage === 'moon'" type="button" class="moon-hit" aria-label="แตะเพื่อดึงกระต่ายขึ้นมา" @click.stop="pullRabbit" />
      <Transition name="hint-fade">
        <p v-if="stage === 'moon'" class="tap-hint">แตะพระจันทร์เพื่อดึงกระต่ายขึ้นมา</p>
      </Transition>
      <!-- ตอนอนิเมชันกำลังเล่น: ใบ้ว่าแตะที่ไหนก็ได้เพื่อข้าม -->
      <p v-if="stage === 'rising'" class="tap-hint">แตะที่ไหนก็ได้เพื่อข้าม</p>
    </div>
  </div>
</template>

<style scoped>
/* พื้นหลังและตกแต่งเหมือนหน้า index (เฟรม 428 x 926) */
.loading-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  overflow: hidden;
  background: linear-gradient(180deg, var(--color-bg-end) 0%, var(--color-card) 100%);
}

.deco {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.ears {
  position: absolute;
  left: 50%;
  z-index: 0;
  width: 428px;
  max-width: none;
  height: 140px;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.ears-top {
  top: 0;
}

.ears-bottom {
  bottom: 0;
}

.static-spark {
  position: absolute;
  z-index: 0;
  display: block;
  pointer-events: none;
  animation: spark-twinkle 3.2s ease-in-out infinite;
}

@keyframes spark-twinkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8) rotate(18deg);
  }
}

/* โลโก้อยู่กลางจอ ขยายนิดหนึ่งเท่าตอนเด้งกลางจอในหน้า index */
.logo-box {
  position: relative;
  z-index: 3;
  width: 212px;
  height: 212px;
  transform: scale(1.15);
}

/* ปุ่มโปร่งใสทับพระจันทร์ + ข้อความใบ้ให้แตะ (โชว์เฉพาะตอนยังไม่แตะ) */
.moon-hit {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tap-hint {
  position: absolute;
  top: 100%;
  right: -60px;
  left: -60px;
  margin-top: 52px;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--color-ink);
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  animation:
    hint-in 0.6s ease 1.3s both,
    hint-bob 1.8s ease-in-out 1.9s infinite;
}

.hint-fade-leave-active {
  animation: hint-out 0.25s ease both;
}

@keyframes hint-in {
  to {
    opacity: 0.75;
  }
}

@keyframes hint-out {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 0;
  }
}

@keyframes hint-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .static-spark {
    animation: none;
  }
}
</style>

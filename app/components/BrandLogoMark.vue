<script setup lang="ts">
// ===== โลโก้ Moonie Calm: พระจันทร์ + กระต่าย + ประกายรอบๆ (app/components/BrandLogoMark.vue) =====
// รูปมาจากฟิกม่า (คอมโพเนนต์ Logo/Mark) ส่งออกเป็น SVG ไว้ที่ public/brand/moon.svg กับ rabbit.svg
// ท่าของโลโก้ (ตั้งด้วย intro หรือ stage):
//   intro = true -> เล่นอนิเมชันเปิดแอปเอง: พระจันทร์ผุด -> กระต่ายโผล่ -> ประกายผุดทีละดวง (ใช้ในหน้า index)
//   stage = 'full'   -> โลโก้ครบ นิ่งอยู่ในท่าสุดท้าย (ประกายยังกะพริบเบาๆ) ใช้ตอนวางเป็นโลโก้เฉยๆ
//   'moon'   -> มีแค่พระจันทร์ + วงจางๆ ขยายออกเป็นจังหวะ (ใบ้ให้แตะ) ยังไม่มีกระต่าย
//   'rising' -> กระต่ายถูกดึงขึ้นมาจากขอบล่างของพระจันทร์ -> วาบ -> ประกายพุ่งออกไปด้านหลังโลโก้ -> ประกาย 6 ดวงขึ้นครบ
//   ('moon' กับ 'rising' ใช้ในหน้า onboarding/loading ที่ให้ผู้ใช้แตะดึงกระต่าย)
//   'bob'    -> กระต่ายโผล่ขึ้นมาแล้วหุบลงสลับกันไปเรื่อยๆ (วนไม่จบ) ใช้เป็นตัวโหลดทั่วแอป (LoadingOverlay)
// ขนาดตั้งด้วย size (px) ทุกอย่างในโลโก้ย่อ/ขยายตามเอง
type Stage = 'full' | 'moon' | 'rising' | 'bob'
const props = withDefaults(defineProps<{ size?: number, intro?: boolean, stage?: Stage }>(), { size: 240, intro: false, stage: 'full' })
// ท่าที่ใช้จริง: stage ที่ไม่ใช่ full มาก่อน ถ้าไม่ได้ตั้ง ดู intro
const mode = computed(() => (props.stage !== 'full' ? props.stage : props.intro ? 'intro' : 'full'))

// ประกาย 6 ดวงรอบพระจันทร์ ตำแหน่ง/ขนาด/สีตามฟิกม่า (วัดบนกรอบ 240 x 240)
const SPARKS = [
  { x: 20, y: 130, s: 20, color: '#FE7777' },
  { x: 191, y: 145, s: 20, color: '#FFFFEC' },
  { x: 9, y: 114, s: 13, color: '#FFFFEC' },
  { x: 220, y: 120, s: 13, color: '#E6DDFF' },
  { x: 13, y: 163, s: 13, color: '#E6DDFF' },
  { x: 206, y: 169, s: 10, color: '#FE7777' }
]
// รูปดาว 4 แฉกจากฟิกม่า (กรอบ 20 x 20)
const SPARK_PATH = 'M10 0C10.778 5.889 14.111 9.222 20 10C14.111 10.778 10.778 14.111 10 20C9.222 14.111 5.889 10.778 0 10C5.889 9.222 9.222 5.889 10 0Z'

function sparkStyle(s: { x: number, y: number, s: number }, i: number) {
  return {
    left: `${(s.x / 240) * 100}%`,
    top: `${(s.y / 240) * 100}%`,
    width: `${(s.s / 240) * 100}%`,
    height: `${(s.s / 240) * 100}%`,
    '--i': i
  }
}

// ประกายที่พุ่งออกจากด้านหลังโลโก้ตอนกระต่ายขึ้นมาแล้ว (14 ดวง กระจายรอบวง)
// ไม่ใช้ Math.random เพื่อให้ผลเหมือนกันทุกครั้ง (หน้าไม่กระโดดตอนโหลด)
const BURST_COLORS = ['#FE7777', '#FFFFEC', '#E6DDFF', '#FFA8E6', '#CCBBFF']
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = ((i * 360) / 14 + (i % 2 ? 9 : -9)) * (Math.PI / 180)
  const dist = 0.62 + (i % 3) * 0.1 // ระยะที่พุ่งไปจากกลางโลโก้ (เป็นเท่าของขนาดโลโก้)
  return {
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist,
    s: 8 + (i % 4) * 4, // ขนาดดาว (px บนโลโก้ขนาด 212)
    color: BURST_COLORS[i % BURST_COLORS.length],
    delay: (i % 5) * 0.04
  }
})

function burstStyle(b: { dx: number, dy: number, s: number, delay: number }) {
  const px = (b.s * props.size) / 212
  return {
    width: `${px}px`,
    height: `${px}px`,
    margin: `${-px / 2}px 0 0 ${-px / 2}px`,
    '--dx': `${b.dx * props.size}px`,
    '--dy': `${b.dy * props.size}px`,
    animationDelay: `${0.95 + b.delay}s`
  }
}
</script>

<template>
  <div
    class="logo-mark"
    :class="`stage-${mode}`"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <!-- วงจางๆ ด้านหลังพระจันทร์ ขยายออกเป็นจังหวะ ใบ้ให้แตะ (ค่อยๆ จางหายตอนแตะแล้ว) -->
    <div v-if="mode === 'moon' || mode === 'rising'" class="hint-rings">
      <span
        v-for="n in 3"
        :key="n"
        class="hint-ring"
        :style="{ animationDelay: `${0.8 + (n - 1) * 0.85}s` }"
      />
    </div>

    <!-- วาบแสง + ประกายพุ่งออกด้านหลังโลโก้ ตอนกระต่ายขึ้นมาแล้ว -->
    <div v-if="mode === 'rising'" class="burst">
      <span class="burst-glow" />
      <svg
        v-for="(b, i) in BURST"
        :key="i"
        class="burst-star"
        viewBox="0 0 20 20"
        :fill="b.color"
        :style="burstStyle(b)"
      >
        <path :d="SPARK_PATH" />
      </svg>
    </div>

    <div class="logo-circle">
      <img class="moon" src="/brand/moon.svg" alt="" draggable="false">
      <!-- กระต่ายอยู่ในวงกลมเดียวกับพระจันทร์ ตอนโผล่ขึ้นมาจึงดูเหมือนโผล่จากขอบล่างของพระจันทร์ -->
      <div class="rabbit-clip">
        <img class="rabbit" src="/brand/rabbit.svg" alt="" draggable="false">
      </div>
    </div>
    <svg
      v-for="(s, i) in SPARKS"
      :key="i"
      class="logo-spark"
      viewBox="0 0 20 20"
      :style="sparkStyle(s, i)"
      :fill="s.color"
    >
      <path :d="SPARK_PATH" />
    </svg>
  </div>
</template>

<style scoped>
.logo-mark {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.logo-circle {
  position: absolute;
  inset: 0;
}

.moon,
.rabbit {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-drag: none;
}

.rabbit-clip {
  position: absolute;
  inset: 0;
  clip-path: circle(50% at 50% 50%);
}

.logo-spark {
  position: absolute;
  display: block;
  transform-origin: 50% 50%;
  animation: spark-twinkle 2.6s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.55s);
}

/* ===== ท่า 'intro': เล่นเองอัตโนมัติ (ลำดับเวลา: พระจันทร์ 0 วิ -> กระต่าย 0.75 วิ -> ประกาย 1.7 วิ) ===== */
.stage-intro .logo-circle {
  animation: moon-pop 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.stage-intro .rabbit {
  animation: rabbit-rise 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.75s both;
}

.stage-intro .logo-spark {
  animation:
    spark-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) calc(1.7s + var(--i) * 0.13s) both,
    spark-twinkle 2.6s ease-in-out calc(2.6s + var(--i) * 0.13s) infinite;
}

/* ===== ท่า 'moon': มีแต่พระจันทร์ (กระต่ายซ่อนอยู่ใต้ขอบล่าง ประกายยังไม่ขึ้น) ===== */
.stage-moon .logo-circle,
.stage-rising .logo-circle {
  animation: moon-pop 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.stage-moon .rabbit {
  transform: translateY(100%);
}

.stage-moon .logo-spark {
  opacity: 0;
  animation: none;
}

/* ===== ท่า 'bob': ตัวโหลด กระต่ายโผล่ขึ้น ค้างนิดหนึ่ง แล้วหุบลงใต้ขอบพระจันทร์ วนซ้ำ (ประกายกะพริบเบาๆ ตามปกติ) ===== */
.stage-bob .rabbit {
  animation: rabbit-bob 1.5s infinite;
}

@keyframes rabbit-bob {
  0%,
  100% {
    transform: translateY(100%);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  40% {
    transform: translateY(-3%);
    animation-timing-function: ease-in-out;
  }
  55% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.55, 0, 0.8, 0.4);
  }
}

/* วงจางๆ ขยายออก 3 วง เหลื่อมกันทีละ 0.85 วิ เริ่มหลังพระจันทร์ผุดเสร็จ */
.hint-rings {
  position: absolute;
  inset: 0;
  transition: opacity 0.4s ease;
}

.stage-rising .hint-rings {
  opacity: 0;
}

.hint-ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(254, 119, 119, 0.35);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(254, 119, 119, 0) 62%, rgba(254, 119, 119, 0.12));
  opacity: 0;
  animation: ring-pulse 2.6s ease-out infinite;
}

/* ===== ท่า 'rising': ลำดับเวลาหลังแตะ: กระต่ายขึ้น 0 -> 1.1 วิ / โลโก้เด้งรับ 0.9 วิ / วาบ+ประกายพุ่ง 0.95 วิ / ประกาย 6 ดวง 1.05 วิ ===== */
.stage-rising {
  animation: arrive-pop 0.5s ease 0.9s both;
}

.stage-rising .rabbit {
  animation: rabbit-pull 1.1s both;
}

.stage-rising .logo-spark {
  animation:
    spark-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) calc(1.05s + var(--i) * 0.1s) both,
    spark-twinkle 2.6s ease-in-out calc(1.9s + var(--i) * 0.1s) infinite;
}

.burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.burst-glow {
  position: absolute;
  inset: -10%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 205, 216, 0.95), rgba(255, 205, 216, 0));
  opacity: 0;
  animation: glow-flash 1.2s ease-out 0.95s both;
}

.burst-star {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  opacity: 0;
  animation: burst-out 1.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes moon-pop {
  from {
    opacity: 0;
    transform: scale(0.55);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ring-pulse {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.75);
  }
}

@keyframes rabbit-rise {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* กระต่ายถูกดึงขึ้นเลยจุดนิดหนึ่ง แล้วเด้งกลับลงที่ */
@keyframes rabbit-pull {
  0% {
    transform: translateY(100%);
    animation-timing-function: ease-out;
  }
  70% {
    transform: translateY(-3%);
    animation-timing-function: ease-in-out;
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes arrive-pop {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.07);
  }
}

@keyframes glow-flash {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  25% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}

@keyframes burst-out {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0) rotate(0deg);
  }
  20% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(1) rotate(120deg);
  }
}

@keyframes spark-in {
  from {
    opacity: 0;
    transform: scale(0) rotate(-90deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes spark-twinkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.8) rotate(18deg);
  }
}

/* คนที่ตั้งค่า "ลดแอนิเมชัน" ไว้ในเครื่อง: ให้โลโก้นิ่งๆ ในท่าสุดท้าย */
@media (prefers-reduced-motion: reduce) {
  .logo-mark,
  .logo-circle,
  .rabbit,
  .logo-spark,
  .hint-ring,
  .burst-glow,
  .burst-star {
    animation: none !important;
  }
}
</style>

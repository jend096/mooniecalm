<template>
  <div class="index-page" :class="[`phase-${phase}`, { 'is-instant': instant, 'is-fast': fast }]" @click="skipIntro">
    <!-- ตกแต่ง: หูกระต่ายสีพาสเทลบน/ล่างตามฟิกม่า + ประกายลอยจางๆ (ค่อยๆ จางเข้ามาหลังโลโก้กลับที่) -->
    <div class="deco reveal-fade" aria-hidden="true">
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

    <main class="index-main">
      <!-- โลโก้: เปิดแอปมาเด้งอยู่กลางจอก่อน (เล่นอนิเมชันพระจันทร์/กระต่าย/ประกาย) แล้วค่อยเลื่อนกลับมาที่ตำแหน่งนี้ -->
      <div ref="logoEl" class="logo-slot" :style="{ transform: logoShift }">
        <BrandLogoMark v-if="phase !== 'prep'" :size="212" :intro="logoIntro" />
      </div>

      <div class="name-wrap reveal-item reveal-side" style="--d: 0s">
        <span class="name-glow" aria-hidden="true" />
        <BrandWordmark lines="one" :size="42" />
      </div>

      <h1 class="welcome reveal-item" style="--d: 0.18s">ยินดีต้อนรับ</h1>
      <p class="intro reveal-item" style="--d: 0.32s">
        พื้นที่จดบันทึกรอบเดือน<br>
        ตอบคำถามสุขภาพสั้น ๆ เพื่อรับตัวละครประจำตัว<br>
        แนะนำการบรรเทาปวดด้วยวิธีธรรมชาติ
      </p>
    </main>

    <div class="index-bottom reveal-item" style="--d: 0.5s">
      <!-- <p class="disclaimer">แอพเราไม่ใช่เครื่องมือวินิจฉัยโรค และไม่ใช่คำแนะนำของแพทย์</p> -->
      <div class="start-wrap">
        <BaseButton label="เริ่มเลย" @click="next" />
        <button type="button" class="login-link" @click="goToLogin">
          มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
        </button>
      </div>
    </div>

    <!-- กด "เริ่มเลย" แล้วเด้งขอความยินยอมเก็บข้อมูลสุขภาพก่อน (ยินยอมแล้วค่อยไปหน้าถัดไป) -->
    <ConsentDialog v-if="showConsent" @accept="acceptConsent" @decline="showConsent = false" />
  </div>
</template>

<script setup lang="ts">
// ===== หน้าแรก (index) พร้อมอนิเมชันเปิดแอป =====
// ลำดับ: โลโก้เด้งอยู่กลางจอ (พระจันทร์ -> กระต่ายโผล่ -> ประกาย) -> เลื่อนกลับมาที่ตำแหน่งในหน้า -> ชื่อเลื่อนเข้ามาจากด้านข้าง -> ข้อความ/ปุ่ม/ตกแต่งค่อยๆ ขึ้นมา
// เล่นครั้งเดียวต่อการเปิดเว็บ (จำด้วย useState) / แตะที่จอเพื่อข้ามได้ / คนที่ตั้งค่า "ลดแอนิเมชัน" ไว้ในเครื่องจะเห็นหน้าครบเลย
const onboarding = useOnboardingStore()

// ประกายตกแต่ง 4 ดวงตามฟิกม่า (ตำแหน่งเป็น % ของหน้าจอ)
const staticSparkles = [
  { left: '11.9%', top: '22%', size: 16, color: 'var(--color-period-predicted)' },
  { left: '4.9%', top: '34%', size: 24, color: 'var(--color-lavender)' },
  { left: '81.5%', top: '43.1%', size: 26, color: 'var(--color-lavender)' },
  { left: '92%', top: '76%', size: 14, color: 'var(--color-coral)' }
]

// ---------- อนิเมชันเปิดแอป ----------
const CENTER_MS = 2800 // โลโก้เล่นอนิเมชันอยู่กลางจอนานเท่านี้ก่อนเลื่อนกลับ (ให้ประกายขึ้นครบ)
const MOVE_MS = 900 // เวลาที่โลโก้เลื่อนกลับที่
const REVEAL_AFTER_MS = 600 // เริ่มให้ของอื่นขึ้นมาหลังโลโก้เริ่มเลื่อนกี่ ms (ขึ้นตอนโลโก้ใกล้ถึงที่)

type Phase = 'prep' | 'center' | 'move' | 'reveal'
const played = useState('splash-played', () => false) // เคยเล่นอนิเมชันในการเปิดเว็บครั้งนี้แล้วไหม
const instant = played.value // เคยเล่นแล้ว (กลับมาหน้านี้ทีหลัง) -> โชว์หน้าครบเลย ไม่เล่นซ้ำ
const phase = ref<Phase>(instant ? 'reveal' : 'prep')
const fast = ref(false) // ข้ามอนิเมชัน -> ของทั้งหมดขึ้นมาไวๆ
const logoIntro = ref(!instant) // โลโก้เล่นท่าเปิดแอปไหม
const logoEl = ref<HTMLElement | null>(null)
const logoShift = ref('translate(0px, 0px) scale(1)')
const introDone = ref(false)
const hasProfile = ref(false)
const timers: ReturnType<typeof setTimeout>[] = []

function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}

// คนที่ล็อกอินและมีโปรไฟล์แล้วจะข้ามหน้านี้ไป /home แต่รออนิเมชันเล่นจบก่อน
function goHomeIfReady() {
  if (introDone.value && hasProfile.value) navigateTo('/home')
}

function finishIntro() {
  played.value = true
  introDone.value = true
  goHomeIfReady()
}

function startIntro() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !logoEl.value) {
    fast.value = true
    logoIntro.value = false
    phase.value = 'reveal'
    later(finishIntro, 300)
    return
  }
  // วัดตำแหน่งจริงของโลโก้ในหน้า แล้วคำนวณว่าต้องเลื่อนไปกี่ px ถึงจะอยู่กลางจอ
  const rect = logoEl.value.getBoundingClientRect()
  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2)
  const dy = window.innerHeight / 2 - (rect.top + rect.height / 2)
  logoShift.value = `translate(${dx}px, ${dy}px) scale(1.15)`
  phase.value = 'center'

  later(() => {
    phase.value = 'move'
    logoShift.value = 'translate(0px, 0px) scale(1)' // เลื่อนกลับที่ (มี transition ใน CSS)
  }, CENTER_MS)
  later(() => { phase.value = 'reveal' }, CENTER_MS + REVEAL_AFTER_MS)
  later(finishIntro, CENTER_MS + MOVE_MS + 500)
}

// แตะที่จอระหว่างเล่น -> ข้ามไปหน้าสุดท้ายทันที
function skipIntro() {
  if (phase.value !== 'center' && phase.value !== 'move') return
  timers.forEach(clearTimeout)
  timers.length = 0
  fast.value = true
  logoIntro.value = false
  logoShift.value = 'translate(0px, 0px) scale(1)'
  phase.value = 'reveal'
  later(finishIntro, 450)
}

onMounted(async () => {
  if (instant) {
    introDone.value = true
  } else {
    // รอเฟรมถัดไปให้เบราว์เซอร์จัดหน้าเสร็จก่อนค่อยวัดตำแหน่งโลโก้
    await nextTick()
    startIntro()
  }

  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) return

  const authed = await getAuthedSupabaseClient()
  const { data: profile } = await authed
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', sessionData.session.user.id)
    .maybeSingle()

  if (profile) {
    hasProfile.value = true
    goHomeIfReady()
  }
})

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
})

// กด "เริ่มเลย": เครื่องนี้เคยยินยอมแล้ว (ฉบับล่าสุด) ไปต่อเลย / ยังไม่เคย -> เด้งป๊อปอัพขอความยินยอมก่อน
const showConsent = ref(false)

function next() {
  if (readConsent()) navigateTo('/onboarding/step-3')
  else showConsent.value = true
}

function acceptConsent() {
  saveConsent()
  showConsent.value = false
  navigateTo('/onboarding/step-3')
}

function goToLogin() {
  navigateTo('/onboarding/signup')
}
</script>

<style scoped>
/* เลย์เอาต์หน้านี้เขียนเป็น CSS ตรงๆ (ขนาดตามฟิกม่า เฟรม index 428 x 926) */
.index-page {
  position: relative;
  display: flex;
  flex-direction: column;
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

.index-main {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(24px, 20.4dvh, 189px) 24px 16px;
}

/* ช่องวางโลโก้ (ขนาดเท่าโลโก้ จองที่ไว้ให้ แล้วเลื่อนโลโก้ด้วย transform ไปกลางจอ/กลับที่) */
.logo-slot {
  position: relative;
  z-index: 3;
  width: 212px;
  height: 212px;
  transform-origin: 50% 50%;
}

.phase-prep .logo-slot {
  opacity: 0;
}

.phase-move .logo-slot,
.phase-reveal .logo-slot {
  transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1);
}

.is-fast .logo-slot,
.is-instant .logo-slot {
  transition: none;
}

.name-wrap {
  position: relative;
  margin-top: 18px; /* ชื่อแอปอยู่ใกล้โลโก้ขึ้น (เดิม 34px ตามฟิกม่า เธอบอกว่าห่างไป) */
}

/* แสงโคเรลจางๆ ฟุ้งหลังชื่อแอป (วงรีเบลอในฟิกม่า) */
.name-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--color-coral) 20%, transparent), color-mix(in srgb, var(--color-coral) 0%, transparent));
  transform: translate(-50%, -30%);
  pointer-events: none;
}

.welcome {
  position: relative;
  margin-top: 0;
  font-size: 32px;
  font-weight: 600;
  line-height: 48px;
  letter-spacing: -0.019em;
  color: var(--color-ink);
  text-align: center;
}

.intro {
  position: relative;
  margin-top: 10px;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--color-ink);
  text-align: center;
  white-space: nowrap;
}

/* ปุ่มชิดล่าง: เดิมตามฟิกม่า (147px จาก 926) ตอนนี้ขยับลงมาอีก เหลือ ~88px
   (ต้องเหลือที่ให้ลิงก์ล็อกอินใต้ปุ่มประมาณ 40px) ช่องว่างที่เหลือไปอยู่ด้านบน */
.index-bottom {
  position: relative;
  z-index: 1;
  padding: 0 36px clamp(72px, 9.5dvh, 100px);
}

.disclaimer {
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-muted);
  text-align: center;
}

/* ห่อปุ่มไว้ เพื่อให้ลิงก์ล็อกอินลอยอยู่ใต้ปุ่มในช่องว่างด้านล่าง โดยไม่ดันปุ่มให้ขยับขึ้น (ปุ่มจะอยู่ตำแหน่งเดียวกับฟิกม่าเป๊ะ) */
.start-wrap {
  position: relative;
}

.login-link {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  display: block;
  margin-top: 10px;
  padding: 6px 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-muted);
  text-align: center;
  opacity: 0.75;
}

/* ===== ของอื่นๆ ในหน้า: ซ่อนไว้ระหว่างโลโก้เล่นอยู่กลางจอ แล้วค่อยๆ ขึ้นมา ===== */
.phase-prep .reveal-item,
.phase-center .reveal-item,
.phase-move .reveal-item,
.phase-prep .reveal-fade,
.phase-center .reveal-fade,
.phase-move .reveal-fade {
  visibility: hidden; /* ซ่อนแล้วแตะไม่โดนด้วย */
  opacity: 0;
}

.phase-reveal:not(.is-instant) .reveal-item {
  animation: item-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--d, 0s);
}

/* ชื่อแอปเลื่อนเข้ามาจากด้านซ้าย (อยากให้มาจากขวา เปลี่ยน -48px เป็น 48px) */
.phase-reveal:not(.is-instant) .reveal-side {
  animation-name: side-in;
  animation-duration: 0.8s;
}

.phase-reveal:not(.is-instant) .reveal-fade {
  animation: fade-in 1s ease both;
}

.is-fast.phase-reveal .reveal-item,
.is-fast.phase-reveal .reveal-fade {
  animation-duration: 0.35s;
  animation-delay: 0s;
}

@keyframes item-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes side-in {
  from {
    opacity: 0;
    transform: translateX(-48px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .static-spark {
    animation: none;
  }
  .phase-reveal .reveal-item,
  .phase-reveal .reveal-fade {
    animation: none;
  }
}
</style>

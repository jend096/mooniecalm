<script setup lang="ts">
import { savePendingOnboarding, hasOnboardingAnswers } from '~/utils/save-onboarding-profile'
const config = useRuntimeConfig()
const isSupabaseConfigured = Boolean(config.public.supabase?.url && config.public.supabase?.key)

const email = ref('')
const loading = ref(false)
const showConsent = ref(false) // true = กำลังโชว์ป๊อปอัพขอความยินยอม
const sendingLink = ref(false) // true = กำลังส่งอีเมล (ไว้เลือกข้อความบนหน้ารอโหลด)
const pendingAction = ref<'email' | 'google'>('email') // ปุ่มที่กดค้างไว้ตอนยังไม่ได้ยินยอม พอกดยินยอมแล้วจะทำต่อให้
const statusMessage = ref('')
const linkSent = ref(false) // true = ส่งลิงก์ไปที่อีเมลสำเร็จแล้ว (โชว์ข้อความ "ไปดูในเมล" ใต้ช่องอีเมล)

let hasCompletedLogin = false
let unsubscribe: (() => void) | undefined
const route = useRoute()

// ตรวจสอบสถานะโปรไฟล์ของผู้ใช้
async function completeLogin(userId: string) {
  if (hasCompletedLogin) return
  hasCompletedLogin = true
  unsubscribe?.()

  const supabase = useSupabaseClient()

  try {
    // ดึงข้อมูลจาก user_profiles โดยหาจาก auth_user_id ที่ตรงกับรหัส Auth ของผู้ใช้
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, nickname')
      .eq('auth_user_id', userId)
      .maybeSingle()
    // ระบุหน้าตาแถวเอง เพราะโปรเจกต์ยังไม่มีไฟล์ชนิดตารางของ Supabase (ไม่ระบุจะขึ้นแดงตอนอ่าน profile.nickname)
    const profile = data as { id: number, nickname: string | null } | null

    if (error) {
      console.error('Supabase query error:', error)
    }

    // ถ้าพบโปรไฟล์ และมีชื่อเล่นบันทึกอยู่แล้ว (เป็นผู้ใช้เดิม) -> พาไปหน้าหลักทันที
    if (profile && profile.nickname) {
      await navigateTo('/home', { replace: true })
      return
    }

    // ผู้ใช้ใหม่ที่ "ยังไม่เคยตอบคำถามสร้างอวตาร" (เช่น กด "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ" ด้วยอีเมลที่ไม่เคยสมัคร)
    // -> ห้ามสร้างโปรไฟล์เปล่า พาไปเริ่มตอบคำถามตั้งแต่ต้นก่อน (ตอบครบแล้วจะวนกลับมาหน้านี้ เจอ session เดิม แล้วบันทึกต่อเอง)
    const { data: sessionData } = await supabase.auth.getSession()
    let answered = hasOnboardingAnswers(sessionData.session?.user.user_metadata)
    if (!answered && profile) {
      // โปรไฟล์เดิมที่ยังไม่มีชื่อ แต่เคยบันทึกอวตารลงฐานข้อมูลไว้แล้ว ถือว่าเคยตอบแล้ว (ไม่ต้องให้ตอบซ้ำ)
      const { count, error: countError } = await supabase
        .from('user_avatar_state')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      answered = countError ? true : (count ?? 0) > 0 // เช็คไม่ได้ -> ทำเหมือนเดิม ไม่เด้งมั่ว
    }
    if (!answered) {
      await navigateTo('/onboarding/step-3', { replace: true })
      return
    }

    // ถ้ายังไม่มีข้อมูล หรือยังไม่เคยตั้งชื่อเล่น (ผู้ใช้ใหม่) -> บันทึกเริ่มต้นแล้วพาไป onboarding
    await saveOnboardingProfile(userId)
    await navigateTo('/onboarding/step-1', { replace: true })

  } catch (err) {
    console.error('Error checking profile:', err)
    await navigateTo('/onboarding/step-1', { replace: true })
  }
}

// ยังไม่เคยยินยอม -> โชว์ป๊อปอัพ พอกดยินยอมค่อยทำต่อ (ส่งลิงก์อีเมล หรือไปหน้า Google ตามปุ่มที่กดไว้)
function acceptConsentAndSend() {
  saveConsent()
  showConsent.value = false
  if (pendingAction.value === 'google') continueWithGoogle()
  else continueWithEmail()
}

async function continueWithEmail() {
  if (!email.value || loading.value) return
  if (!readConsent()) {
    pendingAction.value = 'email'
    showConsent.value = true
    return
  }

  if (!isSupabaseConfigured) {
    statusMessage.value = 'ยังไม่ได้ตั้งค่า Supabase'
    return
  }

  loading.value = true
  sendingLink.value = true
  statusMessage.value = ''
  linkSent.value = false

  const supabase = useSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: `${window.location.origin}/onboarding/signup`,
      // แนบคำตอบ onboarding ไปกับ user_metadata เผื่อผู้ใช้เปิดลิงก์ในเบราว์เซอร์/แอปอื่น
      // (Supabase ใช้ค่านี้เฉพาะตอนสร้าง user ใหม่ ผู้ใช้เดิมจะไม่ถูกเขียนทับ)
      data: { ...buildOnboardingMetadata() }
    }
  })

  loading.value = false
  sendingLink.value = false
  if (error) {
    statusMessage.value = error.message
  } else {
    // ส่งสำเร็จ: โชว์ข้อความให้ไปดูในเมลที่ใต้ช่องอีเมล (ดู linkSent ใน template)
    linkSent.value = true
  }
}

// เข้าสู่ระบบด้วยบัญชี Google: เด้งไปหน้า Google แล้วกลับมาที่หน้านี้พร้อม token ใน URL
// (ส่วนรับ token ที่กลับมาอยู่ใน onMounted ด้านล่าง ตัวเดียวกับลิงก์อีเมล จึงไม่ต้องเขียนเพิ่ม)
async function continueWithGoogle() {
  if (loading.value) return
  // ต้องยินยอมเก็บข้อมูลสุขภาพก่อนเหมือนทางอีเมล ไม่งั้นกด Google แล้วข้ามขั้นยินยอมได้
  if (!readConsent()) {
    pendingAction.value = 'google'
    showConsent.value = true
    return
  }

  if (!isSupabaseConfigured) {
    statusMessage.value = 'ยังไม่ได้ตั้งค่า Supabase'
    return
  }

  loading.value = true
  sendingLink.value = false
  statusMessage.value = ''

  // Google ต้องเด้งออกไปแล้วโหลดหน้าเว็บใหม่ตอนกลับมา คำตอบ onboarding ในความจำจะหาย
  // จดลง localStorage ไว้ก่อน ตอนกลับมาจะหยิบไปสร้างโปรไฟล์ (ดู savePendingOnboarding)
  savePendingOnboarding()

  const supabase = useSupabaseClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/onboarding/signup` }
  })
  // ถ้าสำเร็จเบราว์เซอร์จะเด้งออกไปหน้า Google เอง จึงปิดหน้ารอโหลดเฉพาะตอนมี error
  if (error) {
    loading.value = false
    statusMessage.value = error.message
  }
}

onMounted(async () => {
  if (!isSupabaseConfigured) return

  const supabase = useSupabaseClient()

  // 1. ดักจับ Error ทั้งจาก Query (?) และ Hash (#)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const hashError = hashParams.get('error_description') || hashParams.get('error')
  const queryError = route.query.error_description || route.query.error

  if (hashError || queryError) {
    const rawError = String(hashError || queryError)
    statusMessage.value = rawError.includes('otp_expired')
      ? 'ลิงก์เข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง กรุณากรอกอีเมลเพื่อขอรับลิงก์ใหม่อีกครั้ง'
      : rawError
    console.error('Auth Error:', rawError)
    return
  }

  // 2. ตรวจสอบ Token จาก Hash (#access_token=...&refresh_token=...) แล้วสร้าง Session ทันที
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (accessToken && refreshToken) {
    loading.value = true
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    loading.value = false

    if (!error && data.session?.user) {
      // ล้าง hash ออกจาก URL เพื่อความปลอดภัยและความสะอาดของ address bar
      window.history.replaceState(null, '', window.location.pathname)
      await completeLogin(data.session.user.id)
      return
    }
  }

  // 3. ตรวจสอบ session ปัจจุบันที่มีอยู่ในเครื่อง
  // (เช็คกับเซิร์ฟเวอร์ด้วยว่าผู้ใช้ยังมีอยู่ ไม่งั้นถ้าลบผู้ใช้ใน Supabase ไปแล้ว session เก่าที่ค้างจะพาข้ามหน้าอีเมล)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user && await isSessionStillValid()) {
    await completeLogin(session.user.id)
    return
  }

  // 4. ดักรับ Event เมื่อมี session เข้ามา
  const { data: listener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentSession?.user) {
      const userId = currentSession.user.id
      // เลื่อนไปทำนอก callback (setTimeout) เพราะ Supabase ไม่แนะนำให้เรียกคำสั่ง auth อื่นซ้อนใน callback นี้ (อาจค้าง)
      setTimeout(async () => {
        if (await isSessionStillValid()) await completeLogin(userId)
      }, 0)
    }
  })
  unsubscribe = () => listener.subscription.unsubscribe()
})

onUnmounted(() => {
  unsubscribe?.()
})

// ประกายตกแต่งพื้นหลัง 4 ดวง (ตำแหน่งเป็น % ของหน้าจอ) เหมือนหน้า index
const staticSparkles = [
  { left: '11.9%', top: '22%', size: 16, color: 'var(--color-period-predicted)' },
  { left: '4.9%', top: '34%', size: 24, color: 'var(--color-lavender)' },
  { left: '81.5%', top: '43.1%', size: 26, color: 'var(--color-lavender)' },
  { left: '92%', top: '76%', size: 14, color: 'var(--color-coral)' }
]

// ฟรุ้งฟริ้งรอบโลโก้ชื่อแอป (left/top = ตำแหน่งกึ่งกลางประกาย เป็น % ของกรอบชื่อ, size = px) เด้งออกมาทีละดวง
const nameSparkles = [
  { left: '-4%', top: '14%', size: 20, color: 'var(--color-lavender)' },
  { left: '-2%', top: '82%', size: 12, color: 'var(--color-coral)' },
  { left: '39%', top: '13%', size: 12, color: 'var(--color-period-predicted)' },
  { left: '55%', top: '17%', size: 15, color: 'var(--color-lavender)' },
  { left: '104%', top: '17%', size: 18, color: 'var(--color-yellow)' },
  { left: '103%', top: '82%', size: 12, color: 'var(--color-coral)' }
]
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-moon-bg to-moon-bg-end px-6">
    <!-- ตกแต่งเหมือนหน้า index: หูกระต่ายสีพาสเทลบน/ล่าง + ประกายลอยจางๆ (อยู่หลังเนื้อหา ไม่บังปุ่ม) -->
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

    <!-- กดส่งอีเมลแล้ว (หรือกำลังเช็คลิงก์ที่กลับมา) ขึ้นหน้ารอโหลดคลุมจอ -->
    <!-- เครื่องนี้ยังไม่เคยกดยินยอมเก็บข้อมูลสุขภาพ (เช่นกดมาที่หน้านี้ตรงๆ) -> ถามก่อนส่งลิงก์ -->
    <ConsentDialog v-if="showConsent" @accept="acceptConsentAndSend" @decline="showConsent = false" />

    <LoadingOverlay v-if="loading" :text="sendingLink ? 'กำลังส่งลิงก์ไปที่อีเมล...' : 'กำลังเข้าสู่ระบบ...'" />

    <div class="relative z-10 flex flex-col items-center pt-[162px] text-center">
      <h1 class="text-3xl font-semibold text-moon-ink">เข้าสู่ระบบ</h1>
      <!-- ชื่อแอปใช้รูปโลโก้ (BrandWordmark) แทนตัวหนังสือ + แสงโคเรลฟุ้งหลังชื่อ + ประกายเด้งรอบชื่อ เหมือนหน้า index
           ปรับขนาดชื่อที่ :size (หน้า index ใช้ 44) / ประกายแก้ที่ nameSparkles ใน <script> -->
      <div class="name-wrap">
        <span class="name-glow" aria-hidden="true" />
        <BrandWordmark lines="one" :size="44" />
        <svg
          v-for="(s, i) in nameSparkles"
          :key="`name-${i}`"
          class="name-spark"
          viewBox="0 0 20 20"
          :fill="s.color"
          aria-hidden="true"
          :style="{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, marginLeft: `${-s.size / 2}px`, marginTop: `${-s.size / 2}px`, '--i': i }"
        >
          <path d="M10 0C10.778 5.889 14.111 9.222 20 10C14.111 10.778 10.778 14.111 10 20C9.222 14.111 5.889 10.778 0 10C5.889 9.222 9.222 5.889 10 0Z" />
        </svg>
      </div>
      <p class="mt-3 text-sm font-normal text-moon-muted">
        เข้าสู่ระบบเพื่อบันทึกข้อมูลสุขภาพ ติดตามรอบเดือน และดูแลพฤติกรรมของคุณได้อย่างต่อเนื่อง
      </p>
    </div>

    <div class="relative z-10 mt-[43px] flex flex-col gap-[22px] px-3 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div>
        <input
          v-model="email"
          @input="linkSent = false"
          type="email"
          placeholder="อีเมล"
          class="h-[52px] w-full rounded-2xl border border-moon-pink-soft bg-moon-card px-4 text-lg font-normal text-moon-ink outline-none placeholder:text-moon-muted focus:border-moon-pink"
        >
        <!-- ส่งลิงก์สำเร็จ (หลังหน้ารอโหลดหาย): โชว์ข้อความให้ไปดูในเมลต่อ แก้ข้อความตรงนี้ได้เลย -->
        <p v-if="linkSent" class="mt-2 px-1 text-sm font-medium text-moon-ink">
          ส่งลิงก์เข้าสู่ระบบไปที่อีเมลเรียบร้อยแล้วค่ะ 
        </p>
      </div>
      <BaseButton
        label="เข้าสู่ระบบ"
        :disabled="!email || loading"
        @click="continueWithEmail"
      />
      <!-- ตัวคั่น "หรือ" ระหว่างทางอีเมลกับทาง Google -->
      <div class="flex items-center gap-3">
        <div class="h-px flex-1 bg-moon-pink-soft" />
        <span class="text-xs font-normal text-moon-muted">หรือ</span>
        <div class="h-px flex-1 bg-moon-pink-soft" />
      </div>

      <!-- ปุ่มเข้าสู่ระบบด้วย Google: หน้าตาเป็นปุ่มขอบ (outline) ให้ต่างจากปุ่มหลักสีดำ -->
      <button
        type="button"
        :disabled="loading"
        class="flex h-[59px] w-full items-center justify-center gap-3 rounded-3xl border border-moon-pink-soft bg-moon-card px-4 text-lg font-semibold text-moon-ink transition [-webkit-tap-highlight-color:transparent] enabled:active:bg-moon-pink-soft disabled:cursor-not-allowed disabled:opacity-60"
        @click="continueWithGoogle"
      >
        <svg class="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.3 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.5 5.5C41.3 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
        </svg>
        ดำเนินการต่อด้วย Google
      </button>

      <!-- กลับหน้าแรก: เผื่อผู้ใช้เข้ามาหน้านี้ผิด หรือไม่แน่ใจว่าเคยสมัครแล้ว กดกลับไปเริ่มใหม่ที่หน้าแรกได้ (ที่ "/" คือหน้าแรกของแอป) -->
      <NuxtLink to="/" class="-mt-2 text-center text-sm font-normal text-moon-muted underline underline-offset-4">
        กลับหน้าแรก
      </NuxtLink>

      <p v-if="statusMessage" class="text-center text-xs font-normal text-moon-muted">
        {{ statusMessage }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* พื้นหลังตกแต่ง (คัดมาจากหน้า index: ขนาดตามฟิกม่า เฟรมกว้าง 428) */
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

/* กรอบโลโก้ชื่อแอป (ให้ประกายและแสงฟุ้งอ้างอิงตำแหน่งจากกรอบนี้) */
.name-wrap {
  position: relative;
  margin-top: 12px;
}

/* ประกายรอบชื่อ: เด้งออกมาทีละดวงตอนเปิดหน้า แล้วกะพริบวนไป (ดวงที่ --i ยิ่งมาก ยิ่งเด้งช้า) */
.name-spark {
  position: absolute;
  z-index: 1;
  display: block;
  pointer-events: none;
  animation:
    name-spark-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    name-spark-twinkle 3s ease-in-out infinite;
  animation-delay: calc(0.3s + var(--i) * 0.12s), calc(0.9s + var(--i) * 0.4s);
}

@keyframes name-spark-pop {
  from {
    opacity: 0;
    transform: scale(0) rotate(-120deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes name-spark-twinkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.75) rotate(18deg);
  }
}

/* แสงโคเรลจางๆ ฟุ้งหลังชื่อแอป */
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

/* คนที่ตั้งค่าลดการเคลื่อนไหว: ประกายนิ่ง ไม่กระพริบ */
@media (prefers-reduced-motion: reduce) {
  .static-spark,
  .name-spark {
    animation: none;
  }
}
</style>

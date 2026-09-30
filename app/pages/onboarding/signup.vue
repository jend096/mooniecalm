<script setup lang="ts">
const config = useRuntimeConfig()
const isSupabaseConfigured = Boolean(config.public.supabase?.url && config.public.supabase?.key)

const email = ref('')
const isLoginMode = ref(false)
const loading = ref(false)
const statusMessage = ref('')

let hasCompletedLogin = false
let unsubscribe: (() => void) | undefined
const route = useRoute()

// ฟังก์ชันจำลองหรือฟังก์ชันบันทึกโปรไฟล์กรณีไม่มีประกาศไว้ภายนอก
declare const saveOnboardingProfile: ((userId: string) => Promise<void>) | undefined

// ตรวจสอบสถานะโปรไฟล์ของผู้ใช้
async function completeLogin(userId: string) {
  if (hasCompletedLogin) return
  hasCompletedLogin = true
  unsubscribe?.()

  const supabase = useSupabaseClient()

  try {
    // ดึงข้อมูลจาก user_profiles โดยหาจาก auth_user_id ที่ตรงกับรหัส Auth ของผู้ใช้
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, nickname')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Supabase query error:', error)
    }

    // ถ้าพบโปรไฟล์ และมีชื่อเล่นบันทึกอยู่แล้ว (เป็นผู้ใช้เดิม) -> พาไปหน้าหลักทันที
    if (profile && profile.nickname) {
      await navigateTo('/home', { replace: true })
      return
    }

    // ถ้ายังไม่มีข้อมูล หรือยังไม่เคยตั้งชื่อเล่น (ผู้ใช้ใหม่) -> บันทึกเริ่มต้นแล้วพาไป onboarding
    if (typeof saveOnboardingProfile === 'function') {
      await saveOnboardingProfile(userId)
    }
    await navigateTo('/onboarding/step-1', { replace: true })

  } catch (err) {
    console.error('Error checking profile:', err)
    await navigateTo('/onboarding/step-1', { replace: true })
  }
}

async function continueWithEmail() {
  if (!email.value || loading.value) return

  if (!isSupabaseConfigured) {
    statusMessage.value = 'ยังไม่ได้ตั้งค่า Supabase'
    return
  }

  loading.value = true
  statusMessage.value = ''

  const supabase = useSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: `${window.location.origin}/onboarding/signup`
    }
  })

  loading.value = false
  if (error) {
    statusMessage.value = error.message
  } else {
    statusMessage.value = 'ส่งลิงก์เข้าสู่ระบบไปที่อีเมลของคุณแล้ว กรุณากดลิงก์ในอีเมล'
  }
}

async function continueWithOAuth(provider: 'google' | 'apple') {
  if (!isSupabaseConfigured) return

  loading.value = true
  const supabase = useSupabaseClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/onboarding/signup` }
  })
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
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await completeLogin(session.user.id)
    return
  }

  // 4. ดักรับ Event เมื่อมี session เข้ามา
  const { data: listener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentSession?.user) {
      await completeLogin(currentSession.user.id)
    }
  })
  unsubscribe = () => listener.subscription.unsubscribe()
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white px-6">
    <div class="flex flex-col items-center pt-16 text-center">
      <h1 class="font-['Anuphan'] text-[30px] font-semibold leading-tight text-slate-900">
        {{ isLoginMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชี' }}<br>MoonieCalm
      </h1>
      <p class="mt-3 font-['Anuphan'] text-[14px] font-normal text-slate-500">
        {{ isLoginMode ? 'ยินดีต้อนรับกลับมา เข้าสู่ระบบเพื่อไปต่อ' : 'เข้าสู่ระบบเพื่อดูตัวละครของคุณ' }}
      </p>
    </div>

    <div class="mt-10 flex flex-col gap-4">
      <input
        v-model="email"
        type="email"
        placeholder="อีเมล"
        class="w-full rounded-full bg-white px-5 py-3 font-['Anuphan'] text-sm font-normal text-slate-900 shadow-sm outline-none placeholder:text-slate-400"
      >
      <BaseButton
        :label="isLoginMode ? 'เข้าสู่ระบบ' : 'ต่อไป'"
        :disabled="!email || loading"
        @click="continueWithEmail"
      />
      <p v-if="statusMessage" class="text-center font-['Anuphan'] text-xs font-normal text-slate-500">
        {{ statusMessage }}
      </p>
    </div>

    <button
      type="button"
      class="mt-4 text-center font-['Anuphan'] text-xs font-normal text-slate-400"
      @click="isLoginMode = !isLoginMode"
    >
      {{ isLoginMode ? 'ยังไม่มีบัญชี MoonieCalm ใช่ไหม ? สร้างบัญชี' : 'มีบัญชีของ MoonieCalm แล้วใช่ไหม ? เข้าสู่ระบบ' }}
    </button>

    <div class="mt-8 flex items-center gap-3">
      <div class="h-px flex-1 bg-slate-200" />
      <span class="font-['Anuphan'] text-xs font-normal text-slate-400">หรือ</span>
      <div class="h-px flex-1 bg-slate-200" />
    </div>

    <div class="mt-6 flex flex-col gap-3 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-['Anuphan'] text-sm font-medium text-slate-700"
        @click="continueWithOAuth('google')"
      >
        <svg class="h-5 w-5" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.3 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.5 5.5C41.3 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
        </svg>
        ดำเนินการต่อด้วย Google
      </button>
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-['Anuphan'] text-sm font-medium text-slate-700"
        @click="continueWithOAuth('apple')"
      >
        <svg class="h-5 w-5" viewBox="0 0 384 512" fill="currentColor">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        ดำเนินการต่อด้วย Apple
      </button>
    </div>
  </div>
</template>
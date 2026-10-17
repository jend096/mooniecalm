<script setup lang="ts">
const onboarding = useOnboardingStore()

const saving = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  // ไม่มี session หรือผู้ใช้ถูกลบไปแล้ว (session ค้างในเครื่อง) -> กลับไปหน้ากรอกอีเมล
  if (!data.session || !(await isSessionStillValid())) {
    navigateTo('/onboarding/signup')
  }
})

async function next() {
  if (!onboarding.name || saving.value) return
  errorMessage.value = ''

  const supabaseClient = useSupabaseClient()
  const { data: sessionData } = await supabaseClient.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    navigateTo('/onboarding/signup')
    return
  }

  saving.value = true

  try {
    const supabase = await getAuthedSupabaseClient()

    // บันทึกเฉพาะชื่อเล่น (รูปโปรไฟล์ไปบันทึกที่หน้า /onboarding/photo ถัดไป)
    const { error: upsertError } = await supabase.from('user_profiles').upsert({
      auth_user_id: userId,
      nickname: onboarding.name
    }, { onConflict: 'auth_user_id' })

    if (upsertError) throw upsertError

    navigateTo('/onboarding/photo')
  } catch (err) {
    console.error('[step-1] upsert failed:', err)
    errorMessage.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
      <p class="text-3xl font-semibold text-moon-ink">
        สวัสดี
      </p>
      <h1 class="text-2xl font-semibold text-moon-ink">
        ฉันต้องเรียกคุณว่าอะไรดี?
      </h1>
      <p class="text-sm font-normal text-moon-muted">
        ฉันจะใช้ชื่อนี้ไว้เรียกคุณ !
      </p>
      <input
        v-model="onboarding.name"
        type="text"
        placeholder="ชื่อเล่น"
        class="mt-2 w-full border-b-2 border-moon-ink/20 bg-transparent focus:border-moon-ink/50 text-center text-3xl font-semibold leading-[38px] text-moon-ink outline-none placeholder:text-moon-ink/25"
      >

      <p v-if="errorMessage" class="text-xs font-normal text-red-500">
        {{ errorMessage }}
      </p>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton :label="saving ? 'กำลังบันทึก...' : 'ถัดไป'" :disabled="!onboarding.name || saving" @click="next" />
    </div>
  </div>
</template>

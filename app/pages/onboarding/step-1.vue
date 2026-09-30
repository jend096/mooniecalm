<script setup lang="ts">
const onboarding = useOnboardingStore()

const photoFile = ref<File | null>(null)
const photoPreviewUrl = ref('')
const uploading = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    navigateTo('/onboarding/signup')
  }
})

function onPhotoSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  photoFile.value = file
  photoPreviewUrl.value = URL.createObjectURL(file)
}

async function next() {
  console.log('[step-1] next() called', { name: onboarding.name, hasPhoto: !!photoFile.value, uploading: uploading.value })

  if (!onboarding.name || uploading.value) {
    console.log('[step-1] next() aborted early - no name or already uploading')
    return
  }
  errorMessage.value = ''

  const supabaseClient = useSupabaseClient()
  const { data: sessionData } = await supabaseClient.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    console.log('[step-1] next() aborted - no authenticated user, redirecting to signup')
    navigateTo('/onboarding/signup')
    return
  }

  uploading.value = true

  try {
    const supabase = await getAuthedSupabaseClient()

    if (photoFile.value) {
      console.log('[step-1] uploading photo...', photoFile.value.name)
      const ext = photoFile.value.name.split('.').pop()
      const path = `${userId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, photoFile.value, { upsert: true })

      if (uploadError) {
        console.log('[step-1] photo upload failed', uploadError)
        throw uploadError
      }
      console.log('[step-1] photo upload succeeded, path:', path)

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      onboarding.profileImageUrl = publicUrlData.publicUrl
      console.log('[step-1] public URL resolved:', onboarding.profileImageUrl)
    } else {
      console.log('[step-1] no photo selected, skipping upload')
    }

    console.log('[step-1] upserting user_profiles...', { nickname: onboarding.name, profile_image_url: onboarding.profileImageUrl })
    const { error: upsertError } = await supabase.from('user_profiles').upsert({
      auth_user_id: userId,
      nickname: onboarding.name,
      profile_image_url: onboarding.profileImageUrl || null
    }, { onConflict: 'auth_user_id' })

    if (upsertError) {
      console.log('[step-1] user_profiles upsert failed', upsertError)
      throw upsertError
    }
    console.log('[step-1] user_profiles upsert succeeded')

    console.log('[step-1] navigating to /onboarding/loading')
    navigateTo('/onboarding/loading')
  } catch (err) {
    console.error('[step-1] upload/upsert failed:', err)
    errorMessage.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white">
    <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 pt-16 text-center">
      <label
        class="mt-6 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50"
      >
        <img v-if="photoPreviewUrl" :src="photoPreviewUrl" alt="" class="h-full w-full object-cover">
        <span v-else class="font-['Anuphan'] text-xs font-normal text-slate-400">อัปโหลดรูป</span>
        <input type="file" accept="image/*" class="hidden" @change="onPhotoSelected">
      </label>
      
      <p class="font-['Anuphan'] text-[35px] font-semibold leading-tight text-slate-900">
        สวัสดี
      </p>
      <h1 class="font-['Anuphan'] text-[27px] font-semibold leading-tight text-slate-900">
        ฉันต้องเรียกคุณว่าอะไรดี?
      </h1>
      <p class="font-['Anuphan'] text-[20px] font-normal text-slate-500">
        ฉันจะใช้ชื่อนี้ไว้เรียกคุณ !
      </p>
      <input
        v-model="onboarding.name"
        type="text"
        placeholder="ชื่อเล่น"
        class="mt-4 w-full border-b-2 border-slate-300 bg-transparent text-center font-['Anuphan'] text-[48px] font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-900"
      >

      <p v-if="errorMessage" class="font-['Anuphan'] text-xs font-normal text-red-500">
        {{ errorMessage }}
      </p>
    </div>

    <div class="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton :label="uploading ? 'กำลังบันทึก...' : 'ถัดไป'" :disabled="!onboarding.name || uploading" @click="next" />
    </div>
  </div>
</template>

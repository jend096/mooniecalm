<script setup lang="ts">
// หน้าเปลี่ยนรูปโปรไฟล์ (เข้าจากการกดรูปที่หน้าหลัก)
const picker = ref<{ getCroppedBlob: (size?: number) => Promise<Blob> } | null>(null)
const hasPhoto = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const currentUrl = ref('')

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    navigateTo('/onboarding/signup')
    return
  }

  // ดึงรูปปัจจุบันมาโชว์ในวงกลม
  const authed = await getAuthedSupabaseClient()
  const { data: profile } = await authed
    .from('user_profiles')
    .select('profile_image_url')
    .eq('auth_user_id', data.session.user.id)
    .maybeSingle()
  currentUrl.value = profile?.profile_image_url ?? ''
})

async function save() {
  if (!picker.value || !hasPhoto.value || saving.value) return
  errorMessage.value = ''
  saving.value = true

  try {
    const blob = await picker.value.getCroppedBlob()
    await uploadProfilePhoto(blob)
    navigateTo('/home')
  } catch (err) {
    console.error('[profile-photo] upload failed:', err)
    errorMessage.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  } finally {
    saving.value = false
  }
}

function cancel() {
  navigateTo('/home')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <button
      type="button"
      class="absolute left-6 top-14 z-20 text-base font-medium text-moon-muted"
      @click="cancel"
    >
      ยกเลิก
    </button>

    <!-- อยู่กึ่งกลางพื้นที่เหนือปุ่ม เว้นด้านบน 96px ไม่ให้ชนแถวปุ่ม "ข้าม" -->
    <div class="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-24 pt-24 text-center">
      <h1 class="text-2xl font-semibold text-moon-ink">
        รูปโปรไฟล์ของคุณ
      </h1>

      <PhotoPicker ref="picker" :current-url="currentUrl" @change="hasPhoto = $event" />

      <p v-if="errorMessage" class="text-xs font-normal text-red-500">
        {{ errorMessage }}
      </p>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton :label="saving ? 'กำลังบันทึก...' : 'บันทึก'" :disabled="!hasPhoto || saving" @click="save" />
    </div>
  </div>
</template>

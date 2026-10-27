<script setup lang="ts">
const onboarding = useOnboardingStore()

const picker = ref<{ getCroppedBlob: (size?: number) => Promise<Blob> } | null>(null)
const hasPhoto = ref(false)
const saving = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  // ไม่มี session หรือผู้ใช้ถูกลบไปแล้ว -> กลับไปหน้ากรอกอีเมล
  if (!data.session || !(await isSessionStillValid())) {
    navigateTo('/onboarding/signup')
  }
})

async function next() {
  if (!picker.value || !hasPhoto.value || saving.value) return
  errorMessage.value = ''
  saving.value = true

  try {
    const blob = await picker.value.getCroppedBlob()
    onboarding.profileImageUrl = await uploadProfilePhoto(blob)
    navigateTo('/onboarding/loading')
  } catch (err) {
    console.error('[photo] upload failed:', err)
    errorMessage.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  } finally {
    saving.value = false
  }
}

// ข้าม = ไม่ใส่รูป (ในแอปจะโชว์ไอคอนคนแทน และกลับมาใส่ทีหลังได้จากหน้าหลัก)
function skip() {
  navigateTo('/onboarding/loading')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <button
      type="button"
      class="absolute right-6 top-14 z-20 text-base font-medium text-moon-muted"
      @click="skip"
    >
      ข้าม
    </button>

    <!-- อยู่กึ่งกลางพื้นที่เหนือปุ่ม เว้นด้านบน 96px ไม่ให้ชนแถวปุ่ม "ข้าม" -->
    <div class="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-24 pt-24 text-center">
      <h1 class="text-2xl font-semibold text-moon-ink">
        เพิ่มรูปโปรไฟล์ของคุณ
      </h1>

      <PhotoPicker ref="picker" @change="hasPhoto = $event" />

      <p v-if="errorMessage" class="text-xs font-normal text-moon-error">
        {{ errorMessage }}
      </p>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton label="ถัดไป" :loading="saving" :disabled="!hasPhoto" @click="next" />
    </div>

    <LoadingOverlay v-if="saving" text="กำลังบันทึก..." />
  </div>
</template>

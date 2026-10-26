<script setup lang="ts">
// หน้าแก้ไขโปรไฟล์: เปลี่ยนรูป + แก้ชื่อเล่น (เข้าจากการกดรูปที่หน้าหลัก)
// ปุ่มบันทึกกดได้เมื่อ "เลือกรูปใหม่" หรือ "แก้ชื่อ" อย่างใดอย่างหนึ่ง (ชื่อห้ามว่าง)
const NICKNAME_MAX_LENGTH = 30 // ชื่อยาวสุดกี่ตัวอักษร (กันชื่อยาวจนการ์ดแชร์/หน้าแรกล้น)

const picker = ref<{ getCroppedBlob: (size?: number) => Promise<Blob> } | null>(null)
const hasPhoto = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const currentUrl = ref('')
const nickname = ref('') // ชื่อที่กำลังพิมพ์ในช่อง
const originalNickname = ref('') // ชื่อที่บันทึกอยู่ตอนเปิดหน้า (ไว้เทียบว่าแก้หรือยัง)

const trimmedName = computed(() => nickname.value.trim())
const nameChanged = computed(() => trimmedName.value !== '' && trimmedName.value !== originalNickname.value)
// ชื่อห้ามว่าง และต้องมีอะไรเปลี่ยนอย่างน้อยหนึ่งอย่างถึงจะกดบันทึกได้
const canSave = computed(() => trimmedName.value !== '' && (hasPhoto.value || nameChanged.value))

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
    .select('profile_image_url, nickname')
    .eq('auth_user_id', data.session.user.id)
    .maybeSingle()
  currentUrl.value = profile?.profile_image_url ?? ''
  originalNickname.value = profile?.nickname ?? ''
  nickname.value = originalNickname.value
})

async function save() {
  if (!canSave.value || saving.value) return
  errorMessage.value = ''
  saving.value = true

  try {
    // 1) แก้ชื่อ (เฉพาะตอนที่เปลี่ยนจริง) เซฟลงแถวของตัวเองในตาราง user_profiles
    if (nameChanged.value) {
      const { data: sessionData } = await useSupabaseClient().auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
      const authed = await getAuthedSupabaseClient()
      const { error: nameError } = await authed
        .from('user_profiles')
        .update({ nickname: trimmedName.value })
        .eq('auth_user_id', userId)
      if (nameError) throw nameError
      originalNickname.value = trimmedName.value
    }

    // 2) เปลี่ยนรูป (เฉพาะตอนที่เลือกรูปใหม่)
    if (hasPhoto.value && picker.value) {
      const blob = await picker.value.getCroppedBlob()
      await uploadProfilePhoto(blob)
    }
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
        แก้ไขโปรไฟล์
      </h1>

      <PhotoPicker ref="picker" :current-url="currentUrl" @change="hasPhoto = $event" />

      <!-- ช่องแก้ชื่อเล่น: ชื่อนี้โชว์ที่หน้าแรก การ์ดแชร์ และข้อความชวนเพื่อน -->
      <div class="w-full max-w-[280px]">
        <label for="nickname" class="text-xs font-medium text-moon-muted">ชื่อเล่น</label>
        <input
          id="nickname"
          v-model="nickname"
          type="text"
          placeholder="ชื่อเล่น"
          :maxlength="NICKNAME_MAX_LENGTH"
          class="w-full border-b-2 border-moon-ink/20 bg-transparent text-center text-2xl font-semibold leading-[34px] text-moon-ink outline-none placeholder:text-moon-ink/25 focus:border-moon-ink/50"
        >
      </div>

      <p v-if="errorMessage" class="text-xs font-normal text-moon-error">
        {{ errorMessage }}
      </p>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton :label="saving ? 'กำลังบันทึก...' : 'บันทึก'" :loading="saving" :disabled="!canSave" @click="save" />
    </div>
  </div>
</template>

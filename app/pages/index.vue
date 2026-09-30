<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white">
    <div class="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-6 pt-16 pb-10">
      <div class="text-center">
        <h1 class="font-['Anuphan'] text-[32px] font-semibold leading-tight text-slate-900">
          ยินดีต้อนรับ 
          <!-- "{{ onboarding.name }}" -->
        </h1>
        <p class="mt-3 font-['Anuphan'] text-[16px] font-normal leading-relaxed text-slate-500">
          พื้นที่ดูแลสุขภาพรอบเดือน ที่จะช่วยให้วันนั้นของเดือน<br>
          เป็นเรื่องเบาสบายและเข้าใจง่ายขึ้นสำหรับคุณ
        </p>
      </div>

      <div class="flex w-full flex-col gap-3">
        <div class="max-w-[85%] self-start rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-left font-['Anuphan'] text-[14px] font-medium text-slate-700">
          ตอบคำถามสุขภาพสั้น ๆ เพื่อรับตัวละครประจำตัว
        </div>
        <div class="max-w-[65%] self-start rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-left font-['Anuphan'] text-[14px] font-medium text-slate-700">
          แนะนำวิธีบรรเทาปวดธรรมชาติ
        </div>
        <div class="max-w-[65%] self-end rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-right font-['Anuphan'] text-[14px] font-medium text-slate-700">
          ลดการพึ่งพายาแก้ปวด
        </div>
        <div class="max-w-[85%] self-end rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-right font-['Anuphan'] text-[14px] font-medium text-slate-700">
          ด้วยวิธีธรรมชาติและโภชนาการที่ปลอดภัย
        </div>
      </div>
    </div>

    <div class="px-6 pb-8">
      <div class="flex w-full items-start gap-2 rounded-2xl bg-white/70 p-4">
        <span class="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" />
        <p class="text-left font-['Anuphan'] text-[13px] font-normal leading-relaxed text-slate-500">
          <span class="font-normal text-slate-700">ข้อจำกัดการใช้งาน:</span>
          เว็บไซต์นี้ออกแบบมาเพื่อดูแลอาการปวดประจำเดือนทั่วไปเท่านั้น<br>
          ไม่รองรับหรือครอบคลุมโหมดสำหรับผู้ตั้งครรภ์<br>
          ข้อมูลและคำแนะนำทั้งหมดไม่สามารถใช้ทดแทนคำวินิจฉัยทางการแพทย์ได้<br>
          หากมีอาการรุนแรงควรปรึกษาแพทย์โดยตรง
        </p>
      </div>
      <BaseButton @click="next" />
      <button
        type="button"
        class="mt-3 w-full text-center font-['Anuphan'] text-xs font-normal text-slate-400"
        @click="goToLogin"
      >
        มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
const onboarding = useOnboardingStore()

onMounted(async () => {
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
    navigateTo('/home')
  }
})

function next() {
  navigateTo('/onboarding/step-3')
}

function goToLogin() {
  navigateTo('/onboarding/signup')
}
</script>
<script setup lang="ts">
const onboarding = useOnboardingStore()

function next() {
  navigateTo('/onboarding/step-3')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <div class="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-6 pt-36 pb-10">
      <div class="text-center">
        <h1 class="text-3xl font-semibold text-moon-ink">
          ยินดีต้อนรับ "{{ onboarding.name }}"
        </h1>
        <p class="mt-3 text-base font-normal text-moon-muted">
          พื้นที่ดูแลสุขภาพรอบเดือน ที่จะช่วยให้วันนั้นของเดือน<br>
          เป็นเรื่องเบาสบายและเข้าใจง่ายขึ้นสำหรับคุณ
        </p>
      </div>

      <div class="flex w-full flex-col gap-3">
        <div class="max-w-[85%] self-start rounded-full border border-moon-pink-soft bg-moon-card px-5 py-3 text-left text-sm font-medium text-moon-ink">
          ตอบคำถามสุขภาพสั้น ๆ เพื่อรับตัวละครประจำตัว
        </div>
        <div class="max-w-[85%] self-start rounded-full border border-moon-pink-soft bg-moon-card px-5 py-3 text-left text-sm font-medium text-moon-ink">
          ไอเดียดูแลตัวเองช่วงมีประจำเดือน
        </div>
        <div class="max-w-[80%] self-end rounded-full border border-moon-pink-soft bg-moon-card px-5 py-3 text-right text-sm font-medium text-moon-ink">
          บันทึกอาการและเป้าหมายรายวัน
        </div>
        <div class="max-w-[85%] self-end rounded-full border border-moon-pink-soft bg-moon-card px-5 py-3 text-right text-sm font-medium text-moon-ink">
          ของว่างและท่าผ่อนคลายให้เลือกลอง
        </div>
      </div>
    </div>

    <div class="px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <div class="mb-4 flex w-full items-start gap-2 rounded-2xl border border-moon-pink-soft bg-moon-card/70 p-4">
        <span class="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-moon-muted" />
        <p class="text-left text-[13px] font-normal leading-relaxed text-moon-muted">
          <span class="font-normal text-moon-ink">ข้อจำกัดการใช้งาน:</span>
          เว็บไซต์นี้ออกแบบมาเพื่อดูแลอาการปวดประจำเดือนทั่วไปเท่านั้น<br>
          ไม่รองรับหรือครอบคลุมโหมดสำหรับผู้ตั้งครรภ์<br>
          ข้อมูลและคำแนะนำทั้งหมดไม่สามารถใช้ทดแทนคำวินิจฉัยทางการแพทย์ได้<br>
          หากมีอาการรุนแรงควรปรึกษาแพทย์โดยตรง
        </p>
      </div>
      <BaseButton @click="next" />
    </div>
  </div>
</template>

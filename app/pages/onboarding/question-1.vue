<script setup lang="ts">
const avatarSelections = useAvatarSelections()

const options = QUESTION_1_OPTIONS

// ข้อที่ผู้ใช้กดเลือกไว้ (ยังไม่ไปหน้าถัดไป ต้องกด "ถัดไป" ก่อน)
const picked = ref<string | null>(null)

// ถ้าเคยตอบข้อนี้แล้ว (เช่น รีเฟรชหน้า) ให้ติ๊กคำตอบเดิมไว้ให้
onMounted(() => {
  picked.value = avatarSelections.value.eyes
})

function next() {
  if (!picked.value) return
  avatarSelections.value.eyes = picked.value
  navigateTo('/onboarding/question-2')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <!-- แถบบอกความคืบหน้า (4 ข้อ) เป็นเส้นยาว -->
    <div class="absolute inset-x-6 top-14 z-20">
      <StepProgress :step="1" :total="4" />
    </div>

    <div class="relative z-10 flex flex-1 flex-col px-6 pt-24">
      <h1 class="text-left text-2xl font-semibold text-moon-ink">
        ปกติแล้วคุณจะเข้านอน<br>ช่วงเวลาไหนเป็นประจำ?
      </h1>

      <div class="mt-8 flex flex-col gap-4">
        <AnswerCard
          v-for="opt in options"
          :key="opt.code"
          :label="opt.label"
          :selected="picked === opt.code"
          @click="picked = opt.code"
        />
      </div>
    </div>

    <div class="relative z-10 px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton :disabled="!picked" @click="next" />
    </div>
  </div>
</template>

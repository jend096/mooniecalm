<script setup lang="ts">
function back() {
  navigateTo('/onboarding/allergy')
}

function next() {
  navigateTo('/onboarding/question-1')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-moon-pink-soft bg-moon-card"
      @click="back"
    >
      <FaIcon name="chevron-left" class="h-5 w-5 text-moon-ink" />
    </button>

    <div class="relative z-10 flex flex-1 flex-col items-center px-6 pt-24 text-center">
      <h1 class="text-2xl font-semibold text-moon-ink">
        เอาละพร้อมสร้างตัวละคร<br>จากคำถามพฤติกรรมของคุณหรือยัง!
      </h1>
      <p class="mt-3 w-full text-left text-sm font-normal text-moon-muted">
        ตอบคำถามพฤติกรรมในชีวิตประจำวัน เพื่อปลดล็อกรูปร่างและ
        ลักษณะตัวละครที่สะท้อนสุขภาพของคุณ
      </p>

      <div class="relative mt-10 h-64 w-64">
        <div class="absolute -left-4 top-2 h-10 w-10 rounded-full bg-moon-pink/60 blur-lg" />
        <div class="absolute -right-6 top-10 h-8 w-8 rounded-full bg-moon-pink/60 blur-lg" />

        <img
          src="/avatar/body_Gre.png"
          alt=""
          class="absolute inset-0 h-full w-full object-contain grayscale brightness-0 opacity-30"
        >
        <img
          src="/avatar/body_ger2.png"
          alt=""
          class="absolute inset-0 h-full w-full object-contain grayscale brightness-0 opacity-30"
        >
      </div>
    </div>

    <div class="relative z-10 px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

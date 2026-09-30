<script setup lang="ts">
function back() {
  navigateTo('/onboarding/allergy')
}

function next() {
  navigateTo('/onboarding/question-1')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
    <div class="pointer-events-none absolute -right-16 -top-16 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -left-16 top-1/2 z-0 h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -right-16 top-1/2 z-0 h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -left-10 -top-10 z-0 h-48 w-48 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-20 -right-10 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />

    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
      @click="back"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="relative z-10 flex flex-1 flex-col items-center px-6 pt-20 text-center">
      <h1 class="font-['Anuphan'] text-[24px] font-semibold leading-snug text-slate-900">
        เอาละพร้อมสร้างตัวละคร<br>จากคำถามพฤติกรรมของคุณหรือยัง!
      </h1>
      <p class="mt-3 w-full text-left font-['Anuphan'] text-[14px] font-normal leading-relaxed text-slate-500">
        ตอบคำถามพฤติกรรมในชีวิตประจำวัน เพื่อปลดล็อกรูปร่างและ
        ลักษณะตัวละครที่สะท้อนสุขภาพของคุณ
      </p>

      <div class="relative mt-10 h-64 w-64">
        <div class="absolute -left-4 top-2 h-10 w-10 rounded-full bg-slate-300/50 blur-lg" />
        <div class="absolute -right-6 top-10 h-8 w-8 rounded-full bg-slate-300/50 blur-lg" />

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

    <div class="relative z-10 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton @click="next" />
    </div>
  </div>
</template>

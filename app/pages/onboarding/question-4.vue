<script setup lang="ts">
const avatarSelections = useAvatarSelections()

const options = QUESTION_4_OPTIONS

function choose(code: string) {
  avatarSelections.value.fx_overlay = code
  navigateTo('/onboarding/signup')
}

function back() {
  navigateTo('/onboarding/question-3')
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

    <div class="absolute right-6 top-9 z-20 flex items-center gap-1.5">
      <span
        v-for="i in 4"
        :key="i"
        class="h-1.5 w-6 rounded-full"
        :class="i <= 4 ? 'bg-slate-900' : 'bg-slate-200'">
      </span>
    </div>

    <div class="relative z-10 flex flex-1 flex-col px-6 pt-24">
      <h1 class="text-left font-['Anuphan'] text-[22px] font-semibold leading-snug text-slate-900">
        ในชีวิตประจำวัน คุณมักจะ<br>เลือกดื่มน้ำแบบไหน?
      </h1>

      <div class="mt-8 flex flex-col gap-4">
        <AnswerCard
          v-for="opt in options"
          :key="opt.code"
          :label="opt.label"
          @click="choose(opt.code)"
        />
      </div>
    </div>
  </div>
</template>

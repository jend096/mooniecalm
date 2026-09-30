<script setup lang="ts">
const ANIMATION_MS = 2600

let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => {
    navigateTo('/onboarding/reveal')
  }, ANIMATION_MS)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white">
    <img src="/avatar/moon.png" alt="" class="moon-zoom relative z-10 w-32">

    <div class="pointer-events-none absolute -bottom-10 -left-10 z-0 h-56 w-56 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-14 -right-10 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />
  </div>
</template>

<style scoped>
.moon-zoom {
  animation: moon-zoom-in 2.6s ease-in forwards;
}

@keyframes moon-zoom-in {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
  60% {
    opacity: 1;
  }
  to {
    transform: scale(3.5);
    opacity: 1;
  }
}
</style>

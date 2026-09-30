<script setup lang="ts">
withDefaults(defineProps<{ active?: 'home' | 'goals' | 'guide' | 'hospital' }>(), { active: 'home' })
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-100 bg-white px-2 pb-[env(safe-area-inset-bottom)]">
    <NuxtLink
      to="/home"
      class="flex flex-1 flex-col items-center justify-center gap-1 py-2"
      :class="active === 'home' ? 'text-slate-900' : 'text-slate-400'"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3l7 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M5 8.5V17h10V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="font-['Anuphan'] text-[11px] font-medium">หน้าหลัก</span>
    </NuxtLink>

    <NuxtLink
      to="/goals"
      class="flex flex-1 flex-col items-center justify-center gap-1 py-2"
      :class="active === 'goals' ? 'text-slate-900' : 'text-slate-400'"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.5" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5" />
        <circle cx="10" cy="10" r="0.75" fill="currentColor" />
      </svg>
      <span class="font-['Anuphan'] text-[11px] font-medium">เป้าหมาย</span>
    </NuxtLink>

    <button
      type="button"
      class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-slate-400"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M4 4.5c0-.6.4-1 1-1h6.5L16 7v8.5c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1V4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M7 9h6M7 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="font-['Anuphan'] text-[11px] font-medium">คู่มือ</span>
    </button>

    <button
      type="button"
      class="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-slate-400"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M10 18s6-5.2 6-9.8A6 6 0 0 0 4 8.2C4 12.8 10 18 10 18Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M10 5.5v5M7.5 8h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="font-['Anuphan'] text-[11px] font-medium">รพ.ใกล้ฉัน</span>
    </button>
  </nav>
</template>

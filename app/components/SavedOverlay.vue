<script setup lang="ts">
// ===== หน้า "บันทึกแล้ว" แบบติ๊กถูก (app/components/SavedOverlay.vue) =====
// โชว์วงกลมสีชมพูเด้งขึ้น + เส้นติ๊กถูกค่อยๆ ถูกวาด + ประกายดาว เหมือนหน้าของว่าง
// เล่นครบแล้วส่งสัญญาณ "done" เองหลังผ่านไป ms มิลลิวินาที (ค่าเริ่มต้น 1200) -> หน้าที่เรียกใช้ค่อยพาไปหน้าต่อไป
// ใช้: <SavedOverlay v-if="showSaved" text="บันทึกแล้ว!" @done="navigateTo('/checkin')" />

const props = withDefaults(defineProps<{
  text?: string // ข้อความใต้ติ๊ก
  ms?: number // โชว์นานเท่าไรก่อนส่ง done
}>(), { text: 'บันทึกแล้ว!', ms: 1200 })

const emit = defineEmits<{ done: [] }>()

const checkRef = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  sparkleBurst(checkRef.value, 12)
  timer = setTimeout(() => emit('done'), props.ms)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="saved-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-6" role="status" aria-live="polite">
    <div class="w-full max-w-[300px] rounded-3xl bg-white px-6 pb-6 pt-8 text-center shadow-2xl">
      <span ref="checkRef" class="check-pop mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full bg-moon-period">
        <svg viewBox="0 0 52 52" class="h-11 w-11" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path class="check-draw" d="M14 27 L23 36 L39 17" />
        </svg>
      </span>
      <p class="mt-4 text-lg font-semibold text-moon-ink">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
.saved-overlay {
  animation: overlay-in 0.18s ease-out;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.check-pop {
  animation: check-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes check-pop {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.check-draw {
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: check-draw 0.4s ease-out 0.25s forwards;
}

@keyframes check-draw {
  to { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .saved-overlay,
  .check-pop {
    animation: none;
  }

  .check-draw {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>

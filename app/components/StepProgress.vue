<script setup lang="ts">
// แถบบอกความคืบหน้าเป็นเส้นยาวเส้นเดียว: เส้นสีประจำเดือนค่อยๆ เลื่อนจากข้อที่แล้วไปข้อปัจจุบัน
// (แต่ละข้อเป็นคนละหน้า คอมโพเนนต์นี้จะถูกสร้างใหม่ทุกครั้ง จึงเริ่มที่ข้อก่อนหน้า แล้วค่อยเลื่อนตอนโหลดเสร็จ)
const props = defineProps<{ step: number, total: number }>()

const filled = ref(props.step - 1)

onMounted(() => {
  // รอให้เบราว์เซอร์วาดตำแหน่งเริ่มต้นก่อน 1-2 เฟรม แล้วค่อยสั่งเลื่อน ไม่งั้นจะไม่เห็นแอนิเมชัน
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      filled.value = props.step
    })
  })
})
</script>

<template>
  <!-- รางสีขาวมีขอบชมพูอ่อนบางๆ (ส่วนที่ยังไม่ถึง) + เส้นสีประจำเดือนทับด้านบน (ส่วนที่ผ่านมาแล้ว) -->
  <div
    class="h-1.5 w-full overflow-hidden rounded-full bg-moon-card ring-1 ring-inset ring-moon-pink-soft"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="total"
    :aria-valuenow="step"
    :aria-label="`คำถามข้อ ${step} จาก ${total}`"
  >
    <div
      class="h-full rounded-full bg-moon-period transition-[width] duration-500 ease-out"
      :style="{ width: `${(filled / total) * 100}%` }"
    />
  </div>
</template>

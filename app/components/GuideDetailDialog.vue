<script setup lang="ts">
// ===== การ์ดอ่านวิธีทำคู่มือ (app/components/GuideDetailDialog.vue) =====
// ใช้ 2 ที่: หน้าคู่มือ (กด "เลือกอันนี้" แล้วเด้งขึ้นมา) และหน้าเช็คอิน (กดอ่านซ้ำ) -> ได้การ์ดหน้าตาเดียวกัน
// คอมโพเนนต์นี้แค่โชว์ แล้วส่งสัญญาณ "close" เมื่อกดปุ่มหรือกดพื้นที่ว่างข้างนอกกล่อง
// ว่าปิดแล้วจะไปไหน (เช่น ไปหน้าเช็คอิน) ให้หน้าที่เรียกใช้เป็นคนตัดสินใจเอง
defineProps<{
  title: string // ชื่อคู่มือ
  shortDescription?: string | null // คำอธิบายสั้นๆ
  steps: string[] // ขั้นตอนที่แยกเป็นข้อๆ แล้ว (ใช้ splitSteps)
  recommended?: boolean // true = โชว์ป้าย "แนะนำสำหรับคุณ" (คู่มือนี้ตรงกับเป้าหมายของผู้ใช้)
  buttonLabel: string // ชื่อปุ่ม เช่น "ถัดไป" หรือ "ปิด"
}>()

const emit = defineEmits<{
  close: [] // กดปุ่ม หรือกดพื้นที่ว่าง
}>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-moon-ink/30 px-6" @click.self="emit('close')">
    <div class="relative flex max-h-[85dvh] w-full max-w-[380px] flex-col overflow-hidden rounded-[24px] bg-moon-card px-6 pb-6 pt-7 text-moon-ink shadow-[0_25px_50px_rgba(0,0,0,0.25)]">
      <!-- ลายครีมจางๆ ด้านหลัง (รูปหัวกระต่ายตามฟิกม่า) -->
      <RabbitBlob class="pointer-events-none absolute right-[-48px] top-[95px] h-[190px] w-[190px] text-moon-cream" />

      <div class="relative min-h-0 flex-1 overflow-y-auto">
        <!-- ชื่อคู่มือ (ซ้าย) + ป้ายแนะนำ (ชิดขวา) อยู่บรรทัดเดียวกัน -->
        <div class="flex items-start justify-between gap-2">
          <p class="min-w-0 text-lg font-semibold leading-[26px]">{{ title }}</p>
          <RecommendBadge v-if="recommended" large class="mt-[2px]" />
        </div>
        <p v-if="shortDescription" class="mt-1 text-base font-medium text-moon-muted">{{ shortDescription }}</p>

        <p class="mt-3 text-sm">วิธีใช้</p>
        <ol class="mt-1 flex flex-col gap-2 text-sm leading-[23px]">
          <li v-for="(line, i) in steps" :key="i">{{ i + 1 }}. {{ line }}</li>
        </ol>

        <p class="mt-6 rounded-2xl bg-moon-coral/10 p-[10px] text-xs leading-[20px] text-moon-ink/80">
          เป็นคำแนะนำทั่วไปเพื่อบรรเทาอาการเบื้องต้น ผลของแต่ละคนไม่เหมือนกัน ไม่ใช่การวินิจฉัยหรือแทนคำแนะนำของแพทย์
        </p>
      </div>

      <button
        type="button"
        class="btn-primary relative mt-5 w-full"
        @click="emit('close')"
      >
        {{ buttonLabel }}
      </button>
    </div>
  </div>
</template>

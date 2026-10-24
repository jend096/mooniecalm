<script setup lang="ts">
// ===== ป๊อปอัพขอความยินยอมเก็บข้อมูลสุขภาพ (app/components/ConsentDialog.vue) =====
// โชว์หลังกด "เริ่มเลย" ที่หน้าแรก (และตอนเข้าสู่ระบบถ้าเครื่องนี้ยังไม่เคยกดยินยอม)
// ต้องติ๊ก "ฉันยินยอม" ก่อนปุ่มหลักถึงจะกดได้ / กดพื้นหลังไม่ปิด กันกดพลาด
// หน้าที่เรียกใช้เป็นคนบันทึกความยินยอม (saveConsent) เมื่อได้รับสัญญาณ accept
// ข้อความด้านล่างเป็นร่าง ผู้พัฒนาต้องอ่านทวนให้ตรงกับที่ระบบทำจริงก่อนใช้ (ไม่ใช่คำแนะนำทางกฎหมาย)
const emit = defineEmits<{
  accept: [] // ติ๊กแล้วกดยินยอม
  decline: [] // กดยังไม่ยินยอม
}>()

const agreed = ref(false)
</script>

<template>
  <div class="consent-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-5">
    <div
      class="consent-panel flex max-h-[88dvh] w-full max-w-[390px] flex-col rounded-[28px] bg-white px-6 pb-6 pt-7 text-moon-ink shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <h2 id="consent-title" class="text-center text-xl font-semibold leading-7">ก่อนเริ่มใช้งาน</h2>
      <p class="mt-1 text-center text-sm text-moon-muted">ขอความยินยอมในการเก็บข้อมูลสุขภาพของคุณ</p>

      <!-- เนื้อหายาวเลื่อนอ่านได้ -->
      <div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 text-sm leading-[22px]">
        <h3 class="font-semibold">ข้อมูลที่เราเก็บ</h3>
        <p class="mt-1 text-moon-ink/80">
          อีเมลที่ใช้เข้าสู่ระบบ, วันเกิด, น้ำหนัก, ส่วนสูง, วันที่และจำนวนวันของประจำเดือน, ระดับและตำแหน่งที่ปวด, อาการ, อารมณ์, ยาแก้ปวดที่กิน, อาหารที่แพ้,
          เป้าหมายและการเช็คอินประจำวัน, ของว่างกับวิธีบรรเทาปวดที่คุณเลือก, ตัวละคร และรูปโปรไฟล์
        </p>

        <h3 class="mt-4 font-semibold">เราใช้ข้อมูลนี้เพื่ออะไร</h3>
        <p class="mt-1 text-moon-ink/80">
          เพื่อคาดการณ์รอบเดือน, แนะนำของว่างและวิธีบรรเทาปวดที่เหมาะกับคุณ, ติดตามเป้าหมาย และสรุปให้คุณดูย้อนหลัง เราไม่ใช้ข้อมูลของคุณเพื่อเรื่องอื่น
        </p>

        <h3 class="mt-4 font-semibold">ข้อมูลของคุณปลอดภัยแค่ไหน</h3>
        <p class="mt-1 text-moon-ink/80">
          ข้อมูลถูกเก็บในระบบฐานข้อมูลของแอป ต้องเข้าสู่ระบบด้วยอีเมลของคุณถึงจะเห็นข้อมูลของตัวเอง เราไม่ขายหรือแบ่งข้อมูลของคุณให้ผู้อื่นเพื่อการโฆษณา
        </p>

        <h3 class="mt-4 font-semibold">ข้อควรรู้</h3>
        <p class="mt-1 text-moon-ink/80">
          MoonieCalm ไม่ใช่เครื่องมือวินิจฉัยโรคและไม่ใช่คำแนะนำของแพทย์ คำแนะนำในแอปเป็นข้อมูลทั่วไปเพื่อบรรเทาอาการเบื้องต้น
          ถ้าปวดมากผิดปกติหรือกังวลเรื่องสุขภาพ ควรปรึกษาแพทย์
        </p>
      </div>

      <!-- ติ๊กยินยอม -->
      <label class="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-moon-pink-soft px-4 py-3 text-sm leading-[21px]">
        <input v-model="agreed" type="checkbox" class="sr-only">
        <span
          class="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
          :class="agreed ? 'border-moon-period bg-moon-period' : 'border-moon-coral bg-white'"
        >
          <FaIcon v-if="agreed" name="check" class="h-3 w-3 text-white" />
        </span>
        <span>ฉันยินยอมให้ MoonieCalm เก็บและใช้ข้อมูลสุขภาพตามที่แจ้งข้างต้น</span>
      </label>

      <div class="mt-4 flex flex-col gap-2">
        <button
          type="button"
          :disabled="!agreed"
          class="w-full rounded-full bg-moon-ink py-3.5 text-base font-semibold text-white transition enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-moon-ink/30"
          @click="emit('accept')"
        >
          ยินยอมและเริ่มต้น
        </button>
        <button
          type="button"
          class="w-full rounded-full border-2 border-moon-pink bg-white py-3 text-base font-semibold transition active:scale-95"
          @click="emit('decline')"
        >
          ยังไม่ยินยอม
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.consent-backdrop {
  animation: consent-fade 0.2s ease-out;
}

.consent-panel {
  animation: consent-rise 0.3s cubic-bezier(0.34, 1.3, 0.64, 1);
}

@keyframes consent-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes consent-rise {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .consent-backdrop,
  .consent-panel {
    animation: none;
  }
}
</style>

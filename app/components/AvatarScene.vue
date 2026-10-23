<script setup lang="ts">
// ===== ฉากอวตาร (app/components/AvatarScene.vue) =====
// ใช้ร่วมกันทุกที่ที่โชว์อวตารบนหน้าจอ: หน้าแรก, หน้าได้อวตารครั้งแรก (reveal), หน้ารับผลครบ 28 วัน
// - พื้นหลัง (fx_overlay) ขนาดเดิมเสมอ
// - ตัวกระต่าย (หู/ตา/ขนม) ย่อได้ด้วย bunnyScale (1 = เต็ม, 0.8 = เล็กลง 20%) ย่อจากกลางล่าง เท้ายังอยู่บนเงาพื้น
// - หูกระดิกได้ (ไฟล์ใน public/avatar/anim) + ตัวหายใจเบาๆ  ปิดทั้งหมดได้ด้วย :animated="false"
// - cropTop = ตัดส่วนบนของฉากที่ว่างทิ้ง (0 = ไม่ตัด, 0.33 = ตัดบนออก 33% ของความสูง) พื้นหลังยังกว้างเท่าเดิม
//   แค่ฉากเตี้ยลง เนื้อหาใต้ฉากเลยขยับขึ้นมา ขอบบนที่ตัดจะเลือนหายไปเองไม่เป็นเส้นแข็ง (ใช้หน้าแรก)
// ราก = กว้างเต็มที่ ใส่ขนาดจากข้างนอกด้วย class (เช่น class="w-[200px]") ปกติเป็นสี่เหลี่ยมจัตุรัส
// ใส่ปุ่มหรือของตกแต่งทับบนรูปได้ผ่าน slot ตัวเริ่มต้น
import { avatarLayerSrc } from '~/utils/avatar-layer-src'

export interface SceneLayer { slot: string, code: string | null }

const props = withDefaults(defineProps<{
  layers: SceneLayer[] // เรียงจากล่างขึ้นบน (fx_overlay มาก่อน)
  bunnyScale?: number
  animated?: boolean
  cropTop?: number
}>(), { bunnyScale: 1, animated: true, cropTop: 0 })

const emit = defineEmits<{ (e: 'layer-error', slot: string): void }>()

// ชั้นที่โหลดไม่ขึ้น ซ่อนไว้เฉยๆ ไม่ให้เห็นรูปแตก
const hidden = ref<Record<string, boolean>>({})
function onError(slot: string) {
  hidden.value[slot] = true
  emit('layer-error', slot)
}

// ไล่เลือนขอบบนของฉากที่ถูกตัด (ขอบเลือนยาว 10% ของความสูงที่เหลือ)
const fadeStyle = computed(() => {
  // เปอร์เซ็นต์นับจากขอบบนของฉากเต็ม: ส่วนที่ถูกตัด (0 ถึง cropTop) โปร่งใส แล้วค่อยๆ ทึบขึ้น
  const start = props.cropTop * 100
  const end = start + (1 - props.cropTop) * 10
  const mask = `linear-gradient(to bottom, transparent ${start}%, #000 ${end}%)`
  return { maskImage: mask, WebkitMaskImage: mask }
})

const backdrop = computed(() => props.layers.find(l => l.slot === 'fx_overlay'))
const bunnyLayers = computed(() => props.layers.filter(l => l.slot !== 'fx_overlay'))
</script>

<template>
  <div
    class="relative w-full"
    :class="cropTop > 0 ? 'overflow-hidden' : ''"
    :style="{ '--bunny-scale': bunnyScale, aspectRatio: `1 / ${1 - cropTop}` }"
  >
    <!-- ตัวฉากเต็มสี่เหลี่ยมจัตุรัส ชิดล่างราก ถ้า cropTop > 0 ส่วนบนที่เกินรากจะถูกตัดและไล่เลือนหาย -->
    <div class="absolute inset-x-0 bottom-0 aspect-square" :style="cropTop > 0 ? fadeStyle : undefined">
    <img
      v-if="backdrop?.code && !hidden[backdrop.slot]"
      :src="avatarLayerSrc(backdrop.code)"
      alt=""
      class="absolute inset-0 h-full w-full object-contain"
      @error="onError(backdrop.slot)"
    >
    <div class="bunny-size absolute inset-0">
      <div class="absolute inset-0" :class="animated ? 'bunny-breathe' : ''">
        <template v-for="layer in bunnyLayers" :key="layer.slot">
          <img
            v-if="layer.code && !hidden[layer.slot]"
            :src="avatarLayerSrc(layer.code, animated)"
            alt=""
            class="absolute inset-0 h-full w-full object-contain"
            @error="onError(layer.slot)"
          >
        </template>
      </div>
    </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
/* ตัวกระต่ายย่อจากกลางล่าง (ขนาดย่อมาจาก bunnyScale ที่ส่งเข้ามา) */
.bunny-size {
  transform: scale(var(--bunny-scale, 1));
  transform-origin: 50% 90%;
}

/* หายใจเบาๆ: ตัวยืดขึ้นลงนิดเดียวจากเท้า (ปรับความแรงที่ scaleY / ความเร็วที่ 3.6s) */
.bunny-breathe {
  transform-origin: 50% 90%;
  animation: bunny-breathe 3.6s ease-in-out infinite;
}

@keyframes bunny-breathe {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.018);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bunny-breathe {
    animation: none;
  }
}
</style>

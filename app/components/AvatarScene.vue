<script setup lang="ts">
// ===== ฉากอวตาร (app/components/AvatarScene.vue) =====
// ใช้ร่วมกันทุกที่ที่โชว์อวตารบนหน้าจอ: หน้าแรก, หน้าได้อวตารครั้งแรก (reveal), หน้ารับผลครบ 28 วัน
// - พื้นหลัง (fx_overlay) ขนาดเดิมเสมอ
// - ตัวกระต่าย (หู/ตา/ขนม) ย่อได้ด้วย bunnyScale (1 = เต็ม, 0.8 = เล็กลง 20%) ย่อจากกลางล่าง เท้ายังอยู่บนเงาพื้น
// - หูกระดิกได้ (ไฟล์ใน public/avatar/anim) + ตัวหายใจเบาๆ  ปิดทั้งหมดได้ด้วย :animated="false"
// ราก = สี่เหลี่ยมจัตุรัสกว้างเต็มที่ ใส่ขนาดจากข้างนอกด้วย class (เช่น class="w-[200px]")
// ใส่ปุ่มหรือของตกแต่งทับบนรูปได้ผ่าน slot ตัวเริ่มต้น
import { avatarLayerSrc } from '~/utils/avatar-layer-src'

export interface SceneLayer { slot: string, code: string | null }

const props = withDefaults(defineProps<{
  layers: SceneLayer[] // เรียงจากล่างขึ้นบน (fx_overlay มาก่อน)
  bunnyScale?: number
  animated?: boolean
}>(), { bunnyScale: 1, animated: true })

const emit = defineEmits<{ (e: 'layer-error', slot: string): void }>()

// ชั้นที่โหลดไม่ขึ้น ซ่อนไว้เฉยๆ ไม่ให้เห็นรูปแตก
const hidden = ref<Record<string, boolean>>({})
function onError(slot: string) {
  hidden.value[slot] = true
  emit('layer-error', slot)
}

const backdrop = computed(() => props.layers.find(l => l.slot === 'fx_overlay'))
const bunnyLayers = computed(() => props.layers.filter(l => l.slot !== 'fx_overlay'))
</script>

<template>
  <div class="relative aspect-square w-full" :style="{ '--bunny-scale': bunnyScale }">
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

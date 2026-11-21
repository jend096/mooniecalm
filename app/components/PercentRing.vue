<script setup lang="ts">
// ===== วงกลมเปอร์เซ็นต์ (app/components/PercentRing.vue) =====
// ใช้ในหน้าสรุปเดือน: วงรางสีอ่อน + วงค่าสีเข้มเริ่มจากด้านบนตามเข็มนาฬิกา ใส่ข้อความตรงกลางผ่าน slot
const props = withDefaults(defineProps<{
  percent: number // 0-100
  size: number // px
  stroke: number // ความหนาเส้น px
  color: string // สีวงค่า (CSS color / var)
  track: string // สีวงราง
}>(), {})

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dash = computed(() => (Math.min(Math.max(props.percent, 0), 100) / 100) * circumference.value)
</script>

<template>
  <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" :stroke="track" :stroke-width="stroke" />
      <circle
        v-if="percent > 0"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="`${dash} ${circumference}`"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <slot />
    </div>
  </div>
</template>

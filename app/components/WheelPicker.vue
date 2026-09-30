<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    items: (string | number)[]
    modelValue: number
    width?: string
    unit?: string
  }>(),
  { width: 'w-20', unit: '' }
)

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const ITEM_HEIGHT = 44
const VISIBLE_ROWS = 5
const PAD = Math.floor(VISIBLE_ROWS / 2) * ITEM_HEIGHT

const listEl = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

function clampIndex(i: number) {
  return Math.min(Math.max(i, 0), props.items.length - 1)
}

const currentIndex = computed(() => clampIndex(Math.round(scrollTop.value / ITEM_HEIGHT)))

watch(currentIndex, (val) => {
  if (val !== props.modelValue) emit('update:modelValue', val)
})

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

let isDragging = false
let dragStartY = 0
let dragStartScrollTop = 0

function onMouseDown(e: MouseEvent) {
  if (!listEl.value) return
  isDragging = true
  dragStartY = e.clientY
  dragStartScrollTop = listEl.value.scrollTop
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging || !listEl.value) return
  e.preventDefault()
  listEl.value.scrollTop = dragStartScrollTop - (e.clientY - dragStartY)
}

function onMouseUp() {
  if (!isDragging || !listEl.value) return
  isDragging = false
  const idx = clampIndex(Math.round(listEl.value.scrollTop / ITEM_HEIGHT))
  listEl.value.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
}

function onTouchStart(e: TouchEvent) {
  if (!listEl.value) return
  isDragging = true
  dragStartY = e.touches[0].clientY
  dragStartScrollTop = listEl.value.scrollTop
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging || !listEl.value) return
  e.preventDefault()
  listEl.value.scrollTop = dragStartScrollTop - (e.touches[0].clientY - dragStartY)
}

function rowStyle(i: number) {
  const distance = i - scrollTop.value / ITEM_HEIGHT
  const abs = Math.abs(distance)
  const opacity = Math.max(1 - abs * 0.35, 0.15)
  const scale = abs < 0.5 ? 1 : Math.max(1 - abs * 0.08, 0.82)
  return {
    opacity,
    transform: `scale(${scale})`,
    fontWeight: abs < 0.5 ? 700 : 500,
    color: abs < 0.5 ? '#0f172a' : '#94a3b8'
  }
}

function isCentered(i: number) {
  return Math.abs(i - scrollTop.value / ITEM_HEIGHT) < 0.5
}

onMounted(() => {
  const idx = clampIndex(props.modelValue ?? 0)
  if (listEl.value) listEl.value.scrollTop = idx * ITEM_HEIGHT
  scrollTop.value = idx * ITEM_HEIGHT
})
</script>

<template>
  <div
    ref="listEl"
    :class="width"
    class="h-[220px] cursor-grab touch-none select-none snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
    @scroll="onScroll"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onMouseUp"
  >
    <div :style="{ paddingTop: `${PAD}px`, paddingBottom: `${PAD}px` }">
      <div
        v-for="(item, i) in items"
        :key="i"
        class="flex h-11 snap-center items-baseline justify-center gap-0.5 font-['Anuphan'] text-lg"
        :style="rowStyle(i)"
      >
        <span>{{ item }}</span>
        <span v-if="unit && isCentered(i)" class="text-xs font-normal">{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

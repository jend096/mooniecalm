<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    items: (string | number)[]
    modelValue: number
    width?: string
    unit?: string
    rows?: number // จำนวนแถวที่มองเห็น (เลขคี่) ปกติ 5 แถว ใช้ 3 แถวตอนเป็นวงล้อเล็กในกล่อง
    itemHeight?: number // ความสูงต่อแถว (px) ปกติ 60 / วงล้อเล็กใช้ 44
    textClass?: string // ขนาดตัวอักษรของแถว ปกติ text-xl (20px) / วงล้อเล็กใช้ text-sm (14px)
  }>(),
  { width: 'w-20', unit: '', rows: 5, itemHeight: 60, textClass: 'text-xl' }
)

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const ITEM_HEIGHT = props.itemHeight // ความสูงต่อแถว (ปกติ 60 ให้ตรงกับเส้นกรอบแถวที่เลือกในแต่ละหน้า = top 120px)
const PAD = computed(() => Math.floor(props.rows / 2) * ITEM_HEIGHT)

const listEl = ref<HTMLElement | null>(null)
const scrollTop = ref(Math.min(Math.max(props.modelValue ?? 0, 0), props.items.length - 1) * ITEM_HEIGHT)

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

// สไตล์ของแต่ละแถว "เปลี่ยนต่อเนื่องตามระยะที่เลื่อน" (ไม่กระโดดเป็นขั้น) ผู้ใช้จะเห็นตัวเลขค่อยๆ โตขึ้น/เข้มขึ้นตอนเลื่อนเข้ามาตรงกลาง
// และค่อยๆ เล็กลง/จางลงตอนเลื่อนออกไป เห็นชัดว่าวงล้อกำลังขยับจริงและตอนนี้อันไหนถูกเลือก
function rowStyle(i: number) {
  const d = Math.abs(i - scrollTop.value / ITEM_HEIGHT) // ระยะห่างจากแถวกลาง นับเป็นจำนวนแถว (0 = อยู่กลางพอดี)
  const scale = Math.max(1.25 - d * 0.25, 0.8) // แถวกลางขยาย 25% แถวถัดไปขนาดปกติ แถวไกลๆ เล็กลง
  const inkPercent = Math.max(100 - d * 72, 28) // สีตัวหนังสือ: กลาง = เข้มเต็ม ห่างออกไป = จางลงถึง 28% (ตาม Figma)
  return {
    opacity: Math.max(1 - d * 0.2, 0.55),
    transform: `scale(${scale})`,
    // แถวที่เลือก: ตัวหนา / แถวอื่น: ตัวบาง
    fontWeight: d < 0.5 ? 600 : 400,
    color: `color-mix(in srgb, var(--color-ink) ${inkPercent}%, transparent)`
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
    :style="{ height: `${rows * ITEM_HEIGHT}px` }"
    class="cursor-grab touch-none select-none snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
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
        class="flex snap-center items-center justify-center"
        :class="textClass"
        :style="[{ height: `${ITEM_HEIGHT}px` }, rowStyle(i)]"
      >
        {{ item }}
        <!-- หน่วย (kg, cm, วัน): เว้นที่ไว้ทุกแถวแต่โชว์เฉพาะแถวที่เลือก (invisible = มองไม่เห็นแต่ยังกินที่)
             ทำให้ "ตัวเลข + หน่วย" อยู่กึ่งกลางคอลัมน์พอดี และตัวเลขทุกแถวเรียงตรงกัน ไม่ขยับตอนเลื่อน -->
        <span
          v-if="unit"
          class="ml-2 whitespace-nowrap text-base font-semibold"
          :class="{ invisible: !isCentered(i) }"
        >{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

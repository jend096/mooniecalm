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
  // สั่นเบาๆ ทุกครั้งที่ผ่านแถวใหม่ เหมือนวงล้อในแอปมือถือ (iPhone ไม่รองรับคำสั่งนี้ ก็แค่ไม่สั่น)
  try { navigator.vibrate?.(6) } catch { /* ไม่รองรับก็ข้าม */ }
})

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

let isDragging = false
let dragStartY = 0
let dragStartScrollTop = 0
// เก็บตำแหน่งนิ้ว/เมาส์ย้อนหลังไม่กี่จุด ไว้คำนวณ "แรงเหวี่ยง" ตอนปล่อยนิ้ว (เหวี่ยงเร็ว = ไหลต่อไปไกลกว่า เหมือนวงล้อในแอปมือถือ)
let samples: { t: number, y: number }[] = []

function trackSample(y: number) {
  const now = performance.now()
  samples.push({ t: now, y })
  while (samples.length > 1 && now - samples[0]!.t > 120) samples.shift()
}

// ความเร็วนิ้ว (px ต่อ ms) จากช่วงสั้นๆ ก่อนปล่อย ลบ = เลื่อนลง
function releaseVelocity(): number {
  if (samples.length < 2) return 0
  const first = samples[0]!
  const last = samples[samples.length - 1]!
  const dt = last.t - first.t
  return dt > 0 ? (last.y - first.y) / dt : 0
}

// ปล่อยนิ้ว: ไหลต่อตามแรงเหวี่ยง แล้วหยุดที่แถวใกล้สุด (เบราว์เซอร์เลื่อนแบบนุ่มให้เอง)
function settle() {
  if (!listEl.value) return
  const v = releaseVelocity() // px/ms ทิศเดียวกับนิ้ว
  const glide = Math.max(Math.min(-v * 260, ITEM_HEIGHT * 14), -ITEM_HEIGHT * 14) // ระยะไหลต่อ (px) เหวี่ยงแรงสุดไหลได้ประมาณ 14 แถว
  const idx = clampIndex(Math.round((listEl.value.scrollTop + glide) / ITEM_HEIGHT))
  listEl.value.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
  samples = []
}

function onMouseDown(e: MouseEvent) {
  if (!listEl.value) return
  isDragging = true
  dragStartY = e.clientY
  dragStartScrollTop = listEl.value.scrollTop
  samples = []
  trackSample(e.clientY)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging || !listEl.value) return
  e.preventDefault()
  listEl.value.scrollTop = dragStartScrollTop - (e.clientY - dragStartY)
  trackSample(e.clientY)
}

function onMouseUp() {
  if (!isDragging || !listEl.value) return
  isDragging = false
  settle()
}

function onTouchStart(e: TouchEvent) {
  if (!listEl.value) return
  isDragging = true
  dragStartY = e.touches[0].clientY
  dragStartScrollTop = listEl.value.scrollTop
  samples = []
  trackSample(e.touches[0].clientY)
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging || !listEl.value) return
  e.preventDefault()
  listEl.value.scrollTop = dragStartScrollTop - (e.touches[0].clientY - dragStartY)
  trackSample(e.touches[0].clientY)
}

// สไตล์ของแต่ละแถว "เปลี่ยนต่อเนื่องตามระยะที่เลื่อน" ให้วงล้อดูเป็นทรงกระบอก (เหมือนวงล้อเลือกค่าในมือถือ)
// แถวกลางหันตรงมาที่เรา ใหญ่ เข้ม แถวที่อยู่ไกลออกไปเหมือนโค้งหนีไป: เตี้ยลง จางลง และขยับเข้าหาแถวกลาง
const STEP_DEG = 30 // แต่ละแถวห่างกันกี่องศาบนทรงกระบอก ยิ่งมากยิ่งโค้งเยอะ
const STEP_RAD = (STEP_DEG * Math.PI) / 180
const RADIUS = ITEM_HEIGHT / STEP_RAD // รัศมีทรงกระบอก ให้แถวที่อยู่ติดกันห่างกันเท่าความสูงแถวพอดี ตรงกลาง

function rowStyle(i: number) {
  const signed = i - scrollTop.value / ITEM_HEIGHT // ระยะห่างจากแถวกลาง (จำนวนแถว) ลบ = อยู่เหนือกลาง
  const d = Math.abs(signed)
  const theta = Math.min(d * STEP_RAD, (80 * Math.PI) / 180) // มุมบนทรงกระบอก (ไม่เกิน 80 องศา)
  const flat = signed * ITEM_HEIGHT // ตำแหน่งแนวตั้งถ้าเป็นแผ่นเรียบ
  const curved = Math.sign(signed) * RADIUS * Math.sin(theta) // ตำแหน่งแนวตั้งจริงบนทรงกระบอก (ใกล้กลางเท่ากัน ไกลออกไปจะเข้าหากัน)
  const shiftY = curved - flat
  const size = Math.max(1.25 - d * 0.25, 0.8) // แถวกลางใหญ่สุด
  const squash = Math.cos(theta) // แถวที่โค้งหนีไปดูเตี้ยลง
  const inkPercent = Math.max(100 - d * 72, 28) // สี: กลาง = เข้มเต็ม ห่างออกไป = จางลงถึง 28% (ตาม Figma)
  return {
    opacity: Math.max(Math.cos(theta) ** 1.2, 0.25),
    transform: `translateY(${shiftY}px) scale(${size}, ${size * squash})`,
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

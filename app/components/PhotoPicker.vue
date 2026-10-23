<script setup lang="ts">
// ตัวเลือก + ปรับรูปโปรไฟล์ (ใช้ทั้งหน้า onboarding/photo และหน้าแก้รูปจากหน้าหลัก)
//
// วิธีทำงาน
// 1) ผู้ใช้เลือกไฟล์รูป -> ขึ้นในวงกลม
// 2) ลากเพื่อเลื่อนรูป / บีบสองนิ้วเพื่อซูม (บนคอมใช้ล้อเมาส์) เหมือนแอปทั่วไป
//    ส่วนของรูปที่อยู่นอกวงกลมจะถูกทำให้จางลง เพื่อให้เห็นว่าส่วนไหนจะถูกตัดไปใช้
// 3) หน้าที่เรียกใช้ เรียก picker.getCroppedBlob() เพื่อ "ตัดรูปเฉพาะส่วนที่เห็นในวงกลม" ออกมาเป็นไฟล์ แล้วเอาไปอัปโหลด

const props = withDefaults(defineProps<{
  size?: number // เส้นผ่านศูนย์กลางวงกลมที่จะตัดรูป (px)
  currentUrl?: string // รูปปัจจุบัน (ถ้ามี) โชว์ในวงกลมก่อนที่ผู้ใช้จะเลือกรูปใหม่
}>(), { size: 220, currentUrl: '' })

const emit = defineEmits<{ change: [hasPhoto: boolean] }>()

const MIN_ZOOM = 1
const MAX_ZOOM = 3

const photoUrl = ref('') // ที่อยู่ชั่วคราว (blob:) ของรูปที่เลือก
const imgEl = ref<HTMLImageElement | null>(null)
const natural = reactive({ w: 0, h: 0 }) // ขนาดจริงของรูป (px)
const zoom = ref(1) // 1 = รูปเต็มวงกลมพอดี
const offset = reactive({ x: 0, y: 0 }) // รูปเลื่อนไปจากกึ่งกลางวงกลมเท่าไร (px บนหน้าจอ)

// ซูม 1 เท่า = ด้านสั้นของรูปเท่ากับเส้นผ่านศูนย์กลางวงกลมพอดี (รูปจะไม่มีช่องว่างในวงกลม)
const scale = computed(() => (natural.w ? (props.size / Math.min(natural.w, natural.h)) * zoom.value : 1))
const shownW = computed(() => natural.w * scale.value)
const shownH = computed(() => natural.h * scale.value)

// ไม่ให้ลากรูปจนขอบรูปหลุดเข้ามาในวงกลม
function clampOffset() {
  const maxX = Math.max(0, (shownW.value - props.size) / 2)
  const maxY = Math.max(0, (shownH.value - props.size) / 2)
  offset.x = Math.min(maxX, Math.max(-maxX, offset.x))
  offset.y = Math.min(maxY, Math.max(-maxY, offset.y))
}

// ซูมโดยให้จุดกลางวงกลมอยู่ที่เดิม (เลื่อนรูปตามสัดส่วนที่ซูม)
function setZoom(next: number) {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
  const ratio = z / zoom.value
  offset.x *= ratio
  offset.y *= ratio
  zoom.value = z
  clampOffset()
}

function onWheel(e: WheelEvent) {
  setZoom(zoom.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08))
}

// ----- ลากเลื่อน (1 นิ้ว) และบีบซูม (2 นิ้ว) -----
const pointers = new Map<number, { x: number, y: number }>()
let lastPinchDistance = 0

function pinchDistance() {
  if (pointers.size !== 2) return 0
  const [a, b] = [...pointers.values()]
  return Math.hypot(a!.x - b!.x, a!.y - b!.y)
}

function onPointerDown(e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  lastPinchDistance = pinchDistance()
}

function onPointerMove(e: PointerEvent) {
  const previous = pointers.get(e.pointerId)
  if (!previous) return
  const current = { x: e.clientX, y: e.clientY }
  pointers.set(e.pointerId, current)

  if (pointers.size === 1) {
    offset.x += current.x - previous.x
    offset.y += current.y - previous.y
    clampOffset()
  } else if (pointers.size === 2) {
    const distance = pinchDistance()
    if (lastPinchDistance > 0) setZoom(zoom.value * (distance / lastPinchDistance))
    lastPinchDistance = distance
  }
}

function onPointerEnd(e: PointerEvent) {
  pointers.delete(e.pointerId)
  lastPinchDistance = pinchDistance()
}

// ----- เลือกไฟล์ -----
function onPhotoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // เคลียร์ไว้ เพื่อให้เลือกไฟล์เดิมซ้ำได้
  if (!file) return

  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
  natural.w = 0
  natural.h = 0
  zoom.value = 1
  offset.x = 0
  offset.y = 0
  photoUrl.value = URL.createObjectURL(file)
  emit('change', true)
}

function onImageLoad() {
  if (!imgEl.value) return
  natural.w = imgEl.value.naturalWidth
  natural.h = imgEl.value.naturalHeight
  clampOffset()
}

onBeforeUnmount(() => {
  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
})

// ----- ตัดรูปเฉพาะส่วนที่เห็นในวงกลม -----
async function getCroppedBlob(outputSize = 512): Promise<Blob> {
  const img = imgEl.value
  if (!img || !natural.w) throw new Error('ยังไม่ได้เลือกรูป')

  // วงกลมครอบอยู่บนรูปส่วนไหน (นับเป็นพิกเซลของรูปจริง)
  const side = props.size / scale.value
  const centerX = natural.w / 2 - offset.x / scale.value
  const centerY = natural.h / 2 - offset.y / scale.value

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการตัดรูป')

  ctx.fillStyle = '#FFFFFF' // JPEG ไม่มีความโปร่งใส เติมขาวไว้ให้ รูปพื้นโปร่งจะไม่กลายเป็นดำ
  ctx.fillRect(0, 0, outputSize, outputSize)
  ctx.drawImage(img, centerX - side / 2, centerY - side / 2, side, side, 0, 0, outputSize, outputSize)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('ตัดรูปไม่สำเร็จ'))),
      'image/jpeg',
      0.9
    )
  })
}

defineExpose({ getCroppedBlob })

const MARGIN = 24 // พื้นที่รอบวงกลมที่ยังเห็นรูปจางๆ (px ต่อข้าง)
const circleStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
const frameStyle = computed(() => ({ width: `${props.size + MARGIN * 2}px`, height: `${props.size + MARGIN * 2}px` }))
const imgStyle = computed(() => ({
  width: `${shownW.value}px`,
  height: `${shownH.value}px`,
  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
}))
</script>

<template>
  <div class="flex flex-col items-center">
    <!-- กรอบขนาดเท่ากันทั้งก่อนและหลังเลือกรูป หน้าจะได้ไม่ขยับตอนเลือกรูป -->
    <div class="flex items-center justify-center" :style="frameStyle">
      <!-- ยังไม่ได้เลือกรูป: กดวงกลมเพื่อเลือกรูป
           มีรูปปัจจุบัน = โชว์รูปนั้น / ไม่มีรูป = โชว์เงาหัวคนสีจางๆ
           ไอคอนดินสอมุมขวาล่างบอกว่ากดเปลี่ยนรูปได้ (ปรับขนาดที่ h-11 w-11 / สีที่ bg-moon-ink) -->
      <div v-if="!photoUrl" class="relative" :style="circleStyle">
        <label
          class="relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-moon-ink/20 bg-moon-card"
        >
          <img v-if="currentUrl" :src="currentUrl" alt="" class="absolute inset-0 h-full w-full object-cover">
          <FaIcon v-else name="user" class="h-[48%] w-[48%] text-moon-ink/15" />
          <input type="file" accept="image/*" class="hidden" @change="onPhotoSelected">
        </label>
        <!-- วางที่ขอบวงกลมทแยงขวาล่าง (14.6% = ตำแหน่งขอบวงกลมที่มุม 45 องศา ลบครึ่งหนึ่งของปุ่ม) กดทะลุไปโดนวงกลมข้างล่าง -->
        <span
          aria-hidden="true"
          class="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-full bg-moon-ink text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
          style="right: calc(14.6% - 22px); bottom: calc(14.6% - 22px)"
        >
          <FaIcon name="pencil" class="h-[18px] w-[18px]" />
        </span>
      </div>

      <!-- เลือกรูปแล้ว: ลากเลื่อน/บีบซูมได้ ส่วนนอกวงกลมถูกคลุมให้จาง -->
      <div
        v-else
        class="relative touch-none select-none overflow-hidden rounded-3xl bg-moon-card"
        :style="frameStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerEnd"
        @pointercancel="onPointerEnd"
        @wheel.prevent="onWheel"
      >
        <img
          ref="imgEl"
          :src="photoUrl"
          alt=""
          draggable="false"
          class="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
          :style="imgStyle"
          @load="onImageLoad"
        >
        <!-- วงกลมบอกส่วนที่จะตัด: เงาขนาดใหญ่รอบวงกลมคือแผ่นคลุมสีพื้นหลังที่ทำให้นอกวงกลมจาง -->
        <div
          class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          :style="{ ...circleStyle, boxShadow: '0 0 0 2px rgba(41,41,41,0.2), 0 0 0 999px rgba(255,253,252,0.78)' }"
        />
      </div>
    </div>

    <!-- ซ่อนไว้ตอนยังไม่เลือกรูป (แต่เก็บที่ไว้ ไม่ให้หน้าขยับ) -->
    <label
      class="mt-4 cursor-pointer text-sm font-medium text-moon-ink underline underline-offset-4"
      :class="{ invisible: !photoUrl }"
    >
      เปลี่ยนรูป
      <input type="file" accept="image/*" class="hidden" @change="onPhotoSelected">
    </label>
  </div>
</template>

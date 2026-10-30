<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-moon-bg to-moon-bg-end">
    <!-- ประกายดาวตอนอวตารลอยขึ้น (อยู่กลางจอ ตรงกับที่อวตารลอยอยู่) จางหายไปตอนอวตารเลื่อนลงมาวาง -->
    <div
      v-if="!isLoading"
      class="pointer-events-none fixed inset-0 z-20 transition-opacity duration-500"
      :class="stage === 'intro' ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    >
      <svg
        v-for="(s, i) in sparkles"
        :key="i"
        viewBox="0 0 24 24"
        class="sparkle absolute"
        :class="s.color"
        :style="{ left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)`, width: `${s.size}px`, height: `${s.size}px`, animationDelay: `${s.delay}s` }"
        fill="currentColor"
      >
        <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
      </svg>
    </div>

    <!-- แตะที่ไหนก็ได้เพื่อข้ามอนิเมชันตอนอวตารลอยขึ้น (ชั้นโปร่งใสคลุมทั้งจอ อยู่เฉพาะตอนอนิเมชันยังเล่นไม่จบ จบแล้วหายไป ปุ่มอื่นกดได้ปกติ)
         ใช้ชั้นคลุมทั้งจอแทนการดักที่หน้าหลัก เพราะปุ่มอวตารถูกปิดไว้ระหว่างอนิเมชัน (disabled) แตะตรงตัวอวตารจะไม่ส่งสัญญาณขึ้นมา -->
    <div
      v-if="!isLoading && stage !== 'done'"
      class="fixed inset-0 z-30"
      aria-hidden="true"
      @click="skipIntro"
    >
      <p class="absolute inset-x-0 bottom-10 text-center text-sm font-medium text-moon-ink/60">แตะที่ไหนก็ได้เพื่อข้าม</p>
    </div>

    <!-- ประกายดาวจางๆ ลอยกระจายทั่วหน้าจอตลอดเวลา (อยู่หลังเนื้อหา) -->
    <div class="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <svg
        v-for="(s, i) in ambientSparkles"
        :key="i"
        viewBox="0 0 24 24"
        class="ambient absolute"
        :class="s.color"
        :style="{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, '--op': s.op, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }"
        fill="currentColor"
      >
        <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
      </svg>
    </div>

    <div v-if="!isLoading" class="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-6 pt-10 pb-6 text-center">
      <!-- อวตารลอยลงมาวางที่ตำแหน่งของมัน แล้วข้อความค่อยขึ้นข้างใต้ (ไม่มีกรอบการ์ดครอบ) -->
      <div class="relative w-full max-w-[340px] px-2 pt-6">
        <h1
          class="relative text-lg font-semibold leading-8 text-moon-ink transition-all duration-700"
          :class="stage === 'done' ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
        >
          ยินดีด้วย!<br>{{ nickname }} ได้อวตารตัวจิ๋วแล้ว
        </h1>

        <!-- อวตาร: ตอนเริ่มถูกเลื่อนไปกลางจอ (ตัวใหญ่ขึ้นนิดหน่อย) แล้วค่อยเลื่อนกลับมาวางที่ของมัน -->
        <div ref="avatarRef" class="relative mx-auto mt-6 aspect-square w-[200px]" :style="avatarStyle">
          <!-- ตัวที่กดได้: ขยับขึ้นลง/เอียงเบาๆ ตลอด (แยกจาก div ด้านนอกที่ใช้เลื่อนตอนแอนิเมชันเริ่ม) -->
          <button
            type="button"
            class="avatar-float absolute inset-0 block cursor-pointer"
            aria-label="ดูอวตารขนาดใหญ่"
            :disabled="stage !== 'done'"
            @click="isZoomed = true"
          >
            <div class="absolute inset-[-12%] rounded-full bg-moon-pink/60 blur-[36px]" />
            <!-- รูปอวตารมีพื้นหลังเป็นสี่เหลี่ยม เลยมนมุมให้ดูนุ่มนวล -->
            <div
              class="avatar-frame absolute inset-0 overflow-hidden"
              :class="stage === 'done' ? 'avatar-frame-on' : ''"
            >
              <!-- ฉากอวตารตัวเดียวกับหน้าแรก: หูกระดิก ตัวหายใจเบาๆ (ดู components/AvatarScene.vue) -->
              <AvatarScene :layers="avatarLayers" @layer-error="hideLayer" />
            </div>
          </button>
        </div>

        <!-- สรุปคำตอบ: หัวข้อตัวเล็ก + คำตอบตัวใหญ่ (พี่เบอร์รี่ว่าตัวหนังสือเล็กไป และโชว์แค่ตัวเลือกแล้วอ่านแปลกๆ) -->
        <div
          v-if="summaryItems.length"
          class="relative mt-7 flex flex-col gap-3 rounded-2xl border border-white/80 bg-moon-card/45 px-5 py-4 text-left shadow-[0_8px_24px_color-mix(in_srgb,var(--color-coral)_12%,transparent)] backdrop-blur-md transition-all delay-150 duration-700"
          :class="stage === 'done' ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
        >
          <div v-for="item in summaryItems" :key="item.label" class="flex flex-col">
            <span class="text-xs font-medium leading-5 text-moon-muted">{{ item.label }}</span>
            <span class="text-[15px] font-medium leading-6 text-moon-ink">{{ item.text }}</span>
          </div>
        </div>
      </div>

      <!-- ส่วนด้านล่างการ์ด (แชร์ + เป้าหมาย) โผล่หลังการ์ดเสร็จ -->
      <div
        class="flex w-full max-w-[340px] flex-col transition-opacity duration-500"
        :class="stage === 'done' ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <!-- ปุ่มแชร์: แคปซูลดำชิดขวา ตาม Figma (แชร์เป็นรูปการ์ดทั้งใบ) -->
        <button
          type="button"
          class="mt-5 flex items-center gap-2.5 self-end rounded-full bg-moon-ink py-[5px] pl-[5px] pr-3 text-xl font-medium text-white disabled:opacity-60"
          :disabled="isSharing"
          @click="share"
        >
          <span class="flex items-center rounded-full bg-moon-card p-[5px]">
            <FaIcon name="arrow-up-from-bracket" class="h-5 w-[17px] text-moon-ink" />
          </span>
          แชร์
        </button>

        <!-- เลือกเป้าหมายแล้ว: แสดงเป้าหมายที่เลือก กดเพื่อเปลี่ยนได้ -->
        <button
          v-if="hasConfirmedGoal"
          type="button"
          class="mt-4 w-full rounded-2xl border border-moon-pink-soft bg-moon-card p-4 text-left"
          @click="isSheetOpen = true"
        >
          <p class="text-sm font-medium text-moon-ink">
            เป้าหมายของคุณ
          </p>
          <p class="mt-1 text-xs font-normal text-moon-muted">
            {{ selectedGoalTitles.join(' • ') }}
          </p>
        </button>
      </div>
    </div>

    <div
      class="relative z-10 px-9 pb-[calc(2.4rem+env(safe-area-inset-bottom))] transition-opacity duration-500"
      :class="stage === 'done' || isLoading ? 'opacity-100' : 'pointer-events-none opacity-0'"
    >
      <BaseButton
        :label="hasConfirmedGoal ? 'เริ่มใช้งาน' : 'เลือกเป้าหมาย'"
        :disabled="isLoading"
        @click="hasConfirmedGoal ? start() : (isSheetOpen = true)"
      />
    </div>

    <div
      v-if="isSheetOpen"
      class="fixed inset-0 z-30 bg-moon-ink/30"
      @click="isSheetOpen = false"
    />

    <!-- แผ่นเลือกเป้าหมาย: พื้นขาว มุมบนโค้ง 24 มีแถบจับด้านบน ตาม Figma -->
    <div
      class="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[70vh] max-w-[430px] flex-col rounded-t-3xl bg-moon-card shadow-xl transition-transform duration-300 ease-out"
      :class="isSheetOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full'"
    >
      <div class="flex items-center justify-between px-9 pt-5">
        <div class="mx-auto h-1 w-10 rounded-sm bg-moon-handle" />
      </div>

      <div class="flex items-start justify-between gap-3 px-9 pt-3">
        <h2 class="text-lg font-semibold text-moon-ink">
          เลือกเป้าหมายที่คุณอยากปรับเปลี่ยนได้เลย
        </h2>
        <button
          type="button"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-moon-pink-soft"
          aria-label="ปิด"
          @click="isSheetOpen = false"
        >
          <FaIcon name="xmark" class="h-4 w-4 text-moon-muted" />
        </button>
      </div>

      <p class="px-9 pt-1.5 text-xs font-normal text-moon-muted">
        ระยะเวลาในการทำ 28 วัน
      </p>

      <div class="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto px-9 pb-4">
        <button
          v-for="goal in goalTypes"
          :key="goal.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.98]"
          :class="selectedGoalIds.includes(goal.id)
            ? 'border-moon-period bg-moon-card'
            : 'border-moon-pink-soft bg-moon-card'"
          @click="toggleGoal(goal.id)"
        >
          <span class="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span class="text-base font-medium text-moon-ink">{{ goal.title }}</span>
            <span
              v-if="recommendedGoalCodes.has(goal.goal_code)"
              class="flex flex-shrink-0 items-center gap-1 rounded-full bg-moon-lavender-soft px-3 py-0.5 text-sm font-normal text-moon-ink"
            >
              แนะนำ
              <!-- ประกายดาว 4 แฉก (ใหญ่ 1 + เล็ก 1) วาดเอง ไม่ใช่ไอคอนจาก Font Awesome -->
              <svg viewBox="0 0 28 28" class="h-4 w-4 text-moon-coral" fill="currentColor" aria-hidden="true">
                <path d="M11 7 Q12.8 15.2 21 17 Q12.8 18.8 11 27 Q9.2 18.8 1 17 Q9.2 15.2 11 7Z" />
                <path d="M22 1 Q22.9 5.1 27 6 Q22.9 6.9 22 11 Q21.1 6.9 17 6 Q21.1 5.1 22 1Z" />
              </svg>
            </span>
          </span>
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
            :class="selectedGoalIds.includes(goal.id) ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
          >
            <FaIcon name="check" v-if="selectedGoalIds.includes(goal.id)" class="text-white h-3 w-3" />
          </span>
        </button>
      </div>

      <div class="px-9 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <BaseButton
          label="ถัดไป"
          :loading="isSavingGoals"
          :disabled="selectedGoalIds.length === 0"
          @click="confirmGoals"
        />
      </div>
    </div>

    <!-- ดูอวตารขนาดใหญ่: กดที่ว่างๆ (พื้นมืด) เพื่อปิด / กดที่ตัวอวตารเองจะไม่ปิด -->
    <Transition name="zoom">
      <div
        v-if="isZoomed"
        class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-moon-ink/45 backdrop-blur-sm"
        @click="isZoomed = false"
      >
        <div class="zoom-card relative aspect-square w-[min(88vw,380px)]" @click.stop>
          <div class="avatar-float absolute inset-0">
            <div class="absolute inset-0 overflow-hidden rounded-[28px] shadow-[0_20px_60px_color-mix(in_srgb,var(--color-coral)_45%,transparent)]">
              <AvatarScene :layers="avatarLayers" />
            </div>
          </div>
        </div>
        <p class="text-sm font-normal text-white/80">
          แตะที่ว่างๆ เพื่อปิด
        </p>
      </div>
    </Transition>

    <div
      v-if="toastMessage"
      class="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6"
    >
      <div class="rounded-full bg-moon-ink px-4 py-2 text-[13px] font-normal text-white shadow-lg">
        {{ toastMessage }}
      </div>
    </div>
    <!-- กำลังบันทึกเป้าหมาย / กำลังสร้างรูปแชร์ -> กระต่ายรอโหลดเต็มจอ -->
    <LoadingOverlay v-if="isSavingGoals" text="กำลังบันทึก..." />
    <LoadingOverlay v-else-if="isSharing" text="กำลังสร้างรูปแชร์..." />
  </div>
</template>

<script setup lang="ts">
interface GoalType {
  id: number
  goal_code: string
  feature_slot: string
  title: string
  display_order: number
}

const RECOMMENDATION_MAP: Record<string, string> = {
  eye_exhausted: 'sleep_schedule',
  ear_droop: 'exercise_routine',
  body_caramel: 'reduce_sugar',
  fx_shivering_cold: 'reduce_cold_drinks'
}

const isLoading = ref(true)
const authUserId = ref<string | null>(null)
const profileId = ref<number | null>(null)
const nickname = ref('')

const avatarState = ref<{ eyes: string | null, ears: string | null, body_color: string | null, fx_overlay: string | null }>({
  eyes: null,
  ears: null,
  body_color: null,
  fx_overlay: null
})

// ข้อความคำตอบล้วนๆ จาก avatar_question_options.result_description (key = result_asset_code)
const answerDescriptions = ref<Record<string, string>>({})

// สรุปคำตอบ: เรียงตามลำดับคำถามในแบบสอบถาม แต่ละบรรทัดมี "หัวข้อ" กำกับ ผู้ใช้จะรู้ว่าคำตอบนี้มาจากคำถามเรื่องอะไร
// (เดิมโชว์แค่ตัวเลือกล้วนๆ เช่น "ทานบ่อยสัปดาห์ละ 3-4 วัน" อ่านแล้วไม่รู้ว่าทานอะไร)
// หัวข้อตรงกับคำถาม: eyes = เวลาเข้านอน / ears = ออกกำลังกาย / body_color = ของหวานและน้ำหวาน / fx_overlay = การดื่มน้ำ
const SUMMARY_TOPICS: { slot: keyof typeof avatarState.value, label: string }[] = [
  { slot: 'eyes', label: 'การนอนหลับ' },
  { slot: 'ears', label: 'การออกกำลังกาย' },
  { slot: 'body_color', label: 'ของหวานและน้ำหวาน' },
  { slot: 'fx_overlay', label: 'การดื่มน้ำ' }
]

const summaryItems = computed(() => {
  const items: { label: string, text: string }[] = []
  for (const { slot, label } of SUMMARY_TOPICS) {
    const code = avatarState.value[slot]
    const text = code ? answerDescriptions.value[code] : undefined
    if (text) items.push({ label, text })
  }
  return items
})

const avatarLayers = computed(() => [
  // เรียงตามลำดับ DOM: ตัวแรกอยู่ล่างสุด ตัวสุดท้ายอยู่บนสุด
  { slot: 'fx_overlay', code: avatarState.value.fx_overlay },
  { slot: 'ears', code: avatarState.value.ears },
  { slot: 'eyes', code: avatarState.value.eyes },
  { slot: 'body_color', code: avatarState.value.body_color }
])

const hiddenLayers = ref<Record<string, boolean>>({})
function hideLayer(slot: string) {
  hiddenLayers.value[slot] = true
}

const recommendedGoalCodes = computed(() => {
  const codes = new Set<string>()
  for (const code of Object.values(avatarState.value)) {
    const recommended = code ? RECOMMENDATION_MAP[code] : undefined
    if (recommended) codes.add(recommended)
  }
  return codes
})

const goalTypes = ref<GoalType[]>([])
const selectedGoalIds = ref<number[]>([])
const hasConfirmedGoal = ref(false)
const isSheetOpen = ref(false)
const isSavingGoals = ref(false)

const selectedGoalTitles = computed(() =>
  goalTypes.value.filter(g => selectedGoalIds.value.includes(g.id)).map(g => g.title)
)

const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

// ===== จังหวะแอนิเมชันตอนได้การ์ด =====
// intro  = อวตารล้วนๆ ลอยขึ้นกลางจอพร้อมประกาย
// settle = อวตารเลื่อนลงมาวางในการ์ด พื้นการ์ดค่อยๆ โผล่
// done   = ข้อความขึ้นข้างใต้ ปุ่มต่างๆ โผล่
type Stage = 'intro' | 'settle' | 'done'
const stage = ref<Stage>('intro')

const INTRO_SCALE = 1.35 // ตอนอยู่กลางจอ ให้ตัวใหญ่ขึ้นนิดหน่อย
const avatarRef = ref<HTMLElement | null>(null)
const introOffset = ref({ dx: 0, dy: 0 }) // ระยะที่ต้องเลื่อนจากที่ของมันในการ์ด ไปกลางจอ
const introStarted = ref(false) // false = ยังอยู่ต่ำลงมาและจาง, true = ลอยขึ้นมาถึงกลางจอแล้ว
let stageTimers: ReturnType<typeof setTimeout>[] = []

const avatarStyle = computed(() => {
  if (stage.value !== 'intro') {
    // เลื่อนกลับมาที่การ์ด
    return { transform: 'none', opacity: 1, transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)' }
  }
  const { dx, dy } = introOffset.value
  if (!introStarted.value) {
    // จุดเริ่ม: อยู่ต่ำกว่ากลางจอเล็กน้อยและยังมองไม่เห็น
    return { transform: `translate(${dx}px, ${dy + 56}px) scale(${INTRO_SCALE})`, opacity: 0, transition: 'none' }
  }
  // ค่อยๆ ลอยขึ้นมากลางจอ
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${INTRO_SCALE})`,
    opacity: 1,
    transition: 'transform 1400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 900ms ease-out'
  }
})

// ตำแหน่งประกายรอบอวตาร (px จากกลางจอ) — สีใช้โทนเดียวกับแอป
const sparkles = [
  { x: -120, y: -70, size: 22, delay: 0.2, color: 'text-moon-coral' },
  { x: 110, y: -110, size: 28, delay: 0.5, color: 'text-moon-lavender' },
  { x: -150, y: 40, size: 16, delay: 0.9, color: 'text-moon-period-predicted' },
  { x: 140, y: 30, size: 20, delay: 0.35, color: 'text-moon-coral' },
  { x: -60, y: -150, size: 14, delay: 1.1, color: 'text-moon-lavender' },
  { x: 50, y: 140, size: 18, delay: 0.7, color: 'text-moon-period-predicted' },
  { x: -110, y: 130, size: 24, delay: 1.3, color: 'text-moon-lavender' },
  { x: 160, y: -10, size: 12, delay: 1.0, color: 'text-moon-coral' }
]

// ประกายที่ลอยทั่วหน้าจอ (ตำแหน่งเป็น % ของจอ, op = ความเข้มสูงสุด, dur/delay = วินาที)
// มีทั้งดวงเล็กและดวงใหญ่ วางไว้ตามขอบจอ/ช่องว่างข้างอวตาร และอยู่หลังเนื้อหา เลยไม่บังการ์ดกับข้อความ
// ใช้แค่โทนชมพู/ม่วงให้ไม่รก
const ambientSparkles = [
  { left: '3%', top: '5%', size: 30, dur: 9, delay: 0, color: 'text-moon-coral', op: 0.75 },
  { left: '88%', top: '4%', size: 20, dur: 8, delay: 1.5, color: 'text-moon-lavender', op: 0.95 },
  { left: '48%', top: '2%', size: 10, dur: 7, delay: 3.4, color: 'text-moon-period-predicted', op: 0.8 },
  { left: '12%', top: '22%', size: 16, dur: 8, delay: 2.6, color: 'text-moon-period-predicted', op: 0.8 },
  { left: '86%', top: '20%', size: 34, dur: 11, delay: 0.8, color: 'text-moon-coral', op: 0.65 },
  { left: '5%', top: '34%', size: 24, dur: 10, delay: 4.2, color: 'text-moon-lavender', op: 0.95 },
  { left: '90%', top: '36%', size: 12, dur: 7, delay: 2.2, color: 'text-moon-coral', op: 0.8 },
  { left: '15%', top: '44%', size: 9, dur: 8, delay: 5.5, color: 'text-moon-coral', op: 0.8 },
  { left: '2%', top: '60%', size: 14, dur: 9, delay: 1, color: 'text-moon-period-predicted', op: 0.8 },
  { left: '93%', top: '56%', size: 26, dur: 10, delay: 5, color: 'text-moon-lavender', op: 0.95 },
  { left: '4%', top: '78%', size: 32, dur: 11, delay: 2.8, color: 'text-moon-coral', op: 0.65 },
  { left: '92%', top: '76%', size: 14, dur: 8, delay: 0.4, color: 'text-moon-coral', op: 0.8 },
  { left: '10%', top: '92%', size: 10, dur: 7, delay: 3.6, color: 'text-moon-lavender', op: 0.95 },
  { left: '88%', top: '92%', size: 22, dur: 9, delay: 1.9, color: 'text-moon-period-predicted', op: 0.8 },
  { left: '30%', top: '96%', size: 8, dur: 8, delay: 4.6, color: 'text-moon-coral', op: 0.8 },
  { left: '66%', top: '95%', size: 12, dur: 9, delay: 0.2, color: 'text-moon-lavender', op: 0.95 }
]

let introStartAt = 0 // เวลาที่เริ่มอนิเมชัน (ไว้กันแตะข้ามเร็วเกินไป)
const SKIP_GUARD_MS = 400 // เริ่มอนิเมชันแล้วต้องผ่านเวลานี้ก่อนถึงจะแตะข้ามได้ (กันนิ้วที่ค้างมาจากหน้าก่อนหน้า)

// แตะข้ามอนิเมชัน: หยุดตัวจับเวลา แล้วกระโดดไปท่าสุดท้ายเลย (อวตารเลื่อนลงมาที่การ์ดนุ่มๆ ด้วย transition เดิม ข้อความขึ้นตามมา)
function skipIntro() {
  if (stage.value === 'done') return
  if (Date.now() - introStartAt < SKIP_GUARD_MS) return
  stageTimers.forEach(clearTimeout)
  stage.value = 'done'
  prepareCardImage() // เตรียมรูปการ์ดแชร์ไว้ เหมือนตอนอนิเมชันเล่นจนจบ
}

function startIntro() {
  // คนที่ตั้งค่าลดแอนิเมชันไว้ ข้ามไปแสดงการ์ดเลย
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stage.value = 'done'
    return
  }
  introStartAt = Date.now()

  // วัดตำแหน่งอวตารที่วางอยู่ในการ์ด แล้วคำนวณว่าต้องเลื่อนไปกลางจอเท่าไหร่
  const rect = avatarRef.value?.getBoundingClientRect()
  if (rect) {
    introOffset.value = {
      dx: window.innerWidth / 2 - (rect.left + rect.width / 2),
      dy: window.innerHeight / 2 - (rect.top + rect.height / 2)
    }
  }

  // รอ 2 เฟรมเพื่อให้เบราว์เซอร์วาดจุดเริ่มก่อน แล้วค่อยสั่งให้ลอยขึ้น
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      introStarted.value = true
    })
  })

  stageTimers = [
    setTimeout(() => { stage.value = 'settle' }, 2600),
    setTimeout(() => {
      stage.value = 'done'
      prepareCardImage() // เตรียมรูปการ์ดไว้ล่วงหน้า กดแชร์แล้วจะได้ไม่ต้องรอ
    }, 3500)
  ]
}

// ===== แชร์เป็นรูปการ์ด =====
// กดที่อวตารเพื่อดูขนาดใหญ่
const isZoomed = ref(false)
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') isZoomed.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const isSharing = ref(false)
let cardImagePromise: Promise<Blob | null> | null = null

function prepareCardImage() {
  if (!cardImagePromise) {
    cardImagePromise = renderAvatarCardImage({
      nickname: nickname.value,
      layerCodes: avatarLayers.value
        .filter(layer => layer.code && !hiddenLayers.value[layer.slot])
        .map(layer => layer.code as string)
    }).catch(() => null)
  }
  return cardImagePromise
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }

  authUserId.value = sessionData.session.user.id
  const authed = await getAuthedSupabaseClient()

  const { data: profile, error: profileError } = await authed
    .from('user_profiles')
    .select('id, nickname')
    .eq('auth_user_id', authUserId.value)
    .maybeSingle()

  if (!profile && !profileError) {
    // session exists but the profile row is gone (e.g. deleted during testing) -
    // treat as onboarding never finished, so start over instead of stranding
    // the user on a blank page
    await supabase.auth.signOut()
    navigateTo('/onboarding/signup')
    return
  }

  if (profileError || !profile) {
    stage.value = 'done'
    isLoading.value = false
    return
  }

  profileId.value = profile.id
  nickname.value = profile.nickname ?? ''

  const [avatarRowsRes, goalTypesRes, activeGoalsRes, answerOptionsRes] = await Promise.all([
    authed.from('user_avatar_state').select('feature_slot, current_asset_code').eq('user_id', profile.id),
    authed.from('goal_types').select('id, goal_code, feature_slot, title, display_order').order('display_order'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    authed.from('avatar_question_options').select('result_asset_code, result_description')
  ])

  for (const row of avatarRowsRes.data ?? []) {
    if (row.feature_slot in avatarState.value) {
      avatarState.value[row.feature_slot as keyof typeof avatarState.value] = row.current_asset_code
    }
  }

  answerDescriptions.value = Object.fromEntries(
    (answerOptionsRes.data ?? [])
      .filter(o => o.result_asset_code && o.result_description)
      .map(o => [o.result_asset_code, o.result_description])
  )

  goalTypes.value = goalTypesRes.data ?? []
  selectedGoalIds.value = (activeGoalsRes.data ?? []).map(g => g.goal_type_id)
  hasConfirmedGoal.value = selectedGoalIds.value.length > 0

  isLoading.value = false
  await nextTick()
  startIntro()
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  stageTimers.forEach(clearTimeout)
})

// แชร์รูปการ์ดทั้งใบ + ลิงก์ชวนเล่น (ตัวเดียวกับปุ่มแชร์หน้า home ดู shareAvatarCard ใน ~/utils/share-app.ts)
async function share() {
  if (isSharing.value) return
  isSharing.value = true

  try {
    const result = await shareAvatarCard(nickname.value, await prepareCardImage())
    if (result === 'copied') showToast('คัดลอกลิงก์แล้ว')
    else if (result === 'saved') showToast('บันทึกรูปการ์ดและคัดลอกลิงก์แล้ว')
  } finally {
    isSharing.value = false
  }
}

function toggleGoal(id: number) {
  if (selectedGoalIds.value.includes(id)) {
    selectedGoalIds.value = selectedGoalIds.value.filter(g => g !== id)
  } else {
    selectedGoalIds.value = [...selectedGoalIds.value, id]
  }
}

async function confirmGoals() {
  if (!profileId.value || selectedGoalIds.value.length === 0 || isSavingGoals.value) return
  isSavingGoals.value = true

  const authed = await getAuthedSupabaseClient()
  const today = new Date()
  const cycleEnd = new Date(today)
  cycleEnd.setDate(cycleEnd.getDate() + 27)

  const goalRows = selectedGoalIds.value.map(goalTypeId => ({
    user_id: profileId.value,
    goal_type_id: goalTypeId,
    is_active: true
  }))

  // upsert แทน insert: ตาราง user_goals ห้ามมี (ผู้ใช้, เป้าหมาย) ซ้ำกัน
  // ถ้าเคยเลือกเป้าหมายนี้ไว้แล้ว (เช่นบัญชีทดสอบ) จะบันทึกทับของเดิมแทนที่จะ error แล้วค้างอยู่หน้าเดิม
  const { error: goalsError } = await authed
    .from('user_goals')
    .upsert(goalRows, { onConflict: 'user_id,goal_type_id' })
  if (goalsError) {
    console.error('บันทึกเป้าหมายไม่สำเร็จ', goalsError)
    isSavingGoals.value = false
    showToast('บันทึกเป้าหมายไม่สำเร็จ ลองใหม่อีกครั้งนะ')
    return
  }

  // ถ้ามีรอบที่ยังไม่ claim อยู่แล้ว ให้ใช้รอบเดิมต่อ ไม่สร้างซ้ำ
  const { data: openCycle, error: openCycleError } = await authed
    .from('goal_cycles')
    .select('id')
    .eq('user_id', profileId.value)
    .is('claimed_at', null)
    .limit(1)
    .maybeSingle()

  if (openCycleError) {
    console.error('อ่านรอบเป้าหมายไม่สำเร็จ', openCycleError)
    isSavingGoals.value = false
    showToast('บันทึกเป้าหมายไม่สำเร็จ ลองใหม่อีกครั้งนะ')
    return
  }

  if (!openCycle) {
    const { error: cycleError } = await authed.from('goal_cycles').insert({
      user_id: profileId.value,
      cycle_start_date: getLocalDateString(today),
      cycle_end_date: getLocalDateString(cycleEnd)
    })

    if (cycleError) {
      console.error('สร้างรอบเป้าหมายไม่สำเร็จ', cycleError)
      isSavingGoals.value = false
      showToast('บันทึกเป้าหมายไม่สำเร็จ ลองใหม่อีกครั้งนะ')
      return
    }
  }

  isSavingGoals.value = false

  // บันทึกเป้าหมายเสร็จแล้วไปหน้าหลักเลย (ไม่ต้องกลับมากด "เริ่มใช้งาน" อีกที)
  navigateTo('/home')
}

function start() {
  if (!hasConfirmedGoal.value) return
  navigateTo('/home')
}
</script>

<style scoped>
/* ประกายดาว: โผล่ขึ้นมา หมุนเล็กน้อย แล้วลอยขึ้นและจางหาย วนซ้ำระหว่างอวตารลอยขึ้น */
.sparkle {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  animation: sparkle-float 1.9s ease-out infinite;
}

@keyframes sparkle-float {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(0deg);
  }
  35% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1) rotate(30deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -150%) scale(0.4) rotate(80deg);
  }
}

/* ประกายจางๆ ลอยทั่วจอ: ค่อยๆ ปรากฏ หมุนเบาๆ ลอยขึ้น แล้วจางหาย แต่ละดวงเริ่มไม่พร้อมกัน */
.ambient {
  opacity: 0;
  animation-name: ambient-float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes ambient-float {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5) rotate(0deg);
  }
  30%,
  70% {
    opacity: var(--op);
  }
  100% {
    opacity: 0;
    transform: translateY(-70px) scale(1) rotate(70deg);
  }
}

/* กรอบอวตาร: ตอนอยู่กลางจอ (intro/settle) ไม่มีกรอบ ไม่มีเงา พอวางที่เสร็จ (done) ค่อยๆ มีมุมมนกับเงาขึ้นมา */
.avatar-frame {
  border-radius: 0;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--color-coral) 0%, transparent);
  transition: border-radius 0.7s ease, box-shadow 0.7s ease;
}

.avatar-frame-on {
  border-radius: 22px;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--color-coral) 30%, transparent);
}

/* อวตารขยับขึ้นลงและเอียงเบาๆ ให้ดูมีชีวิต */
.avatar-float {
  animation: avatar-bob 4.2s ease-in-out infinite;
}

@keyframes avatar-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-1.2deg);
  }
  50% {
    transform: translateY(-7px) rotate(1.2deg);
  }
}

/* ตอนเปิด/ปิดหน้าขยาย: พื้นมืดค่อยๆ ขึ้น ตัวอวตารเด้งใหญ่ขึ้นมา */
.zoom-enter-active,
.zoom-leave-active {
  transition: opacity 0.25s ease;
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
}

.zoom-enter-active .zoom-card {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.zoom-leave-active .zoom-card {
  transition: transform 0.2s ease;
}

.zoom-enter-from .zoom-card {
  transform: scale(0.6);
}

.zoom-leave-to .zoom-card {
  transform: scale(0.85);
}

/* คนที่ตั้งค่าลดแอนิเมชันไว้ ให้ประกายนิ่งๆ ไม่ขยับ */
@media (prefers-reduced-motion: reduce) {
  .ambient,
  .sparkle,
  .avatar-float {
    animation: none;
  }

  .ambient {
    opacity: 0.3;
  }
}
</style>

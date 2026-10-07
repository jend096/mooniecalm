<script setup lang="ts">
import type { PeriodRow } from '~/utils/period-prediction'
// import ตรงๆ เพื่อให้ชัวร์ (ฟังก์ชันใหม่ที่เพิ่งเพิ่ม Nuxt บางทียังไม่รู้จักจนกว่าจะรีสตาร์ต dev server)
import { estimateCycleLength, getDayKind } from '~/utils/period-prediction'

interface GoalType {
  id: number
  goal_code: string
  title: string
}

const GOAL_CODE_TO_COLUMN: Record<string, string> = {
  sleep_schedule: 'slept_on_time',
  exercise_routine: 'exercised',
  reduce_sugar: 'avoided_sugar',
  reduce_cold_drinks: 'avoided_cold_drinks'
}

const CYCLE_LENGTH_DAYS = 28
const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MS_PER_DAY = 86400000

// แปลงสตริง YYYY-MM-DD เป็น Date โดยอิงเวลาท้องถิ่น (ไม่โดนชิฟต์เป็น UTC)
// function parseLocalDate(dateStr: string) {
//  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number]
//   return new Date(y, m - 1, d)
// }

// function startOfDay(d: Date) {
//   return new Date(d.getFullYear(), d.getMonth(), d.getDate())
// }

const isLoading = ref(true)
const nickname = ref('')
const profileImageUrl = ref('')

const avatarState = ref<{ eyes: string | null, ears: string | null, body_color: string | null, fx_overlay: string | null }>({
  eyes: null,
  ears: null,
  body_color: null,
  fx_overlay: null
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

const activeGoals = ref<GoalType[]>([])
const cycleStartDate = ref<string | null>(null)
const checkedGoals = ref<Record<string, boolean>>({})

// คำนวณวันที่กำลังทำอยู่: วันแรกเริ่มที่ วันที่ 1 จนถึง วันที่ 28
const daysLogged = computed(() => {
  if (!cycleStartDate.value) return 1
  const start = parseLocalDate(cycleStartDate.value)
  const today = startOfDay(new Date())
  const diffDays = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY)
  const dayNumber = diffDays + 1
  return Math.min(CYCLE_LENGTH_DAYS, Math.max(1, dayNumber))
})

const progressPercent = computed(() => Math.min(100, Math.round((daysLogged.value / CYCLE_LENGTH_DAYS) * 100)))

// period calendar
const lastPeriodDate = ref<string | null>(null)
const periodDurationDays = ref<number | null>(null)
const cycleDurationDays = ref<number | null>(null)

function dayInCycle(d: Date): number | null {
  if (!lastPeriodDate.value || !cycleDurationDays.value) return null
  const cycleLength = effectiveCycleDays.value // ความยาวรอบที่ใช้จริง (เฉลี่ยจากประวัติ)
  const start = parseLocalDate(lastPeriodDate.value)
  const target = startOfDay(d)
  const diffDays = Math.round((target.getTime() - start.getTime()) / MS_PER_DAY)
  return ((diffDays % cycleLength) + cycleLength) % cycleLength
}

const hasPeriodData = computed(() => !!lastPeriodDate.value && !!periodDurationDays.value && !!cycleDurationDays.value)

// แถบวัน: วันนี้ ± 15 วัน เลื่อนดูได้ ใช้ตัวตัดสินสีตัวเดียวกับหน้าปฏิทิน (สีทึบ = มาจริง, เส้นประ = คาดไว้)
const STRIP_RADIUS = 15
const periodStrip = computed(() => {
  const today = startOfDay(new Date())
  return Array.from({ length: STRIP_RADIUS * 2 + 1 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + (i - STRIP_RADIUS))
    return {
      date: d,
      key: getLocalDateString(d),
      dayNumber: d.getDate(),
      weekday: WEEKDAY_SHORT[d.getDay()],
      isToday: i === STRIP_RADIUS,
      kind: getDayKind(d, allRows.value, periodDurationDays.value ?? 5, effectiveCycleDays.value)
    }
  })
})

const prediction = computed(() => {
  if (!lastPeriodDate.value || !cycleDurationDays.value) return null
  return predictNextPeriod(lastPeriodDate.value, effectiveCycleDays.value)
})

const periodStatusText = computed(() => {
  if (!hasPeriodData.value) return ''
  if (prediction.value?.isLate) {
    return `ประจำเดือนเลยกำหนดมา ${prediction.value.daysLate} วันแล้ว`
  }

  const todayCycleDay = dayInCycle(new Date())
  if (todayCycleDay === null || !periodDurationDays.value || !cycleDurationDays.value) return ''

  if (todayCycleDay < periodDurationDays.value) {
    return `อยู่ในช่วงประจำเดือน (วันที่ ${todayCycleDay + 1})`
  }

  const daysUntilNext = effectiveCycleDays.value - todayCycleDay
  return `ประจำเดือนคุณจะมาในอีก ${daysUntilNext} วัน`
})

// ---------- รอบประจำเดือนที่บันทึกไว้ + เมนูตอนกดวัน ----------
const profileId = ref<number | null>(null) // id ผู้ใช้ (ตั้งค่าใน onMounted ด้านล่าง)
const profileLastPeriod = ref<string | null>(null) // วันเริ่มจาก onboarding (ใช้ถ้ายังไม่เคยบันทึกในตาราง)
const savedRows = ref<PeriodRow[]>([]) // แถวจากตาราง period_cycles
const selectedDate = ref<Date | null>(null) // วันที่ผู้ใช้กดในแถบ (มีค่า = เมนูเปิดอยู่)
const periodMessage = ref('') // ข้อความบอกผลหลังบันทึก
const stripRef = ref<HTMLElement | null>(null) // กล่องแถบวัน ไว้เลื่อนไปหาวันนี้

// แถวที่ใช้แสดงผล: ถ้ายังไม่เคยบันทึกในตาราง ให้ใช้วันเริ่มจาก onboarding เป็นรอบแรก
const allRows = computed<PeriodRow[]>(() => {
  if (savedRows.value.length > 0) return savedRows.value
  if (profileLastPeriod.value) {
    return [{ cycle_start_date: profileLastPeriod.value, confirmed_end_date: null, predicted_start_date: null }]
  }
  return []
})

// ความยาวรอบที่ใช้จริง: เฉลี่ยจากรอบที่ผู้ใช้บันทึกไว้ (ถ้ายังไม่พอ ใช้ค่าจากโปรไฟล์ หรือ 28)
const effectiveCycleDays = computed(() =>
  estimateCycleLength(allRows.value.map(r => r.cycle_start_date), cycleDurationDays.value ?? 28)
)

// โหลดรอบประจำเดือนทั้งหมดใหม่ แล้วอัปเดตวันเริ่มรอบล่าสุดที่ใช้คำนวณ
async function loadPeriodRows() {
  if (profileId.value === null) return
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from('period_cycles')
    .select('id, cycle_start_date, confirmed_end_date, predicted_start_date')
    .eq('user_id', profileId.value)
    .order('cycle_start_date', { ascending: true })
  savedRows.value = (data ?? []) as PeriodRow[]
  lastPeriodDate.value = savedRows.value.at(-1)?.cycle_start_date ?? profileLastPeriod.value
}

// ---------- ลากแถบวันด้วยเมาส์ (บนมือถือปัดนิ้วได้อยู่แล้ว) ----------
let dragStartX = 0 // ตำแหน่งเมาส์ตอนเริ่มลาก
let dragStartScroll = 0 // ตำแหน่งแถบตอนเริ่มลาก
let isDragging = false // กำลังกดเมาส์ค้างอยู่ไหม
let didDrag = false // ลากไกลพอจะนับว่า "ลาก" ไหม (ถ้าใช่ ปล่อยแล้วไม่นับเป็นการกด)

function onStripPointerDown(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !stripRef.value) return
  isDragging = true
  didDrag = false
  dragStartX = e.clientX
  dragStartScroll = stripRef.value.scrollLeft
}
function onStripPointerMove(e: PointerEvent) {
  if (!isDragging || !stripRef.value) return
  const moved = e.clientX - dragStartX
  if (Math.abs(moved) > 5) didDrag = true
  stripRef.value.scrollLeft = dragStartScroll - moved // ลากไปทางซ้าย = แถบเลื่อนไปทางขวา
}
function onStripPointerEnd() {
  isDragging = false
}

// กดวัน (ถ้าเพิ่งลากมา ไม่ต้องเปิดเมนู)
function onDayClick(date: Date) {
  if (didDrag) {
    didDrag = false
    return
  }
  openDay(date)
}

// ---------- ชื่อเดือนข้างแถบวัน (เปลี่ยนตามวันที่อยู่กลางแถบตอนเลื่อน) ----------
function monthLabel(d: Date): string {
  return `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
const visibleMonthLabel = ref(monthLabel(new Date()))

function updateVisibleMonth() {
  const el = stripRef.value
  const first = el?.firstElementChild as HTMLElement | null
  if (!el || !first) return
  const itemWidth = first.offsetWidth + 12 // 12px = ช่องว่างระหว่างแคปซูล (gap-3)
  const centerIndex = Math.floor((el.scrollLeft + el.clientWidth / 2) / itemWidth)
  const day = periodStrip.value[Math.min(periodStrip.value.length - 1, Math.max(0, centerIndex))]
  if (day) visibleMonthLabel.value = monthLabel(day.date)
}

function openDay(date: Date) {
  periodMessage.value = ''
  selectedDate.value = date
}

// เมนูบันทึกสำเร็จ -> โหลดใหม่ ปิดเมนู แสดงข้อความ
async function onPeriodChanged(text: string) {
  await loadPeriodRows()
  periodMessage.value = text
  selectedDate.value = null
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }

  const authUserId = sessionData.session.user.id
  const authed = await getAuthedSupabaseClient()

  const { data: profile, error: profileError } = await authed
    .from('user_profiles')
    .select('id, nickname, profile_image_url, last_period_date, period_duration_days, cycle_duration_days')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!profile && !profileError) {
    await supabase.auth.signOut()
    navigateTo('/onboarding/signup')
    return
  }

  if (profileError || !profile) {
    isLoading.value = false
    return
  }
  profileId.value = profile.id
  profileLastPeriod.value = profile.last_period_date ?? null
  nickname.value = profile.nickname ?? ''
  profileImageUrl.value = profile.profile_image_url ?? ''
  lastPeriodDate.value = profile.last_period_date ?? null
  periodDurationDays.value = profile.period_duration_days ?? null
  cycleDurationDays.value = profile.cycle_duration_days ?? null

  const today = getLocalDateString()
  const [avatarRowsRes, goalTypesRes, userGoalsRes, cycleRes, checkinRes, periodRowsRes] = await Promise.all([
    // 1) ชิ้นส่วนอวตารของผู้ใช้
    authed.from('user_avatar_state').select('feature_slot, current_asset_code').eq('user_id', profile.id),
    // 2) รายการเป้าหมายทั้งหมด
    authed.from('goal_types').select('id, goal_code, title'),
    // 3) เป้าหมายที่ผู้ใช้เลือกไว้
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    // 4) รอบเป้าหมาย 28 วันที่ยังไม่กดรับผล
    authed
      .from('goal_cycles')
      .select('cycle_start_date, cycle_end_date, claimed_at')
      .eq('user_id', profile.id)
      .is('claimed_at', null)
      .order('cycle_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // 5) เช็คอินของวันนี้
    authed.from('daily_checkins').select('*').eq('user_id', profile.id).eq('checkin_date', today).maybeSingle(),
    // 6) รอบประจำเดือนทั้งหมดที่บันทึกไว้ (เรียงจากเก่าไปใหม่)
    authed
      .from('period_cycles')
      .select('id, cycle_start_date, confirmed_end_date, predicted_start_date')
      .eq('user_id', profile.id)
      .order('cycle_start_date', { ascending: true })
  ])

  // ถ้ามีรอบประจำเดือนที่บันทึกไว้ ให้ใช้วันเริ่มรอบล่าสุดแทนค่าจากโปรไฟล์
  savedRows.value = (periodRowsRes.data ?? []) as PeriodRow[]
  if (savedRows.value.length > 0) {
    lastPeriodDate.value = savedRows.value.at(-1)!.cycle_start_date
  }
  for (const row of avatarRowsRes.data ?? []) {
    if (row.feature_slot in avatarState.value) {
      avatarState.value[row.feature_slot as keyof typeof avatarState.value] = row.current_asset_code
    }
  }

  const goalTypeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  activeGoals.value = (userGoalsRes.data ?? [])
    .map(g => goalTypeById.get(g.goal_type_id))
    .filter((g): g is GoalType => !!g)

  cycleStartDate.value = cycleRes.data?.cycle_start_date ?? today

  for (const goal of activeGoals.value) {
    const column = GOAL_CODE_TO_COLUMN[goal.goal_code]
    checkedGoals.value[goal.goal_code] = column ? Boolean(checkinRes.data?.[column]) : false
  }

  isLoading.value = false

  // รอให้หน้าวาดเสร็จ แล้วเลื่อนแถบวันให้วันนี้อยู่ตรงกลาง
  await nextTick()
  stripRef.value?.querySelector('[data-today]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  updateVisibleMonth()
})

const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

async function share() {
  if (await shareApp(nickname.value) !== 'copied') return
  toastMessage.value = 'คัดลอกลิงก์แล้ว'
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

function goToCheckin() {
  navigateTo('/checkin')
}

async function logout() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  navigateTo('/')
}

</script>

<template>
  <div v-if="!isLoading" class="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white px-6 pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))]">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <img
          v-if="profileImageUrl"
          :src="profileImageUrl"
          alt=""
          class="h-10 w-10 flex-shrink-0 rounded-full object-cover"
        >
        <div v-else class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
          <svg class="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.4" />
            <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </div>
        <h1 class="font-['Anuphan'] text-[24px] font-semibold text-slate-900">
          สวัสดี {{ nickname }}
        </h1>
      </div>
      <button
        type="button"
        class="flex-shrink-0 rounded-full bg-white px-3 py-1.5 font-['Anuphan'] text-[12px] font-medium text-slate-500 shadow-sm"
        @click="logout"
      >
        ออกจากระบบ
      </button>
    </div>

        <div v-if="hasPeriodData" class="mt-6">
      <!-- แถวบน: ชื่อเดือน (ซ้าย) + ปุ่มเปิดหน้าปฏิทินเต็ม (ขวา) -->
      <div class="flex items-center justify-between gap-3">
        <!-- ชื่อเดือน/ปี ของวันที่อยู่กลางแถบ -->
        <p class="font-['Anuphan'] text-[18px] font-semibold text-moon-ink">{{ visibleMonthLabel }}</p>
        <button
          type="button"
          class="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-5 font-['Anuphan'] text-[15px] font-semibold text-moon-ink shadow-sm transition active:scale-95"
          @click="navigateTo('/calendar')"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          ปฏิทิน
        </button>
      </div>

      <!-- แถบวัน: แคปซูลสีขาวทีละวัน เลื่อนซ้าย-ขวาได้ กดวันไหนก็มีเมนูถามว่าประจำเดือนมา/หมดไหม -->
      <div
        ref="stripRef"
        class="mt-4 flex cursor-grab select-none gap-3 overflow-x-auto pb-1 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        @pointerdown="onStripPointerDown"
        @pointermove="onStripPointerMove"
        @pointerup="onStripPointerEnd"
        @pointerleave="onStripPointerEnd"
        @scroll="updateVisibleMonth"
      >
        <button
          v-for="day in periodStrip"
          :key="day.key"
          type="button"
          :data-today="day.isToday ? '' : undefined"
          class="flex shrink-0 basis-[calc((100%-3rem)/5)] flex-col items-center gap-2 rounded-full bg-white px-1 pb-2 pt-3 shadow-sm transition active:scale-95"
          @click="onDayClick(day.date)"
        >
          <!-- ตัวย่อวัน จ อ พ ... อยู่เหนือตัวเลข -->
          <span class="font-['Anuphan'] text-[15px] font-medium text-moon-ink">{{ day.weekday }}</span>
          <!-- วงกลมตัวเลข: วันนี้ = แดงเข้ม, วันที่มีประจำเดือน = แดงอ่อน, คาดไว้ = เส้นประแดงเข้ม, วันธรรมดา = เทาอ่อน -->
          <span
            class="flex h-11 w-11 items-center justify-center rounded-full font-['Anuphan'] text-[17px] font-medium"
            :class="{
              'bg-[var(--color-period-deep)] text-white': day.isToday,
              'bg-[var(--color-period-soft)] text-moon-ink': !day.isToday && day.kind === 'logged',
              'border-2 border-dashed border-[color:var(--color-period-deep)] text-moon-ink': !day.isToday && day.kind === 'predicted',
              'bg-slate-100 text-moon-ink': !day.isToday && day.kind === 'none'
            }"
          >
            {{ day.dayNumber }}
          </span>
        </button>
      </div>

      <!-- ข้อความสถานะ -->
      <div class="mt-4 flex justify-center">
        <p class="rounded-full border border-moon-pink bg-white/90 px-5 py-3 text-center font-['Anuphan'] text-[15px] font-medium text-moon-ink">
          แสดงสถานะ: {{ periodStatusText }}
        </p>
      </div>

      <p class="mt-2 text-center font-['Anuphan'] text-[11px] text-slate-400">แตะที่วันเพื่อบอกว่าประจำเดือนมา/หมด · ปัดหรือลากเพื่อดูวันอื่น</p>
      <p v-if="periodMessage" class="mt-1 text-center font-['Anuphan'] text-[12px] text-slate-500">
        {{ periodMessage }}
      </p>
    </div>

    <div class="-mx-6 mt-6 px-[5px]">
      <div class="relative aspect-square w-full">
        <template v-for="layer in avatarLayers" :key="layer.slot">
          <img
            v-if="layer.code && !hiddenLayers[layer.slot]"
            :src="`/avatar/${layer.code}.png`"
            alt=""
            class="absolute inset-0 h-full w-full object-contain"
            @error="hideLayer(layer.slot)"
          >
        </template>
        <button
          type="button"
          class="absolute bottom-0 left-2 z-29 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
          aria-label="แชร์"
          @click="share"
        >
          <svg class="h-4 w-4 text-slate-700" viewBox="0 0 20 20" fill="none">
            <path d="M14 6.5a2 2 0 1 0-1.94-2.5L7.9 6.6a2 2 0 1 0 0 2.8l4.16 2.6a2 2 0 1 0 .53-.85L8.44 8.55a2 2 0 0 0 0-1.1l4.15-2.6c.13.11.27.2.41.28Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>

    <div class="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <h2 class="font-['Anuphan'] text-[16px] font-semibold text-slate-900">
        เป้าหมายของฉัน
      </h2>

      <p class="mt-3 font-['Anuphan'] text-[28px] font-semibold text-slate-900">
        {{ daysLogged }} <span class="text-base font-normal text-slate-400">/ {{ CYCLE_LENGTH_DAYS }} วัน</span>
      </p>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div class="h-full rounded-full bg-slate-900" :style="{ width: `${progressPercent}%` }" />
      </div>

      <div v-if="activeGoals.length" class="mt-4 flex flex-col gap-2">
        <div
          v-for="goal in activeGoals"
          :key="goal.id"
          class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
        >
          <span class="font-['Anuphan'] text-[14px] font-medium text-slate-800">{{ goal.title }}</span>
          <span
            class="font-['Anuphan'] text-[12px] font-normal"
            :class="checkedGoals[goal.goal_code] ? 'text-slate-900' : 'text-slate-400'"
          >
            {{ checkedGoals[goal.goal_code] ? 'สำเร็จวันนี้แล้ว' : 'ยังไม่เช็คอินวันนี้' }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="mt-4 w-full rounded-full bg-slate-900 py-3 text-center font-['Anuphan'] text-sm font-medium text-white transition active:scale-95"
        @click="goToCheckin"
      >
        วันนี้เช็คอินหรือยัง
      </button>
    </div>

    <div class="mt-4 flex gap-3">
      <button
        type="button"
        class="flex-1 rounded-2xl bg-white px-4 py-4 text-center font-['Anuphan'] text-sm font-medium text-slate-800 shadow-sm"
      >
        อยากทานอะไรตอนนี้ดี
      </button>
      <button
        type="button"
        class="flex-1 rounded-2xl bg-white px-4 py-4 text-center font-['Anuphan'] text-sm font-medium text-slate-800 shadow-sm"
      >
        ปวดตรงไหนไหม
      </button>
    </div>

    <button
      type="button"
      class="mt-4 w-full rounded-2xl bg-white px-4 py-4 text-center font-['Anuphan'] text-sm font-medium text-slate-800 shadow-sm"
    >
      บันทึกอาการ
    </button>

    <div
      v-if="toastMessage"
      class="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6"
    >
      <div class="rounded-full bg-slate-900 px-4 py-2 font-['Anuphan'] text-[13px] font-normal text-white shadow-lg">
        {{ toastMessage }}
      </div>
    </div>

    <!-- เมนูที่เด้งขึ้นมาตอนกดวันในแถบ -->
    <PeriodDaySheet
      v-if="selectedDate && profileId !== null"
      :date="selectedDate"
      :rows="savedRows"
      :all-rows="allRows"
      :profile-id="profileId"
      :period-days="periodDurationDays ?? 5"
      :cycle-days="effectiveCycleDays"
      @close="selectedDate = null"
      @changed="onPeriodChanged"
    />

    <BottomNav active="home" />
  </div>
</template>

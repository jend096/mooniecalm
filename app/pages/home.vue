<script setup lang="ts">
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
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

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
  const start = parseLocalDate(lastPeriodDate.value)
  const target = startOfDay(d)
  const diffDays = Math.round((target.getTime() - start.getTime()) / MS_PER_DAY)
  return ((diffDays % cycleDurationDays.value) + cycleDurationDays.value) % cycleDurationDays.value
}

function isPeriodDay(d: Date): boolean {
  const cycleDay = dayInCycle(d)
  if (cycleDay === null || !periodDurationDays.value) return false
  return cycleDay < periodDurationDays.value
}

const hasPeriodData = computed(() => !!lastPeriodDate.value && !!periodDurationDays.value && !!cycleDurationDays.value)

const periodStrip = computed(() => {
  const today = startOfDay(new Date())
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + (i - 2))
    return {
      date: d,
      dayNumber: d.getDate(),
      weekday: WEEKDAY_SHORT[d.getDay()],
      isToday: i === 2,
      isPeriodDay: isPeriodDay(d)
    }
  })
})

const periodStatusText = computed(() => {
  if (!hasPeriodData.value) return ''
  const todayCycleDay = dayInCycle(new Date())
  if (todayCycleDay === null || !periodDurationDays.value || !cycleDurationDays.value) return ''

  if (todayCycleDay < periodDurationDays.value) {
    return `อยู่ในช่วงประจำเดือน (วันที่ ${todayCycleDay + 1})`
  }

  const daysUntilNext = cycleDurationDays.value - todayCycleDay
  return `ประจำเดือนคุณจะมาในอีก ${daysUntilNext} วัน`
})

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

  nickname.value = profile.nickname ?? ''
  profileImageUrl.value = profile.profile_image_url ?? ''
  lastPeriodDate.value = profile.last_period_date ?? null
  periodDurationDays.value = profile.period_duration_days ?? null
  cycleDurationDays.value = profile.cycle_duration_days ?? null

  const today = getLocalDateString()

  const [avatarRowsRes, goalTypesRes, userGoalsRes, cycleRes, checkinRes] = await Promise.all([
    authed.from('user_avatar_state').select('feature_slot, current_asset_code').eq('user_id', profile.id),
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    authed
      .from('goal_cycles')
      .select('cycle_start_date, cycle_end_date, claimed_at')
      .eq('user_id', profile.id)
      .is('claimed_at', null)
      .order('cycle_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    authed.from('daily_checkins').select('*').eq('user_id', profile.id).eq('checkin_date', today).maybeSingle()
  ])

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

    <div v-if="hasPeriodData" class="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <p class="font-['Anuphan'] text-[13px] font-medium text-slate-800">
        {{ periodStatusText }}
      </p>
      <div class="mt-3 flex justify-between gap-2">
        <div
          v-for="day in periodStrip"
          :key="day.date.toISOString()"
          class="flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
          :class="day.isToday ? 'ring-2 ring-slate-900' : ''"
        >
          <span class="font-['Anuphan'] text-[11px] font-normal text-slate-400">{{ day.weekday }}</span>
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full font-['Anuphan'] text-[13px] font-medium"
            :class="day.isPeriodDay ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'"
          >
            {{ day.dayNumber }}
          </span>
        </div>
      </div>
    </div>

    <div class="mt-6 flex flex-col items-center">
      <div class="relative aspect-square w-[70vw] max-w-[320px]">
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
          class="absolute left-2 top-[280px] z-29 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
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

    <BottomNav active="home" />
  </div>
</template>

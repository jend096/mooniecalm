<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
    <div class="pointer-events-none absolute -right-16 -top-16 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -left-16 top-1/2 z-0 h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -right-16 top-1/2 z-0 h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -left-10 -top-10 z-0 h-48 w-48 rounded-full bg-slate-200 opacity-60 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-20 -right-10 z-0 h-64 w-64 rounded-full bg-slate-200 opacity-60 blur-3xl" />

    <div v-if="!isLoading" class="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-6 pt-16 pb-8 text-center">
      <h1 class="font-['Anuphan'] text-[26px] font-semibold leading-tight text-slate-900">
        ยินดีด้วย! {{ nickname }}
      </h1>

      <div class="-mx-6 mt-6 self-stretch px-[5px]">
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

      <div v-if="summaryItems.length" class="mt-8 w-full rounded-2xl bg-white/70 p-4 text-left">
        <ul class="flex flex-col gap-1.5 font-['Anuphan'] text-[13px] font-normal text-slate-600">
          <li v-for="(item, i) in summaryItems" :key="i" class="flex gap-2">
            <span class="text-slate-400">•</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        class="mt-4 w-full rounded-2xl bg-white/70 p-4 text-left"
        @click="isSheetOpen = true"
      >
        <template v-if="hasConfirmedGoal">
          <p class="font-['Anuphan'] text-[13px] font-medium text-slate-800">
            เป้าหมายของคุณ
          </p>
          <p class="mt-1 font-['Anuphan'] text-[13px] font-normal text-slate-500">
            {{ selectedGoalTitles.join(' • ') }}
          </p>
        </template>
        <p v-else class="font-['Anuphan'] text-[13px] font-normal leading-relaxed text-slate-600">
          เลือกเป้าหมายที่คุณอยากปรับเปลี่ยนได้เลย โดยมีระยะเวลาในการทำ 28 วัน
        </p>
      </button>
    </div>

    <div class="relative z-10 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BaseButton label="เริ่มใช้งาน" :disabled="!hasConfirmedGoal" @click="start" />
    </div>

    <div
      v-if="isSheetOpen"
      class="fixed inset-0 z-30 bg-black/30"
      @click="isSheetOpen = false"
    />

    <div
      class="fixed inset-x-0 bottom-0 z-40 flex h-[58vh] flex-col rounded-t-3xl bg-white shadow-xl transition-transform duration-300 ease-out"
      :class="isSheetOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full'"
    >
      <div class="flex items-center justify-between px-5 pt-4">
        <h2 class="font-['Anuphan'] text-base font-semibold text-slate-900">
          เลือกเป้าหมาย
        </h2>
        <button
          type="button"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100"
          aria-label="ปิด"
          @click="isSheetOpen = false"
        >
          <svg class="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <p class="px-5 pt-1.5 font-['Anuphan'] text-xs font-normal leading-relaxed text-slate-500">
        ระยะเวลาในการทำ 28 วัน
      </p>

      <div class="mt-3 flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-4">
        <button
          v-for="goal in goalTypes"
          :key="goal.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left shadow-md transition active:scale-[0.98]"
          :class="selectedGoalIds.includes(goal.id)
            ? 'bg-slate-900 text-white shadow-slate-900/25 active:bg-slate-800'
            : 'bg-slate-200 text-slate-800 shadow-slate-400/30 active:bg-slate-300'"
          @click="toggleGoal(goal.id)"
        >
          <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span class="font-['Anuphan'] text-sm font-semibold">{{ goal.title }}</span>
            <span
              v-if="recommendedGoalCodes.has(goal.goal_code)"
              class="rounded-full px-2 py-0.5 font-['Anuphan'] text-[10px] font-medium"
              :class="selectedGoalIds.includes(goal.id) ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'"
            >
              แนะนำ
            </span>
          </span>
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
            :class="selectedGoalIds.includes(goal.id) ? 'border-white bg-white' : 'border-slate-400 bg-white'"
          >
            <svg v-if="selectedGoalIds.includes(goal.id)" class="h-3 w-3" viewBox="0 0 20 20" fill="none">
              <path d="M4 10.5L8 14.5L16 6" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      <div class="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <BaseButton
          label="ยืนยัน"
          :disabled="selectedGoalIds.length === 0 || isSavingGoals"
          @click="confirmGoals"
        />
      </div>
    </div>

    <div
      v-if="toastMessage"
      class="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6"
    >
      <div class="rounded-full bg-slate-900 px-4 py-2 font-['Anuphan'] text-[13px] font-normal text-white shadow-lg">
        {{ toastMessage }}
      </div>
    </div>
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

const summaryItems = computed(() =>
  [avatarState.value.body_color, avatarState.value.fx_overlay, avatarState.value.eyes, avatarState.value.ears]
    .filter((code): code is string => !!code)
    .map(code => answerDescriptions.value[code])
    .filter(Boolean)
)

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
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

async function share() {
  if (await shareApp(nickname.value) === 'copied') showToast('คัดลอกลิงก์แล้ว')
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

  const { error: goalsError } = await authed.from('user_goals').insert(goalRows)
  if (goalsError) {
    isSavingGoals.value = false
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
    isSavingGoals.value = false
    return
  }

  if (!openCycle) {
    const { error: cycleError } = await authed.from('goal_cycles').insert({
      user_id: profileId.value,
      cycle_start_date: getLocalDateString(today),
      cycle_end_date: getLocalDateString(cycleEnd)
    })

    if (cycleError) {
      isSavingGoals.value = false
      return
    }
  }

  isSavingGoals.value = false

  hasConfirmedGoal.value = true
  isSheetOpen.value = false
}

function start() {
  if (!hasConfirmedGoal.value) return
  navigateTo('/home')
}
</script>

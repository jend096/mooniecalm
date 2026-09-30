<template>
  <div v-if="!isLoading" class="relative flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white px-6 pt-20 pb-[calc(2rem+env(safe-area-inset-bottom))]">
    <!-- ปุ่มย้อนกลับ (แยกออกมานอก h1 และเพิ่ม active scale) -->
    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition active:scale-95"
      @click="back"
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    
    <h1 class="font-['Anuphan'] text-[24px] font-semibold text-slate-900">
      เช็คอินวันนี้
    </h1>
    <p class="mt-1 font-['Anuphan'] text-[13px] font-normal text-slate-500">
      แตะเป้าหมายที่ทำสำเร็จวันนี้
    </p>
    <p v-if="daysRemaining !== null" class="mt-1 font-['Anuphan'] text-[12px] font-normal text-slate-400">
      รอบนี้เหลืออีก {{ daysRemaining }} วัน
    </p>

    <div class="mt-6 flex flex-col gap-3">
      <div
        v-for="goal in activeGoals"
        :key="goal.id"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm"
      >
        <span class="flex flex-col gap-1">
          <span class="font-['Anuphan'] text-base font-medium text-slate-800">{{ goal.title }}</span>
          <span class="font-['Anuphan'] text-[12px] font-normal text-slate-400">
            {{ goalDayCounts[goal.goal_code] ?? 0 }}/{{ CYCLE_LENGTH_DAYS }} วัน
          </span>
        </span>

        <span
          v-if="isAchieved(goal.goal_code)"
          class="rounded-full bg-slate-900 px-3 py-1.5 font-['Anuphan'] text-[12px] font-medium text-white"
        >
          สำเร็จ!
        </span>
        <button
          v-else
          type="button"
          class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition active:scale-95"
          :class="checkedGoals[goal.goal_code] ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'"
          @click="toggleGoal(goal.goal_code)"
        >
          <svg v-if="checkedGoals[goal.goal_code]" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5L8 14.5L16 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>

    <button
      type="button"
      class="mt-8 w-full rounded-2xl bg-white px-4 py-4 text-center font-['Anuphan'] text-sm font-medium text-slate-800 shadow-sm"
    >
      ย้อนหลังสรุปประจำเดือน
    </button>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

function back() {
  router.back()
}

interface ActiveGoal {
  id: number
  goal_code: string
  title: string
}

const GOAL_CODE_TO_CHECKIN_COLUMN: Record<string, string> = {
  sleep_schedule: 'slept_on_time',
  exercise_routine: 'exercised',
  reduce_sugar: 'avoided_sugar',
  reduce_cold_drinks: 'avoided_cold_drinks'
}

const GOAL_CODE_TO_PROGRESS_COLUMN: Record<string, string> = {
  sleep_schedule: 'sleep_days_achieved',
  exercise_routine: 'exercise_days_achieved',
  reduce_sugar: 'sugar_days_achieved',
  reduce_cold_drinks: 'cold_drink_days_achieved'
}

const CYCLE_LENGTH_DAYS = 28
const today = getLocalDateString()

const isLoading = ref(true)
const profileId = ref<number | null>(null)
const activeGoals = ref<ActiveGoal[]>([])
const checkedGoals = ref<Record<string, boolean>>({})
const goalDayCounts = ref<Record<string, number>>({})
const savingGoalCode = ref<string | null>(null)
const daysRemaining = ref<number | null>(null)

function isAchieved(goalCode: string) {
  return (goalDayCounts.value[goalCode] ?? 0) >= CYCLE_LENGTH_DAYS
}

async function refreshProgress() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()

  const { data } = await authed
    .from('goal_cycle_progress')
    .select('sleep_days_achieved, exercise_days_achieved, sugar_days_achieved, cold_drink_days_achieved, cycle_end_date')
    .eq('user_id', profileId.value)
    .is('claimed_at', null)
    .order('cycle_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  for (const goal of activeGoals.value) {
    const column = GOAL_CODE_TO_PROGRESS_COLUMN[goal.goal_code]
    goalDayCounts.value[goal.goal_code] = column ? (data?.[column] ?? 0) : 0
  }

  if (data?.cycle_end_date) {
    const end = new Date(`${data.cycle_end_date}T00:00:00`)
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    daysRemaining.value = Math.max(0, Math.ceil((end.getTime() - today0.getTime()) / 86400000))
  } else {
    daysRemaining.value = null
  }
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }

  const authed = await getAuthedSupabaseClient()

  const { data: profile, error: profileError } = await authed
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', sessionData.session.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    isLoading.value = false
    return
  }

  profileId.value = profile.id

  const [goalTypesRes, userGoalsRes, todayCheckinRes] = await Promise.all([
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    authed.from('daily_checkins').select('*').eq('user_id', profile.id).eq('checkin_date', today).maybeSingle()
  ])

  const goalTypeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  activeGoals.value = (userGoalsRes.data ?? [])
    .map(g => goalTypeById.get(g.goal_type_id))
    .filter((g): g is ActiveGoal => !!g)

  for (const goal of activeGoals.value) {
    const column = GOAL_CODE_TO_CHECKIN_COLUMN[goal.goal_code]
    checkedGoals.value[goal.goal_code] = column ? Boolean(todayCheckinRes.data?.[column]) : false
    goalDayCounts.value[goal.goal_code] = 0
  }

  await refreshProgress()

  isLoading.value = false
})

async function toggleGoal(goalCode: string) {
  const column = GOAL_CODE_TO_CHECKIN_COLUMN[goalCode]
  if (!column || !profileId.value || savingGoalCode.value || isAchieved(goalCode)) return

  const newValue = !checkedGoals.value[goalCode]
  savingGoalCode.value = goalCode

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('daily_checkins').upsert({
    user_id: profileId.value,
    checkin_date: today,
    [column]: newValue
  }, { onConflict: 'user_id,checkin_date' })

  if (!error) {
    checkedGoals.value = { ...checkedGoals.value, [goalCode]: newValue }
    await refreshProgress()
  }

  savingGoalCode.value = null
}
</script>
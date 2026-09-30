<script setup lang="ts">
interface GoalType {
  id: number
  goal_code: string
  title: string
}

const CYCLE_LENGTH_DAYS = 28

const isLoading = ref(true)
const activeGoals = ref<GoalType[]>([])
const daysLogged = ref(0)
const progressPercent = computed(() => Math.min(100, Math.round((daysLogged.value / CYCLE_LENGTH_DAYS) * 100)))

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
    .select('id')
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

  const [goalTypesRes, userGoalsRes, progressRes] = await Promise.all([
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    authed
      .from('goal_cycle_progress')
      .select('claimed_at, cycle_start_date')
      .eq('user_id', profile.id)
      .is('claimed_at', null)
      .order('cycle_start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const goalTypeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  activeGoals.value = (userGoalsRes.data ?? [])
    .map(g => goalTypeById.get(g.goal_type_id))
    .filter((g): g is GoalType => !!g)

  const cycleStartDate = progressRes.data?.cycle_start_date ?? null
  if (cycleStartDate) {
    const start = new Date(`${cycleStartDate}T00:00:00`)
    start.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
    daysLogged.value = Math.min(CYCLE_LENGTH_DAYS, Math.max(0, diffDays))
  }

  isLoading.value = false
})
</script>

<template>
  <div v-if="!isLoading" class="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-white px-6 pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))]">
    <h1 class="font-['Anuphan'] text-[24px] font-semibold text-slate-900">
      เป้าหมายของฉัน
    </h1>
    <p class="mt-1 font-['Anuphan'] text-[13px] font-normal text-slate-500">
      ความคืบหน้ารอบ 28 วันของแต่ละเป้าหมาย
    </p>

    <div v-if="activeGoals.length" class="mt-6 flex flex-col gap-3">
      <div
        v-for="goal in activeGoals"
        :key="goal.id"
        class="rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 class="font-['Anuphan'] text-[15px] font-semibold text-slate-900">
          {{ goal.title }}
        </h2>
        <p class="mt-2 font-['Anuphan'] text-[24px] font-semibold text-slate-900">
          {{ daysLogged }} <span class="text-sm font-normal text-slate-400">/ {{ CYCLE_LENGTH_DAYS }} วัน</span>
        </p>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-slate-900" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>
    </div>

    <div v-else class="mt-10 text-center">
      <p class="font-['Anuphan'] text-sm font-normal text-slate-400">
        ยังไม่มีเป้าหมายที่กำลังทำอยู่
      </p>
    </div>

    <BottomNav active="goals" />
  </div>
</template>

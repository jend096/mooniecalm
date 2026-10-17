<script setup lang="ts">
import type { PeriodPromptCode, PeriodRow } from '~/utils/period-prediction'
// import ตรงๆ เพื่อให้ชัวร์ (ฟังก์ชันใหม่ที่เพิ่งเพิ่ม Nuxt บางทียังไม่รู้จักจนกว่าจะรีสตาร์ต dev server)
import { daysBetween, estimateCycleLength, getDayKind, getPeriodPrompt, getRowEnd } from '~/utils/period-prediction'

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

  // รอบล่าสุดที่บันทึก: ดูว่าผู้ใช้กด "หมดแล้ว" ไปหรือยัง / วันนี้ยังอยู่ในช่วงมีประจำเดือนไหม
  // (ต้องเช็คก่อนสูตรเดิมด้านล่าง เพราะสูตรเดิมนับแค่จากจำนวนวันที่ตั้งไว้ ไม่รู้ว่าผู้ใช้กดหมดไปแล้ว)
  const latestRow = allRows.value.at(-1)
  if (latestRow) {
    const today = startOfDay(new Date())
    const sinceStart = daysBetween(parseLocalDate(latestRow.cycle_start_date), today)

    // กดวันหมดไว้แล้ว และวันนี้ถึงหรือเลยวันหมดนั้นแล้ว -> หมดแล้ว
    const hasEnded =
      !!latestRow.confirmed_end_date &&
      daysBetween(parseLocalDate(latestRow.confirmed_end_date), today) >= 0
    if (hasEnded && prediction.value) {
      return `ประจำเดือนหมดแล้ว (รอบหน้าอีก ${prediction.value.daysUntil} วัน)`
    }

    // ยังไม่ถึงวันหมด (ใช้ getRowEnd ตัวเดียวกับปฏิทิน จึงตรงกันและขยายต่อได้ถ้ายังไม่หมด)
    const stillInPeriod =
      sinceStart >= 0 &&
      daysBetween(today, getRowEnd(latestRow, periodDurationDays.value ?? 5)) >= 0
    if (stillInPeriod) {
      return `อยู่ในช่วงประจำเดือน (วันที่ ${sinceStart + 1})`
    }
  }

  const todayCycleDay = dayInCycle(new Date())
  if (todayCycleDay === null || !periodDurationDays.value || !cycleDurationDays.value) return ''

  if (todayCycleDay < periodDurationDays.value) {
    return `อยู่ในช่วงประจำเดือน (วันที่ ${todayCycleDay + 1})`
  }

  const daysUntilNext = effectiveCycleDays.value - todayCycleDay
  return `คาดว่าประจำเดือนคุณจะมาในอีก ${daysUntilNext} วัน`
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
  const itemWidth = first.offsetWidth + 13 // 13px = ช่องว่างระหว่างแคปซูล (gap-[13px])
  const centerIndex = Math.floor((el.scrollLeft + el.clientWidth / 2 - 38) / itemWidth) // 38 = ขอบซ้ายของแถบ
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

// ---------- ป๊อปอัพถามผู้ใช้ (หมดหรือยัง / มาหรือยัง / ใกล้ถึงรอบ) ----------
// ข้อความของแต่ละป๊อปอัพ (เนื้อหาตรงกับตาราง notification_types ใช้ code เดียวกัน ทีหลังผูกแจ้งเตือนจริงได้ง่าย)
const PROMPT_COPY: Record<
  PeriodPromptCode,
  (days?: number) => { title: string, message: string, primaryLabel: string, secondaryLabel?: string }
> = {
  period_end_popup: () => ({
    title: 'ประจำเดือนหมดหรือยัง',
    message: 'ประจำเดือนรอบนี้หมดแล้วหรือยังคะ ถ้าหมดแล้วกดยืนยันเพื่อบันทึกไว้ได้เลย',
    primaryLabel: 'หมดแล้ว',
    secondaryLabel: 'ยังไม่หมด'
  }),
  period_arrival_popup: () => ({
    title: 'ประจำเดือนมาหรือยัง',
    message: 'วันนี้ประจำเดือนมาหรือยังคะ กดยืนยันได้เลยถ้ามาแล้ว',
    primaryLabel: 'มาแล้ว',
    secondaryLabel: 'ยังไม่มา'
  }),
  pre_period_info: days => ({
    title: 'ใกล้ถึงรอบแล้วนะ',
    message: `อีกประมาณ ${days} วัน ประจำเดือนรอบหน้าอาจจะมาแล้ว เตรียมตัวไว้ก่อนได้เลย`,
    primaryLabel: 'รับทราบ'
  })
}

// ป๊อปอัพที่ผู้ใช้กดปิดไปแล้ว "วันนี้" (จำไว้ในเบราว์เซอร์ ไม่ให้เด้งซ้ำทั้งวัน พรุ่งนี้ถามใหม่)
const dismissedPromptCodes = ref<string[]>([])
const promptStorageKey = computed(() => `moonie-dismissed-prompts-${profileId.value}`)

function loadDismissedPrompts() {
  try {
    const saved = JSON.parse(localStorage.getItem(promptStorageKey.value) ?? 'null')
    // ใช้ได้เฉพาะที่จดไว้ของ "วันนี้" ถ้าเป็นของเมื่อวานก็ทิ้ง
    if (saved && saved.date === getLocalDateString()) dismissedPromptCodes.value = saved.codes ?? []
  } catch {
    // อ่านไม่ได้ก็ไม่เป็นไร แค่อาจถามซ้ำ
  }
}

function dismissPrompt(code: string) {
  dismissedPromptCodes.value = [...dismissedPromptCodes.value, code]
  try {
    localStorage.setItem(
      promptStorageKey.value,
      JSON.stringify({ date: getLocalDateString(), codes: dismissedPromptCodes.value })
    )
  } catch {
    // เก็บไม่ได้ก็ไม่เป็นไร
  }
}

// ตอนนี้ควรถามอะไร (ตัดสินด้วย getPeriodPrompt ที่ไฟล์ period-prediction.ts)
const currentPrompt = computed(() => {
  if (!hasPeriodData.value || allRows.value.length === 0) return null
  const prompt = getPeriodPrompt(allRows.value, periodDurationDays.value ?? 5, effectiveCycleDays.value)

  // "หมดหรือยัง" ต้องมีแถวจริงในตาราง (มี id) ถึงจะบันทึกวันหมดได้
  // ถ้ายังไม่เคยบันทึกเลย allRows คือแถวสมมติจาก onboarding -> ไม่ถาม
  if (prompt?.code === 'period_end_popup' && savedRows.value.length === 0) return null
  return prompt
})

// ป๊อปอัพที่ "แสดงจริง": ต้องโหลดเสร็จแล้ว ไม่มีเมนูอื่นเปิดอยู่ และวันนี้ยังไม่ได้กดปิด
const visiblePrompt = computed(() => {
  const prompt = currentPrompt.value
  if (isLoading.value || selectedDate.value || !prompt) return null
  if (dismissedPromptCodes.value.includes(prompt.code)) return null
  return { code: prompt.code, ...PROMPT_COPY[prompt.code](prompt.days) }
})

// ผู้ใช้กด "หมดแล้ว" -> บันทึกวันหมดเป็นวันนี้ลงรอบล่าสุด
async function confirmPeriodEndToday() {
  const row = savedRows.value.at(-1)
  if (!row?.id) return
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed
    .from('period_cycles')
    .update({ confirmed_end_date: getLocalDateString() })
    .eq('id', row.id)
  if (error) {
    periodMessage.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'
    return
  }
  await onPeriodChanged('บันทึกวันที่หมดแล้ว')
}

// กดปุ่มหลัก: แต่ละป๊อปอัพทำไม่เหมือนกัน
async function onPromptPrimary() {
  const code = visiblePrompt.value?.code
  if (code === 'period_end_popup') {
    await confirmPeriodEndToday()
  } else if (code === 'period_arrival_popup') {
    // เปิดเมนูของวันนี้ ให้ผู้ใช้กด "ประจำเดือนมาวันนี้" (โค้ดบันทึกอยู่ที่เมนูนั้นที่เดียว)
    dismissPrompt(code)
    openDay(startOfDay(new Date()))
  } else if (code === 'pre_period_info') {
    dismissPrompt(code) // แค่รับทราบ
  }
}

// กดปุ่มรอง ("ยังไม่หมด" / "ยังไม่มา"): ปิด วันนี้ไม่ถามซ้ำ
function onPromptSecondary() {
  const code = visiblePrompt.value?.code
  if (code) dismissPrompt(code)
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

  loadDismissedPrompts()
  isLoading.value = false

  // รอให้หน้าวาดเสร็จ แล้วเลื่อนแถบวันให้วันนี้อยู่ตรงกลาง
  await nextTick()
  stripRef.value?.querySelector('[data-today]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  updateVisibleMonth()
})

const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

// แชร์เหมือนหน้า reveal: รูปการ์ดอวตาร + ข้อความชวนเล่นที่มีลิงก์ (ดู shareAvatarCard ใน ~/utils/share-app.ts)
const isSharing = ref(false)
async function share() {
  if (isSharing.value) return
  isSharing.value = true
  try {
    const blob = await renderAvatarCardImage({
      nickname: nickname.value,
      layerCodes: avatarLayers.value
        .filter(layer => layer.code && !hiddenLayers.value[layer.slot])
        .map(layer => layer.code as string)
    }).catch(() => null)
    const result = await shareAvatarCard(nickname.value, blob)
    if (result === 'copied') showToast('คัดลอกลิงก์แล้ว')
    else if (result === 'saved') showToast('บันทึกรูปการ์ดและคัดลอกลิงก์แล้ว')
  } finally {
    isSharing.value = false
  }
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
  <div
    v-if="!isLoading"
    class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-moon-bg to-moon-bg-end font-['Anuphan'] text-moon-ink"
  >
    <!-- ลายเบลอตกแต่งด้านหลัง (ตามฟิกม่า: วงกลมโคเรลเบลอ + แถบขาวเบลอ) -->
    <div aria-hidden="true" class="pointer-events-none absolute left-[37%] top-[134px] h-[155px] w-[97px] rounded-full bg-moon-coral blur-[100px]" />
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-[292px] h-[498px] bg-white blur-[25px]" />

    <!-- ประกายดาวจางๆ ลอยอยู่หลังเนื้อหา -->
    <AmbientSparkles />

    <div class="relative z-10 flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <!-- หัวหน้า: รูปโปรไฟล์ + ทักทาย (ซ้าย) / ออกจากระบบ (ขวา) -->
      <div class="flex items-center justify-between gap-3 px-[38px] pt-[59px]">
        <div class="flex min-w-0 items-center gap-[14px]">
          <!-- กดรูปเพื่อไปหน้าเปลี่ยนรูปโปรไฟล์ -->
          <NuxtLink to="/profile-photo" class="flex-shrink-0" aria-label="เปลี่ยนรูปโปรไฟล์">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              alt=""
              class="h-[35px] w-[35px] rounded-full object-cover"
            >
            <div v-else class="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-moon-chip">
              <FaIcon name="user" class="h-4 w-4 text-moon-muted" />
            </div>
          </NuxtLink>
          <p class="flex min-w-0 items-baseline gap-1 text-lg font-medium">
            สวัสดี
            <span class="truncate text-xl">{{ nickname }}</span>
          </p>
        </div>
        <button
          type="button"
          class="flex-shrink-0 text-xs font-medium text-moon-muted"
          @click="logout"
        >
          ออกจากระบบ
        </button>
      </div>

      <div v-if="hasPeriodData">
        <!-- แถวบน: ชื่อเดือน (ซ้าย) + ปุ่มเปิดหน้าปฏิทินเต็ม (ขวา) -->
        <div class="mt-[19px] flex items-center justify-between gap-3 pl-[47px] pr-[36px]">
          <p class="text-base font-semibold">{{ visibleMonthLabel }}</p>
          <button
            type="button"
            class="flex h-[42px] items-center gap-[5px] rounded-[35px] border border-moon-pink-soft bg-white py-[5px] pl-[5px] pr-3 text-sm font-medium transition active:scale-95"
            @click="navigateTo('/calendar')"
          >
            <span class="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-moon-chip">
              <FaIcon name="calendar-days-regular" class="h-[15px] w-[13px] text-moon-period" />
            </span>
            ปฏิทิน
          </button>
        </div>

        <!-- แถบวัน: แคปซูลทีละวัน เลื่อนซ้าย-ขวาได้ กดวันไหนก็มีเมนูถามว่าประจำเดือนมา/หมดไหม -->
        <div
          ref="stripRef"
          class="mt-[5px] flex cursor-grab select-none gap-[13px] overflow-x-auto px-[38px] py-3 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            class="flex h-[90px] shrink-0 basis-[calc((100%-52px)/5)] flex-col items-center rounded-[28px] pt-[5px] shadow-[0_1px_9px_rgba(107,98,100,0.19)] transition active:scale-95"
            :class="day.isToday ? 'bg-moon-coral' : 'bg-white'"
            @click="onDayClick(day.date)"
          >
            <!-- ตัวย่อวัน อา จ อ ... อยู่เหนือตัวเลข (วันนี้ = ตัวขาวใหญ่ขึ้น) -->
            <span
              class="font-medium"
              :class="day.isToday ? 'text-base leading-6 text-white' : 'text-sm leading-[22px]'"
            >{{ day.weekday }}</span>
            <!-- วงกลมตัวเลข: วันนี้ = ขาวนวลบนพื้นโคเรล / วันที่มีประจำเดือน = ชมพูอ่อน / วันที่คาดไว้ = เส้นประโคเรล / วันธรรมดา = เทาอ่อน -->
            <span
              class="flex shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums"
              :class="{
                'mt-[5px] h-[42px] w-[42px] bg-moon-bg': day.isToday,
                'mt-[10px] h-[42px] w-[42px] bg-moon-pink-soft': !day.isToday && day.kind === 'logged',
                'mt-[10px] h-[48px] w-[48px] border-[3px] border-dashed border-moon-coral bg-moon-chip': !day.isToday && day.kind === 'predicted',
                'mt-[10px] h-[42px] w-[42px] bg-moon-chip': !day.isToday && day.kind === 'none'
              }"
            >
              {{ day.dayNumber }}
            </span>
          </button>
        </div>

        <!-- ข้อความสถานะ -->
        <div class="mt-px flex justify-center">
          <p class="flex min-h-[44px] items-center rounded-[24px] border border-moon-coral bg-moon-bg px-[11px] text-center text-sm font-medium">
            {{ periodStatusText }}
          </p>
        </div>

        <p v-if="periodMessage" class="mt-2 px-[38px] text-center text-xs text-moon-muted">
          {{ periodMessage }}
        </p>
      </div>

      <!-- รูปอวตารเต็มความกว้าง + ปุ่มแชร์มุมขวาล่าง -->
      <div class="relative mt-[6px] aspect-square w-full">
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
          class="absolute bottom-2 right-[21px] z-10 flex h-[55px] w-[55px] items-center justify-center rounded-full bg-white shadow-[0_1px_6px_rgba(107,98,100,0.2)]"
          aria-label="แชร์"
          :disabled="isSharing"
          @click="share"
        >
          <BrandLogoMark v-if="isSharing" :size="38" stage="bob" />
          <FaIcon v-else name="arrow-up-from-bracket" class="h-[22px] w-[19px] text-moon-muted" />
        </button>
      </div>

      <!-- การ์ดเป้าหมายของฉัน (กระจกฝ้าโปร่งแสง) -->
      <div class="relative mx-[35px] mt-[22px] min-h-[242px] rounded-[15px] bg-white/55 pb-[75px] shadow-[0_3px_8px_rgba(0,0,0,0.25)] backdrop-blur-[8px]">
        <h2 class="px-[23px] pt-[21px] text-lg font-medium leading-[26px]">เป้าหมายของฉัน</h2>

        <!-- ซ้าย: จำนวนวันที่เช็คอิน -->
        <p class="absolute left-[23px] top-[94px] flex items-baseline gap-[6px]">
          <span class="text-lg">วัน</span>
          <span class="text-[48px] font-semibold leading-none text-moon-period">{{ String(daysLogged).padStart(2, '0') }}</span>
          <span class="text-lg text-moon-ink/[0.27]">/{{ CYCLE_LENGTH_DAYS }}</span>
        </p>

        <!-- ขวา: เส้นเวลาเป้าหมาย + สถานะ -->
        <div v-if="activeGoals.length" class="absolute bottom-[75px] left-[165px] right-[13px] top-[59px] overflow-hidden">
          <div class="relative flex flex-col gap-[2px]">
            <!-- เส้นตั้งสีประจำเดือน -->
            <span aria-hidden="true" class="absolute bottom-[11px] left-0 top-[11px] w-px bg-moon-period" />
            <div
              v-for="goal in activeGoals"
              :key="goal.id"
              class="relative flex h-[22px] items-center gap-[6px]"
            >
              <span aria-hidden="true" class="h-px w-[10px] shrink-0 bg-moon-period" />
              <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ goal.title }}</span>
              <span class="flex w-[34px] shrink-0 justify-start">
                <span v-if="checkedGoals[goal.goal_code]" class="text-xs">สำเร็จ</span>
                <span v-else aria-hidden="true" class="h-[15px] w-[15px] rounded-full border border-dashed border-moon-period" />
              </span>
            </div>
          </div>
        </div>

        <!-- ปุ่มเช็คอิน -->
        <button
          type="button"
          class="checkin-pulse absolute inset-x-[13px] bottom-[12px] flex h-[51px] items-center justify-center rounded-[10px] bg-moon-ink pl-[10px] pr-[51px] text-base font-bold text-white"
          @click="goToCheckin"
        >
          เช็คอินกันเถอะ
          <span class="absolute right-[10px] flex h-[31px] w-[31px] items-center justify-center rounded-full bg-moon-coral">
            <FaIcon name="chevron-right" class="h-3 w-[7px] text-white" />
          </span>
        </button>
      </div>

      <!-- การ์ดลัด 2 ใบ: อยากทานอะไร / ปวดตรงไหน -->
      <div class="mt-[31px] flex gap-[21px] pl-[33px] pr-[42px]">
        <button
          type="button"
          class="relative h-[188px] flex-[170] overflow-hidden rounded-[20px] bg-moon-cream-soft text-left shadow-[0_2px_7px_rgba(0,0,0,0.25)] transition active:scale-[0.98]"
          @click="navigateTo('/snack')"
        >
          <span aria-hidden="true" class="food-blob absolute bottom-[-2px] left-0 h-[116px] w-[118px] rounded-full bg-moon-cream" />
          <span class="absolute left-[22px] top-5 text-base font-semibold leading-6">วันนี้<br>อยากทานอะไร</span>
          <span class="press-hint press-hint-food absolute bottom-6 right-[50px] flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white">
            <svg viewBox="0 0 41.67 37.5" class="food-icon h-[38px] w-[42px] text-moon-period-predicted" fill="currentColor" aria-hidden="true">
              <path d="M 35.4167 33.3333 L 2.0833 33.3333 C 0.9375 33.3333 0 34.2708 0 35.4167 C 0 36.5625 0.9375 37.5 2.0833 37.5 L 35.4167 37.5 C 36.5625 37.5 37.5 36.5625 37.5 35.4167 C 37.5 34.2708 36.5625 33.3333 35.4167 33.3333 Z M 37.5 0 L 14.5833 0 L 14.5833 5 L 18.3542 8.0208 C 18.6042 8.2083 18.75 8.5208 18.75 8.8333 L 18.75 17.7083 C 18.75 18.2917 18.2917 18.75 17.7083 18.75 L 9.375 18.75 C 8.7917 18.75 8.3333 18.2917 8.3333 17.7083 L 8.3333 8.8333 C 8.3333 8.5208 8.4792 8.2083 8.7292 8.0208 L 12.5 5 L 12.5 0 L 8.3333 0 C 6.0417 0 4.1667 1.875 4.1667 4.1667 L 4.1667 20.8333 C 4.1667 25.4375 7.8958 29.1667 12.5 29.1667 L 25 29.1667 C 29.6042 29.1667 33.3333 25.4375 33.3333 20.8333 L 33.3333 14.5833 L 37.5 14.5833 C 39.7917 14.5833 41.6667 12.7083 41.6667 10.4167 L 41.6667 4.1667 C 41.6667 1.875 39.7917 0 37.5 0 Z M 37.5 10.4167 L 33.3333 10.4167 L 33.3333 4.1667 L 37.5 4.1667 L 37.5 10.4167 Z" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          class="relative h-[188px] flex-[162] overflow-hidden rounded-[20px] bg-moon-lavender-soft text-left shadow-[0_2px_7px_rgba(0,0,0,0.25)] transition active:scale-[0.98]"
          @click="navigateTo('/guide')"
        >
          <span aria-hidden="true" class="absolute bottom-[-2px] left-0 h-[114px] w-[118px] rounded-full bg-moon-lavender/[0.29]" />
          <span class="absolute left-[22px] top-5 text-base font-semibold leading-6">ตอนนี้<br>ปวดตรงไหน</span>
          <span class="press-hint press-hint-pain absolute bottom-[29px] right-[49px] flex h-[65px] w-[65px] items-center justify-center rounded-full bg-white">
            <svg viewBox="0 0 35 35" class="h-[35px] w-[35px] text-moon-lavender" fill="currentColor" aria-hidden="true">
              <path d="M 29.4691 0 L 33.1466 9.66 C 36.3322 18.0367 35.3718 27.4167 30.57 35 L 18.9754 35 L 18.9754 27.8367 L 25.37 21.4433 L 23.3088 19.39 L 17.4998 25.1533 L 11.7142 19.39 L 9.6529 21.4433 L 16.0475 27.8367 L 16.0475 35 L 4.4295 35 C 2.0594 31.2635 0.593 27.0297 0.1458 22.6322 C -0.3013 18.2348 0.2831 13.794 1.8529 9.66 L 5.507 0 L 29.4691 0 Z M 18.0151 2.8933 L 16.6799 2.8933 C 13.4944 2.8933 11.8781 6.6967 14.0565 8.9833 L 15.4151 10.3833 L 11.5502 14.5833 L 13.7052 16.5433 L 15.8836 14.1867 L 17.4529 12.5067 L 21.3412 16.5667 L 23.4493 14.56 L 19.4439 10.3833 L 20.6385 9.1467 C 22.8403 6.86 21.2944 2.8933 18.0151 2.8933 Z M 18.0151 5.81 C 18.3196 5.81 18.5538 5.9733 18.6709 6.2767 C 18.8115 6.58 18.7646 6.8833 18.5304 7.1167 L 17.4295 8.26 L 16.1881 6.9533 C 15.7664 6.5333 16.0709 5.81 16.6799 5.81 L 18.0151 5.81 Z" />
            </svg>
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="toastMessage"
      class="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6"
    >
      <div class="rounded-full bg-moon-ink px-4 py-2 text-[13px] font-normal text-white shadow-lg">
        {{ toastMessage }}
      </div>
    </div>

    <!-- ป๊อปอัพถาม: หมดหรือยัง / มาหรือยัง / ใกล้ถึงรอบ (เลือกข้อความจาก visiblePrompt) -->
    <PromptDialog
      v-if="visiblePrompt"
      :title="visiblePrompt.title"
      :message="visiblePrompt.message"
      :primary-label="visiblePrompt.primaryLabel"
      :secondary-label="visiblePrompt.secondaryLabel"
      @primary="onPromptPrimary"
      @secondary="onPromptSecondary"
    />

    <!-- เมนูที่เด้งขึ้นมาตอนกดวันในแถบ -->
    <PeriodDaySheet
      v-if="selectedDate && profileId !== null"
      popup
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

  <!-- ระหว่างดึงข้อมูล: ขึ้นกระต่ายรอโหลด (หน้าจริงโผล่หลังโหลดเสร็จ) -->
  <LoadingOverlay v-else />
</template>

<style scoped>
/* วงกลมไอคอนบนการ์ดลัด: ทำท่าเหมือนถูกกดเบาๆ เป็นจังหวะ (ยุบนิดหนึ่งแล้วเด้งกลับ) + วงคลื่นขยายออกจากวงกลม ใบ้ให้รู้ว่ากดได้
   การ์ดสองใบเหลื่อมจังหวะกัน (ใบที่สองช้ากว่า 1.3 วิ) จะได้ไม่กะพริบพร้อมกัน */
.press-hint {
  animation: press-hint 2.6s ease-in-out infinite;
  box-shadow: 0 2px 6px rgba(41, 41, 41, 0.12);
}

.press-hint::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid var(--ring);
  opacity: 0;
  pointer-events: none;
  animation: press-ring 2.6s ease-out infinite;
  animation-delay: inherit;
}

.press-hint-food {
  --ring: #ffa8e6;
}

.press-hint-pain {
  --ring: #ccbbff;
  animation-delay: 1.3s;
}

@keyframes press-hint {
  0%,
  55%,
  100% {
    transform: scale(1);
  }
  68% {
    transform: scale(0.9);
  }
  82% {
    transform: scale(1.06);
  }
}

@keyframes press-ring {
  0%,
  62% {
    opacity: 0;
    transform: scale(0.95);
  }
  68% {
    opacity: 0.8;
    transform: scale(0.95);
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
}

/* การ์ด "วันนี้อยากทานอะไร": ตอนวงกลมทำท่าถูกกด สีจะเปลี่ยนด้วย (ใช้สีที่อยู่บนการ์ดนี้: ครีม -> ชมพู -> ขาว)
   เวลาเดียวกับ press-hint (2.6 วิ) จึงดูเหมือนกดแล้วเปลี่ยนสี */
.press-hint-food {
  animation: press-hint 2.6s ease-in-out infinite, press-color-circle 2.6s ease-in-out infinite;
}

.press-hint-food .food-icon {
  animation: press-color-icon 2.6s ease-in-out infinite;
}

.food-blob {
  animation: press-color-blob 2.6s ease-in-out infinite;
}

@keyframes press-color-circle {
  0%,
  60%,
  100% {
    background-color: #ffffff;
  }
  68% {
    background-color: #feffd4; /* ครีม */
  }
  82% {
    background-color: #ffd7e2; /* ชมพู */
  }
}

@keyframes press-color-icon {
  0%,
  60%,
  100% {
    color: #ffa8e6;
  }
  68% {
    color: #fe7777; /* โคเรล */
  }
  82% {
    color: #ff6e8a;
  }
}

@keyframes press-color-blob {
  0%,
  60%,
  100% {
    background-color: #feffd4;
  }
  75% {
    background-color: #ffd7e2;
  }
}

/* ปุ่มเช็คอิน: ซูมเข้า-ออกเบาๆ เป็นจังหวะ ให้ดูน่ากด
   (ใช้ transform ในอนิเมชัน ส่วนตอนกดจริงยุบด้วย scale แยกต่างหากใน assets/css/press.css จึงไม่ตีกัน) */
.checkin-pulse {
  animation: checkin-pulse 1.9s ease-in-out infinite;
}

@keyframes checkin-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.035);
  }
}

@media (prefers-reduced-motion: reduce) {
  .press-hint,
  .press-hint::after,
  .press-hint-food,
  .press-hint-food .food-icon,
  .food-blob,
  .checkin-pulse {
    animation: none;
  }
}
</style>

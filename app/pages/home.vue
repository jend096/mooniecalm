<script setup lang="ts">
// เลข 28 ทั้งแอปรวมอยู่ที่ app/utils/cycle-config.ts (แก้ที่นั่นที่เดียว)
import { CYCLE_LENGTH_DAYS, DEFAULT_MENSTRUAL_CYCLE_DAYS } from '~/utils/cycle-config'
import { AVATAR_SLOT_COUNT } from '~/utils/login-route'
import type { PeriodPromptCode, PeriodRow } from '~/utils/period-prediction'
// import ตรงๆ เพื่อให้ชัวร์ (ฟังก์ชันใหม่ที่เพิ่งเพิ่ม Nuxt บางทียังไม่รู้จักจนกว่าจะรีสตาร์ต dev server)
import { daysBetween, estimateCycleLength, getDayKind, getPeriodPrompt, getRowEnd } from '~/utils/period-prediction'
import { isCycleFinished } from '~/utils/goal-claim'
// ตัวจำข้อมูลสั้นๆ: กลับมาหน้านี้ภายใน 30 วิ -> โชว์ข้อมูลเดิมทันที แล้วแอบดึงของใหม่ตามหลัง
import { clearPageCache, readPageCache, toCacheJson, writePageCache, writeProfileId } from '~/utils/page-cache'

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
const cycleEndDate = ref<string | null>(null)
// รอบ 28 วันจบแล้วและยังไม่กดรับผล = "รอรับผล" (กฎเดียวกับหน้าเช็คอิน: วันนี้ > วันสุดท้าย วันที่ 28 ยังเช็คอินได้ตามปกติ)
// ตอนนี้การ์ดเป้าหมายจะไม่โชว์วงกลมว่างของรอบใหม่ แต่ให้ข้อความพองขึ้นลงชวนกดไปรับผลก่อน
const awaitingClaim = computed(() => isCycleFinished(cycleEndDate.value, getLocalDateString()))
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

// ครบ 28 วันแล้ว (วันที่ 28 ของรอบ) -> เลขวันขึ้นเอฟเฟกต์
const isCycleComplete = computed(() => daysLogged.value >= CYCLE_LENGTH_DAYS)
// ติ๊กเป้าหมายของวันนี้ครบทุกข้อแล้ว (ต้องมีเป้าหมายอย่างน้อย 1 ข้อ)
const allGoalsChecked = computed(() =>
  activeGoals.value.length > 0 && activeGoals.value.every(g => checkedGoals.value[g.goal_code])
)
// เลขวันขึ้นเอฟเฟกต์สีไล่เฉด + ขยับ เมื่อ "ครบ 28 วัน" หรือ "ติ๊กเป้าหมายครบทุกข้อของวันนี้"
const showDayEffect = computed(() => isCycleComplete.value || allGoalsChecked.value)
// ประกายรอบเลข: ตำแหน่งเป็น % ของกล่องเลข, size = px, delay = วินาที, color = สีประกาย
const doneSparkles = [
  { left: '-14%', top: '-6%', size: 14, delay: 0, color: 'var(--color-period-predicted)' },
  { left: '88%', top: '-12%', size: 11, delay: 0.5, color: 'var(--color-coral)' },
  { left: '96%', top: '58%', size: 15, delay: 1.1, color: 'var(--color-period-predicted)' },
  { left: '-18%', top: '62%', size: 10, delay: 1.6, color: 'var(--color-lavender)' },
  { left: '42%', top: '-22%', size: 9, delay: 0.9, color: 'var(--color-period-day)' }
]
// ประกายที่ใช้จริง: ครบ 28 วัน = ครบ 5 ดวง / แค่ติ๊กครบวันนี้ = โชว์แค่ 2 ดวงเล็กๆ ให้ฟรุ้งฟริ้งนิดเดียว (อยากเพิ่ม/ลด แก้เลข 2 ตรง slice)
const visibleDaySparkles = computed(() => (isCycleComplete.value ? doneSparkles : doneSparkles.slice(0, 2)))

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
  estimateCycleLength(allRows.value.map(r => r.cycle_start_date), cycleDurationDays.value ?? DEFAULT_MENSTRUAL_CYCLE_DAYS)
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
  clearPageCache() // ข้อมูลรอบเปลี่ยนแล้ว ที่จำไว้เป็นของเก่า
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

// ---------- ผู้ใช้ที่ยังไม่มีวันที่ประจำเดือนล่าสุดในฐานข้อมูล ----------
// ปฏิทินจะโชว์ได้ก็ต่อเมื่อมี "วันที่ประจำเดือนมาล่าสุด" ถ้าตอนสมัครคำตอบข้อนี้ไม่ได้ถูกบันทึก (เป็น null)
// ปฏิทินจะหายไปเฉยๆ เลยแสดงการ์ดให้กรอกตรงนี้แทน กดบันทึกแล้วปฏิทินขึ้นทันที
const setupDate = ref('') // วันที่ที่เลือกในช่อง (รูปแบบ YYYY-MM-DD)
const savingSetup = ref(false)
const setupError = ref('')
const todayIso = getLocalDateString() // ห้ามเลือกวันในอนาคต

async function saveFirstPeriod() {
  if (!setupDate.value || profileId.value === null || savingSetup.value) return
  savingSetup.value = true
  setupError.value = ''
  const authed = await getAuthedSupabaseClient()
  // ถ้าช่องจำนวนวันที่มา / ความยาวรอบยังว่าง ใส่ค่ามาตรฐาน 5 วัน / 28 วัน
  const duration = periodDurationDays.value ?? 5
  const cycle = cycleDurationDays.value ?? DEFAULT_MENSTRUAL_CYCLE_DAYS
  const { error } = await authed
    .from('user_profiles')
    .update({ last_period_date: setupDate.value, period_duration_days: duration, cycle_duration_days: cycle })
    .eq('id', profileId.value)
  savingSetup.value = false
  if (error) {
    setupError.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'
    return
  }
  clearPageCache()
  // อัปเดตค่าในหน้า → hasPeriodData เป็นจริง → ปฏิทินโผล่ขึ้นมาทันที
  profileLastPeriod.value = setupDate.value
  lastPeriodDate.value = setupDate.value
  periodDurationDays.value = duration
  cycleDurationDays.value = cycle
  await nextTick()
  stripRef.value?.querySelector('[data-today]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
}

// ข้อมูลทั้งหมดที่หน้านี้ใช้ (รวมเป็นก้อนเดียว เพื่อจำไว้ใน page-cache ได้)
interface HomeSnapshot {
  profile: {
    id: number
    nickname: string | null
    profile_image_url: string | null
    last_period_date: string | null
    period_duration_days: number | null
    cycle_duration_days: number | null
  }
  avatarRows: { feature_slot: string, current_asset_code: string | null }[]
  goalTypes: GoalType[]
  userGoals: { goal_type_id: number }[]
  cycle: { cycle_start_date: string | null, cycle_end_date: string | null } | null
  checkin: Record<string, unknown> | null
  periodRows: PeriodRow[]
}

// เอาข้อมูลในก้อนไปใส่ตัวแปรของหน้า (ใช้ทั้งตอนโชว์ของที่จำไว้ และตอนได้ข้อมูลใหม่)
function applySnapshot(snap: HomeSnapshot) {
  const profile = snap.profile
  profileId.value = profile.id
  profileLastPeriod.value = profile.last_period_date ?? null
  nickname.value = profile.nickname ?? ''
  profileImageUrl.value = profile.profile_image_url ?? ''
  lastPeriodDate.value = profile.last_period_date ?? null
  periodDurationDays.value = profile.period_duration_days ?? null
  cycleDurationDays.value = profile.cycle_duration_days ?? null

  // ถ้ามีรอบประจำเดือนที่บันทึกไว้ ให้ใช้วันเริ่มรอบล่าสุดแทนค่าจากโปรไฟล์
  savedRows.value = snap.periodRows
  if (savedRows.value.length > 0) {
    lastPeriodDate.value = savedRows.value.at(-1)!.cycle_start_date
  }

  for (const row of snap.avatarRows) {
    if (row.feature_slot in avatarState.value) {
      avatarState.value[row.feature_slot as keyof typeof avatarState.value] = row.current_asset_code
    }
  }

  const goalTypeById = new Map(snap.goalTypes.map(g => [g.id, g]))
  activeGoals.value = snap.userGoals
    .map(g => goalTypeById.get(g.goal_type_id))
    .filter((g): g is GoalType => !!g)

  const today = getLocalDateString()
  cycleStartDate.value = snap.cycle?.cycle_start_date ?? today
  cycleEndDate.value = snap.cycle?.cycle_end_date ?? null

  const nextChecked: Record<string, boolean> = {}
  for (const goal of activeGoals.value) {
    const column = GOAL_CODE_TO_COLUMN[goal.goal_code]
    nextChecked[goal.goal_code] = column ? Boolean(snap.checkin?.[column]) : false
  }
  checkedGoals.value = nextChecked

  loadDismissedPrompts()
}

// เลื่อนแถบวันให้วันนี้อยู่ตรงกลาง (ต้องรอให้หน้าวาดเสร็จก่อน)
async function scrollStripToToday() {
  await nextTick()
  stripRef.value?.querySelector('[data-today]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  updateVisibleMonth()
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }

  const authUserId = sessionData.session.user.id

  // เพิ่งเข้าหน้านี้มาไม่ถึง 30 วิ -> โชว์ข้อมูลที่จำไว้ทันที (ไม่ขึ้นหน้าโหลด) แล้วดึงของใหม่เงียบๆ ต่อด้านล่าง
  const cached = readPageCache<HomeSnapshot>(authUserId, 'home')
  const cachedJson = cached ? toCacheJson(cached) : ''
  if (cached) {
    applySnapshot(cached)
    isLoading.value = false
    await scrollStripToToday()
  }

  const authed = await getAuthedSupabaseClient()

  const { data: profile, error: profileError } = await authed
    .from('user_profiles')
    .select('id, nickname, profile_image_url, last_period_date, period_duration_days, cycle_duration_days')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!profile && !profileError) {
    clearPageCache()
    await supabase.auth.signOut()
    navigateTo('/onboarding/signup')
    return
  }

  if (profileError || !profile) {
    isLoading.value = false // ถ้ามีของที่จำไว้โชว์อยู่ก็ปล่อยไว้อย่างนั้น
    return
  }

  writeProfileId(authUserId, profile.id) // หน้าอื่นจะได้ไม่ต้องถามเลขโปรไฟล์ซ้ำ

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

  // ข้อมูลอวตารในฐานข้อมูลไม่ครบ 4 ชิ้น (เช่น สมัครค้าง/บันทึกไม่ครบ) -> ไม่ให้เข้าหน้านี้ (ไม่งั้นอวตารขึ้นโล่งๆ)
  // ส่งไปหน้าเข้าสู่ระบบ ซึ่งจะพาไปตอบคำถามสร้างอวตารที่ step-3 ต่อ (เช็คเฉพาะตอนดึงสำเร็จ กันเน็ตหลุดแล้วเด้งมั่ว)
  if (!avatarRowsRes.error && (avatarRowsRes.data ?? []).length < AVATAR_SLOT_COUNT) {
    clearPageCache()
    navigateTo('/onboarding/signup')
    return
  }

  // ยังไม่ได้เลือกเป้าหมายเลย (เช่น รีเซ็ต/ออกจากระบบก่อนเลือกเป้าหมาย) -> ส่งไปหน้าเลือกเป้าหมาย (onboarding/reveal) ก่อน ไม่ให้เข้าหน้าหลักที่การ์ดเป้าหมายว่าง
  // เลือกเสร็จหน้านั้นจะพากลับมาหน้าหลักเอง (เช็คเฉพาะตอนดึงสำเร็จ กันเน็ตหลุดแล้วเด้งมั่ว / ไม่จำข้อมูลนี้ลง cache เพราะจะไม่ได้อยู่หน้านี้อยู่แล้ว)
  if (!userGoalsRes.error && (userGoalsRes.data ?? []).length === 0) {
    clearPageCache()
    navigateTo('/onboarding/reveal')
    return
  }

  // ดึงบางอย่างไม่สำเร็จ (เช่นเน็ตหลุดช่วงสั้นๆ): ถ้ามีของที่จำไว้โชว์อยู่แล้วก็คงไว้ ไม่เอาข้อมูลโหว่ๆ ไปทับ
  const hasQueryError = [avatarRowsRes, goalTypesRes, userGoalsRes, cycleRes, checkinRes, periodRowsRes].some(r => r.error)
  if (hasQueryError && cached) {
    return
  }

  const fresh: HomeSnapshot = {
    profile,
    avatarRows: (avatarRowsRes.data ?? []) as HomeSnapshot['avatarRows'],
    goalTypes: (goalTypesRes.data ?? []) as GoalType[],
    userGoals: (userGoalsRes.data ?? []) as HomeSnapshot['userGoals'],
    cycle: cycleRes.data ?? null,
    checkin: (checkinRes.data ?? null) as HomeSnapshot['checkin'],
    periodRows: (periodRowsRes.data ?? []) as PeriodRow[]
  }

  // ข้อมูลครบดี -> จำไว้ใช้รอบหน้า (ถ้าดึงไม่ครบ ไม่จำ จะได้ไม่จำของที่โหว่)
  if (!hasQueryError) writePageCache(authUserId, 'home', fresh)

  // ข้อมูลใหม่เหมือนที่โชว์อยู่แล้ว = ไม่ต้องวาดซ้ำ (หน้าจะไม่กระตุก) / ต่างกัน = อัปเดตตาม
  if (toCacheJson(fresh) !== cachedJson) applySnapshot(fresh)
  isLoading.value = false

  if (!cached) await scrollStripToToday()
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

</script>

<template>
  <div
    v-if="!isLoading"
    class="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-moon-bg to-moon-bg-end text-moon-ink"
  >
    <!-- ลายตกแต่งด้านหลัง (ตามฟิกม่า: วงโคเรลฟุ้ง + แถบขาวจาง)
         เดิมใช้ CSS blur (blur-[100px] / blur-[25px]) แต่ Safari บน iPhone วาดช้ามาก ทำให้กดเปลี่ยนมาหน้านี้แล้วค้างราว 1 วินาที
         เลยใช้ไล่สีธรรมดาแทน (หน้าตาใกล้เคียง แต่เบากว่ามาก) ห้ามกลับไปใช้ blur / backdrop-blur ในหน้านี้ -->
    <div aria-hidden="true" class="pointer-events-none absolute left-[calc(37%-100px)] top-[34px] h-[355px] w-[297px]" style="background: radial-gradient(closest-side, color-mix(in srgb, var(--color-coral) 26%, transparent), transparent)" />
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-[292px] h-[498px] bg-moon-card" style="mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" />

    <!-- ประกายดาวจางๆ ลอยอยู่หลังเนื้อหา -->
    <AmbientSparkles />

    <div class="relative z-10 flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <!-- หัวหน้า: รูปโปรไฟล์ + ทักทาย (ปุ่มออกจากระบบย้ายไปอยู่ในเมนูโลโก้มุมขวาบนแล้ว ดู BrandCorner.vue) -->
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
      </div>

      <!-- ยังไม่มีวันที่ประจำเดือนล่าสุด: ให้กรอกตรงนี้ (กรอกแล้วปฏิทินด้านล่างจะขึ้นเอง) -->
      <div v-if="!hasPeriodData" class="mx-[38px] mt-[19px] rounded-[24px] border border-moon-pink-soft bg-moon-card p-4">
        <p class="text-base font-semibold text-moon-ink">ประจำเดือนมาล่าสุดวันไหน?</p>
        <p class="mt-1 text-sm text-moon-ink/70">ใส่วันที่ไว้ก่อน เดี๋ยวปฏิทินจะคำนวณรอบให้เลย</p>
        <div class="mt-3 flex items-center gap-2">
          <input
            v-model="setupDate"
            type="date"
            :max="todayIso"
            class="h-[40px] min-w-0 flex-1 rounded-xl border border-moon-gray bg-white px-3 text-sm text-moon-ink"
          >
          <button
            type="button"
            class="h-[40px] shrink-0 rounded-full bg-moon-ink px-4 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50"
            :disabled="!setupDate || savingSetup"
            @click="saveFirstPeriod"
          >{{ savingSetup ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
        </div>
        <p v-if="setupError" class="mt-2 text-xs text-moon-period">{{ setupError }}</p>
      </div>

      <div v-if="hasPeriodData">
        <!-- แถวบน: ชื่อเดือน (ซ้าย) + ปุ่มเปิดหน้าปฏิทินเต็ม (ขวา) -->
        <div class="mt-[19px] flex items-center justify-between gap-3 pl-[47px] pr-[36px]">
          <p class="text-base font-semibold">{{ visibleMonthLabel }}</p>
          <button
            type="button"
            class="flex h-[42px] items-center gap-[5px] rounded-[35px] border border-moon-pink-soft bg-moon-card py-[5px] pl-[5px] pr-3 text-sm font-medium transition active:scale-95"
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
            class="flex h-[90px] shrink-0 basis-[calc((100%-52px)/5)] flex-col items-center rounded-[28px] pt-[5px] shadow-[0_1px_9px_color-mix(in_srgb,var(--color-muted)_19%,transparent)] transition active:scale-95 bg-moon-card"
            @click="onDayClick(day.date)"
          >
            <!-- ตัวย่อวัน อา จ อ ... อยู่เหนือตัวเลข (วันนี้ = ตัวใหญ่ขึ้นนิดหน่อย สีดำ เพราะพื้นแคปซูลเป็นสีขาว) -->
            <span
              class="font-medium"
              :class="day.isToday ? 'text-base leading-6' : 'text-sm leading-[22px]'"
            >{{ day.weekday }}</span>
            <!-- วงกลมตัวเลข (แคปซูลวันนี้พื้นขาวเหมือนวันอื่น ต่างกันที่วงกลมข้างใน):
                 สี (จาก tokens.css ผ่านชื่อสีเดิมใน tailwind.config.ts): วันนี้ = bg-moon-ink (292929 เหมือนปุ่มหลัก) / วันประจำเดือนมา = bg-moon-period (FF6E8A) / วันคาดไว้ = เส้นประ border-moon-period-predicted (FFA8E6) / วันธรรมดา = bg-moon-chip
                 วันนี้ = วงกลมสีเดียวกับปุ่มหลัก (mt-[8px] ทำให้ตัวเลขอยู่ระดับเดียวกับวันอื่น: ตัวย่อวันของวันนี้สูง 24px + 8 = 32px เท่ากับวันอื่นที่ 22px + mt-[10px]) ตัวเลขขาว ขนาด/น้ำหนัก medium (text-base font-medium) + ถ้าวันนี้เป็นวันประจำเดือนมา มีจุดกลมเล็กสีประจำเดือนอยู่ใต้ตัวเลข
                 วันที่มีประจำเดือน = สีเข้ม ตัวเลขขาว / วันที่คาดไว้ = เส้นประ / วันธรรมดา = เทาอ่อน -->
            <span
              class="flex shrink-0 items-center justify-center rounded-full tabular-nums"
              :class="{
                'relative mt-[8px] h-[42px] w-[42px] bg-moon-ink text-base font-medium text-moon-on-ink': day.isToday,
                'mt-[10px] h-[42px] w-[42px] bg-moon-period text-sm font-medium text-moon-on-ink': !day.isToday && day.kind === 'logged',
                'mt-[10px] h-[48px] w-[48px] border-[3px] border-dashed border-moon-period-predicted bg-moon-chip text-sm font-medium': !day.isToday && day.kind === 'predicted',
                'mt-[10px] h-[42px] w-[42px] bg-moon-chip text-sm font-medium': !day.isToday && day.kind === 'none'
              }"
            >
              {{ day.dayNumber }}
              <!-- จุดบอกสีประจำเดือนใต้ตัวเลข (เฉพาะวันนี้ที่เป็นวันประจำเดือนมา) ลอยทับ (absolute) จึงไม่ดันตัวเลขให้ขยับ ตัวเลขอยู่กึ่งกลางเท่าวันอื่น
                   ขนาดปรับที่ h-[5px] w-[5px] / ระยะจากขอบล่างวงกลมปรับที่ bottom-[4px] -->
              <span
                v-if="day.isToday && day.kind === 'logged'"
                aria-hidden="true"
                class="absolute bottom-[4px] left-1/2 block h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-moon-period"
              />
            </span>
          </button>
        </div>

        <!-- ข้อความสถานะ: รูปแบบเดิม (แคปซูลขอบโคเรล) แค่ทำตัวอักษรหนาขึ้น
             ความหนาตัวอักษรปรับที่ font-semibold ตรง <p> ด้านล่าง (เบาลง = font-medium / หนาขึ้นอีก = font-bold) -->
        <!-- ป้ายนี้เป็นปุ่ม: กดแล้วไปหน้าปฏิทิน (/calendar) / relative z-10 = ลอยอยู่หน้าฉากอวตาร (ฉากถูกดึงขึ้นมาซ้อนอยู่หลังป้าย ดูที่ -mt- ของ AvatarScene ด้านล่าง) -->
        <div class="relative z-10 mt-px flex justify-center">
          <button
            type="button"
            class="flex min-h-[44px] items-center rounded-[24px] border border-moon-coral bg-moon-bg px-[11px] text-center text-sm font-semibold transition active:scale-95"
            @click="navigateTo('/calendar')"
          >
            {{ periodStatusText }}
          </button>
        </div>

        <p v-if="periodMessage" class="relative z-10 mt-2 px-[38px] text-center text-xs text-moon-muted">
          {{ periodMessage }}
        </p>
      </div>

      <!-- รูปอวตารเต็มความกว้าง + ปุ่มแชร์มุมขวาล่าง -->
      <!-- ปรับตรงนี้:
           :bunny-scale = ขนาดตัวกระต่าย (1 = เต็ม, 0.65 = เล็กลง 35%) พื้นหลังไม่ย่อ (ดู components/AvatarScene.vue)
           :crop-top    = ตัดส่วนบนของฉากที่ว่างทิ้ง (0.22 = ตัดออกราว 1 ใน 5) ยิ่งมาก การ์ดเช็คอิน/ปุ่มทางลัดยิ่งขึ้นมาสูง
                          แต่เกิน ~0.25 พระอาทิตย์กับเมฆจะเริ่มโดนตัดขอบบน
           -mb-[28px]   = ดึงการ์ดเป้าหมายขึ้นมาซ้อนส่วนว่างใต้เงาพื้น (เกิน -mb-[36px] การ์ดจะทับเงาพื้นกระต่าย) -->
      <!-- -mt-[40px] = ดึงฉากอวตารขึ้นมาซ้อนอยู่หลังป้ายสถานะประจำเดือน (ป้ายมี z-10 อยู่ด้านหน้า) / ขึ้นอีก = เลขติดลบมากขึ้น เช่น -mt-[60px] / ไม่มีแถบประจำเดือน = ไม่ดึง -->
      <AvatarScene :layers="avatarLayers" :bunny-scale="0.65" :crop-top="0.22" class="-mb-[28px]" :class="hasPeriodData ? '-mt-[40px]' : ''" @layer-error="hideLayer">
        <button
          type="button"
          class="absolute bottom-[36px] right-[21px] z-10 flex h-[55px] w-[55px] items-center justify-center rounded-full bg-moon-card shadow-[0_1px_6px_color-mix(in_srgb,var(--color-muted)_20%,transparent)]"
          aria-label="แชร์"
          :disabled="isSharing"
          @click="share"
        >
          <FaIcon name="arrow-up-from-bracket" class="h-[22px] w-[19px] text-moon-muted" />
        </button>
      </AvatarScene>

      <!-- การ์ดเป้าหมายของฉัน (ขาวกึ่งโปร่งแสง) -->
      <!-- ทุกส่วนเรียงในลำดับปกติ (ไม่ล็อกตำแหน่ง) ความสูงการ์ดเลยพอดีเนื้อหา:
           เป้าหมายน้อยการ์ดก็เตี้ยลง เป้าหมายเยอะการ์ดก็สูงขึ้นเอง ไม่เหลือที่ว่างเกินไป -->
      <!-- relative z-10 = การ์ดอยู่เหนือฉากอวตาร (ฉากเป็นชั้นที่วางตำแหน่งไว้ ถ้าไม่ใส่จะทับการ์ดตรงส่วนที่ซ้อนกันด้วย -mb-[28px]) -->
      <div
        class="relative z-10 mx-[35px] mt-[14px] rounded-[15px] bg-moon-card/80 shadow-[0_3px_8px_rgba(0,0,0,0.25)]"
        :class="awaitingClaim ? 'goal-card-await' : ''"
      >
        <h2 class="px-[23px] pt-[21px] text-lg font-medium leading-[26px]">เป้าหมายของฉัน</h2>

        <div class="mt-[12px] flex items-center px-[23px]">
          <!-- ซ้าย: จำนวนวันที่เช็คอิน (กว้างคงที่ ให้รายการเป้าหมายเริ่มที่ตำแหน่งเดิม) -->
          <p class="flex w-[142px] shrink-0 items-baseline gap-[6px]">
            <span class="text-lg">วัน</span>
            <!-- ครบ 28 วัน: เลขเปลี่ยนเป็นสีของประจำเดือน (ไล่เฉด --color-period-day -> --color-period-predicted ใน assets/css/tokens.css)
                 ขยับเบาๆ + มีประกายระยิบรอบเลข ให้รู้ว่าทำครบแล้ว -->
            <span class="relative inline-block">
              <!-- แยกเป็น 2 ชั้น: ชั้นนอกขยับ (days-done-wiggle) / ชั้นในไล่สีในตัวอักษร (days-done-text)
                   ถ้าใส่ทั้งขยับและไล่สีบน element เดียวกัน Safari บน iPhone จะทำให้เลขกะพริบหายเป็นช่วงๆ -->
              <span class="inline-block" :class="showDayEffect ? 'days-done-wiggle' : ''">
                <span
                  class="inline-block text-[48px] font-semibold leading-none"
                  :class="showDayEffect ? 'days-done-text' : 'text-moon-period'"
                >{{ String(daysLogged).padStart(2, '0') }}</span>
              </span>
              <template v-if="showDayEffect">
                <svg
                  v-for="(star, i) in visibleDaySparkles"
                  :key="i"
                  viewBox="0 0 24 24"
                  class="days-done-star pointer-events-none absolute"
                  :style="{ left: star.left, top: star.top, width: `${star.size}px`, height: `${star.size}px`, animationDelay: `${star.delay}s`, color: star.color }"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
                </svg>
              </template>
            </span>
            <span class="text-lg" :class="isCycleComplete ? 'text-moon-period' : 'text-moon-ink/[0.27]'">/{{ CYCLE_LENGTH_DAYS }}</span>
          </p>

          <!-- ขวา: เส้นเวลาเป้าหมาย + สถานะ (กล่องกว้างพอดีข้อความที่ยาวที่สุด ข้อความยังอยู่บรรทัดเดียว) -->
          <div v-if="activeGoals.length" class="min-w-0 flex-1">
            <div class="flex w-max max-w-full flex-col gap-[2px]">
              <div
                v-for="(goal, gi) in activeGoals"
                :key="goal.id"
                class="relative flex h-[22px] items-center gap-[8px]"
              >
                <!-- ก้อนกลมหน้าข้อความ + เส้นโยงจากข้อบนลงมาหาก้อนนี้ (เว้นช่องว่างสั้นๆ ที่หัวท้ายเส้น ไม่ชนก้อนกลม)
                     ข้อที่ทำแล้ว = สีชมพูหลัก / ยังไม่ทำ = สีเทา  (แก้สีที่ bg-moon-period และ bg-moon-ink/20)
                     ก้อนกลมกว้าง 10px: ถ้าเปลี่ยนขนาดก้อน ต้องปรับ -top-[12px] h-[10px] ของเส้นให้เว้นช่องไฟเท่าเดิมด้วย -->
                <span aria-hidden="true" class="relative block h-[10px] w-[10px] shrink-0">
                  <span
                    v-if="gi > 0"
                    class="absolute -top-[12px] left-1/2 block h-[10px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-300"
                    :class="awaitingClaim || checkedGoals[goal.goal_code] ? 'bg-moon-period' : 'bg-moon-ink/20'"
                  />
                  <span
                    class="block h-[10px] w-[10px] rounded-full transition-colors duration-300"
                    :class="awaitingClaim || checkedGoals[goal.goal_code] ? 'bg-moon-period' : 'bg-moon-ink/20'"
                  />
                </span>
                <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ goal.title }}</span>
                <!-- ช่องสถานะกว้างเท่ากันทุกแถว: ยังไม่ทำ = วงกลมเปล่ารอ / ทำแล้ว = วงกลมสีชมพูหลัก + ติ๊กถูกสีขาว (เด้งโผล่เบาๆ) -->
                <!-- รอรับผล (รอบจบแล้ว) = ไม่โชว์วงกลมสถานะเลย (ยังไม่รู้ผลผ่าน/ไม่ผ่านจนกว่าจะกดรับ) -->
                <span v-if="!awaitingClaim" class="flex w-[18px] shrink-0 justify-start">
                  <span
                    v-if="checkedGoals[goal.goal_code]"
                    class="goal-tick flex h-[18px] w-[18px] items-center justify-center rounded-full bg-moon-period"
                    aria-label="สำเร็จ"
                  >
                    <FaIcon name="check" class="h-[9px] w-[9px] text-white" />
                  </span>
                  <span v-else aria-hidden="true" class="h-[18px] w-[18px] rounded-full border-[1.5px] border-moon-ink/25" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ปุ่มเช็คอิน / รับผลรอบ 28 วัน: ขนาด มุมโค้ง ตัวอักษร ใช้ค่ามาตรฐานเดียวกับปุ่ม "ถัดไป" (BaseButton ← tokens.css: --btn-height / --btn-radius / --btn-font-size) ไม่ตั้งค่าเฉพาะปุ่มนี้แล้ว / px-[56px] = ระยะซ้ายขวาเท่ากัน ตัวหนังสืออยู่กลางปุ่มพอดี (วงกลมลูกศรลอยอยู่ขวาสุดด้วย absolute ไม่ดันข้อความ) -->
        <button
          type="button"
          class="btn-primary checkin-pulse relative mx-[13px] mb-[12px] mt-[16px] w-[calc(100%-26px)] px-[56px]"
          @click="goToCheckin"
        >
          {{ awaitingClaim ? `รับผลรอบ ${CYCLE_LENGTH_DAYS} วัน` : 'เช็คอินกันเถอะ' }}
          <!-- <span class="absolute right-[12px] flex h-[35px] w-[35px] items-center justify-center rounded-full bg-moon-coral">
            <img src="/icons/checkin-arrow.svg" alt="" aria-hidden="true" class="h-[15px] w-[15px]">
          </span> -->
        </button>
      </div>

      <!-- การ์ดลัด 2 ใบ: อยากทานอะไร / ปวดตรงไหน -->
      <div class="mt-[24px] flex gap-[21px] pl-[33px] pr-[42px]">
        <button
          type="button"
          class="relative h-[188px] flex-[170] overflow-hidden rounded-[20px] bg-moon-cream-soft text-left shadow-[0_2px_7px_rgba(0,0,0,0.25)] transition active:scale-[0.98]"
          @click="navigateTo('/snack')"
        >
          <!-- ลำดับชั้น (ล่างสุด -> บนสุด): รูปเล็กๆ ข้างหลัง -> กระต่ายตัวใหญ่ -> ข้อความ -> ฟองหัวใจใหญ่ (ทับหูกระต่าย) -> วงกลมไอคอนถ้วย
               ทุกรูปเป็นเวกเตอร์ SVG ที่ export จาก Figma (หน้า homev2) เก็บไว้ที่ public/home/
               คลาส float-bit = รูปเล็กๆ ขยับลอยขึ้นลง/เอียงนิดๆ อยู่กับที่ (ดู CSS ด้านล่าง)
               --float-delay = เลื่อนจังหวะให้แต่ละรูปไม่ขยับพร้อมกัน -->
          <img src="/home/food-mark-left.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none left-[5px] top-[79.74px] h-[17.44px] w-[18.69px]" style="--float-delay: -0.8s">
          <!-- ใน Figma ฟองหัวใจมุมขวาบนวางซ้อนกัน 2 ชั้น (สีเลยเข้มกว่าฟองซ้ายล่าง) ทำซ้อน 2 รูปให้เหมือนกัน -->
          <img src="/home/food-mark-right.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none left-[127px] top-[38px] h-[17.44px] w-[18.69px]" style="--float-delay: 0s">
          <img src="/home/food-mark-right.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none left-[127px] top-[38px] h-[17.44px] w-[18.69px]" style="--float-delay: 0s">
          <img src="/home/food-dot.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none left-[150px] top-[111px] h-[8.94px] w-[9.59px]" style="--float-delay: -2.2s">
          <img src="/home/food-rabbit.svg" alt="" aria-hidden="true" class="pointer-events-none absolute left-0 top-[35px] h-[155px] w-[155.27px] max-w-none">
          <span class="absolute left-5 top-5 text-base font-semibold leading-6">วันนี้<br>อยากทานอะไร</span>
          <img src="/home/food-bubble.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none left-[95px] top-[127px] h-[49.75px] w-[51.47px]" style="--float-delay: -1.6s">
          <span class="absolute bottom-[5px] left-[5px] flex h-[70px] w-[70px] items-center justify-center rounded-full bg-moon-card">
            <svg viewBox="0 0 41.67 37.5" class="h-[38px] w-[42px] text-moon-period-predicted" fill="currentColor" aria-hidden="true">
              <path d="M 35.4167 33.3333 L 2.0833 33.3333 C 0.9375 33.3333 0 34.2708 0 35.4167 C 0 36.5625 0.9375 37.5 2.0833 37.5 L 35.4167 37.5 C 36.5625 37.5 37.5 36.5625 37.5 35.4167 C 37.5 34.2708 36.5625 33.3333 35.4167 33.3333 Z M 37.5 0 L 14.5833 0 L 14.5833 5 L 18.3542 8.0208 C 18.6042 8.2083 18.75 8.5208 18.75 8.8333 L 18.75 17.7083 C 18.75 18.2917 18.2917 18.75 17.7083 18.75 L 9.375 18.75 C 8.7917 18.75 8.3333 18.2917 8.3333 17.7083 L 8.3333 8.8333 C 8.3333 8.5208 8.4792 8.2083 8.7292 8.0208 L 12.5 5 L 12.5 0 L 8.3333 0 C 6.0417 0 4.1667 1.875 4.1667 4.1667 L 4.1667 20.8333 C 4.1667 25.4375 7.8958 29.1667 12.5 29.1667 L 25 29.1667 C 29.6042 29.1667 33.3333 25.4375 33.3333 20.8333 L 33.3333 14.5833 L 37.5 14.5833 C 39.7917 14.5833 41.6667 12.7083 41.6667 10.4167 L 41.6667 4.1667 C 41.6667 1.875 39.7917 0 37.5 0 Z M 37.5 10.4167 L 33.3333 10.4167 L 33.3333 4.1667 L 37.5 4.1667 L 37.5 10.4167 Z" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          class="relative h-[188px] flex-[162] overflow-hidden rounded-[20px] bg-moon-lavender-soft text-left shadow-[0_2px_7px_rgba(0,0,0,0.25)] transition active:scale-[0.98]"
          @click="navigateTo('/guide')"
        >
          <!-- ลำดับชั้น (ล่างสุด -> บนสุด): ลายเส้นวาดมือด้านบน -> กระต่ายตัวใหญ่ -> ข้อความ -> ฟองคำพูดรูปขยุกขยิก -> วงกลมไอคอน
               ทุกรูปเป็นเวกเตอร์ SVG ที่ export จาก Figma (หน้า homev2) เก็บไว้ที่ public/home/ , float-bit ทำงานเหมือนการ์ดอยากทานอะไร -->
          <img src="/home/pain-doodles.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none left-[8px] top-0 h-[87.33px] w-[122.23px]" style="--float-delay: 0s">
          <img src="/home/pain-rabbit.svg" alt="" aria-hidden="true" class="pointer-events-none absolute left-0 top-[35px] h-[155px] w-[155.27px] max-w-none">
          <span class="absolute left-5 top-5 text-base font-semibold leading-6">ตอนนี้<br>ปวดตรงไหน</span>
          <!-- ฟองขยุกขยิกชิดขวา 17px ตามแบบ Figma (ใช้ right แทน left จะได้ไม่ถูกขอบการ์ดตัดตอนหน้าจอแคบ) -->
          <img src="/home/pain-bubble.svg" alt="" aria-hidden="true" class="float-bit pointer-events-none absolute max-w-none right-[17px] top-[143px] h-[38.16px] w-[41px]" style="--float-delay: -1.2s">
          <span class="absolute bottom-[7px] left-[7px] flex h-[67px] w-[67px] items-center justify-center rounded-full bg-moon-card">
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

    <!-- กำลังสร้างรูปแชร์ -> กระต่ายรอโหลดเต็มจอ -->
    <LoadingOverlay v-if="isSharing" text="กำลังสร้างรูปแชร์..." />
  </div>

  <!-- ระหว่างดึงข้อมูล: ขึ้นกระต่ายรอโหลด (หน้าจริงโผล่หลังโหลดเสร็จ) -->
  <LoadingOverlay v-else />
</template>

<style scoped>
/* เลขวันตอนครบ 28: ไล่เฉดสีของประจำเดือนวิ่งผ่านตัวเลข + เอียง/เด้งเบาๆ
   เปลี่ยนสี: แก้ var(--color-period-day / --color-period-predicted) ด้านล่าง, ความเร็ว: 2.6s (เฉด) และ 2.2s (ขยับ) */
/* ชั้นในสุด: ไล่เฉดสีในตัวอักษร (ไม่มี transform อยู่ชั้นนี้ กันเลขหายบน Safari) */
.days-done-text {
  background: linear-gradient(100deg, var(--color-period-day) 0%, var(--color-period-predicted) 45%, var(--color-period-day) 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: days-done-shimmer 2.6s linear infinite;
}

/* ชั้นนอก: ขยับ/เอียงเบาๆ (ใช้แค่ transform ไม่มีไล่สีอยู่ชั้นนี้) */
.days-done-wiggle {
  animation: days-done-wiggle 2.2s ease-in-out infinite;
  transform-origin: 50% 80%;
}

@keyframes days-done-shimmer {
  to {
    background-position: -200% 0;
  }
}

@keyframes days-done-wiggle {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  20% {
    transform: rotate(-4deg) scale(1.06);
  }
  40% {
    transform: rotate(3deg) scale(1.03);
  }
  60% {
    transform: rotate(-2deg) scale(1.06);
  }
  80% {
    transform: rotate(1deg) scale(1.02);
  }
}

/* ประกายระยิบ: ค่อยๆ โผล่ ขยาย หมุนเล็กน้อย แล้วหายไป วนซ้ำ */
.days-done-star {
  opacity: 0;
  animation: days-done-twinkle 2.2s ease-in-out infinite;
}

@keyframes days-done-twinkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.3) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(35deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .days-done-text,
  .days-done-wiggle,
  .days-done-star {
    animation: none;
  }

  .days-done-star {
    opacity: 0.8;
  }
}

/* รูปเล็กๆ ข้างหลังกระต่ายตัวใหญ่ในการ์ดลัด (อยากทานอะไร / ปวดตรงไหน): ขยับเบาๆ อยู่กับที่
   ลอยขึ้น-ลงนิดหนึ่ง + เอียงซ้าย-ขวานิดหนึ่ง + พองขึ้นนิดหนึ่ง แล้วกลับมาที่เดิม วนซ้ำ (แต่ละรูปเหลื่อมจังหวะกันด้วย --float-delay)
   วงกลมไอคอนไม่ขยับ / ปรับความเร็วที่ 3s, ระยะลอยที่ ±1.5px, ความเอียงที่ ±3deg */
.float-bit {
  transform-origin: center;
  animation: float-bit 3s ease-in-out infinite;
  animation-delay: var(--float-delay, 0s);
}

@keyframes float-bit {
  0%,
  100% {
    transform: translateY(1.5px) rotate(-3deg) scale(1);
  }
  50% {
    transform: translateY(-1.5px) rotate(3deg) scale(1.05);
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
  .float-bit,
  .checkin-pulse {
    animation: none;
  }
}

/* ===== ครบ 28 วัน รอรับผล: ทั้งกล่องเป้าหมายขยับเบาๆ + ขอบเรืองสีชมพู ให้รู้สึกว่าต้องกดเข้าไปรับผล =====
   จังหวะ 1.9s เท่ากับปุ่มเช็คอิน (.checkin-pulse) ทั้งสองอย่างเลยขยับพร้อมกัน ไม่สั่นสวนกัน
   ปรับความแรงที่ scale(1.02) / ความเร็วที่ 1.9s / ความเรืองที่ 14px กับ 45% */
.goal-card-await {
  animation: goal-card-await-pulse 1.9s ease-in-out infinite;
}

@keyframes goal-card-await-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 3px 14px color-mix(in srgb, var(--color-period-day) 45%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .goal-card-await {
    animation: none;
  }
}

/* ===== ติ๊กถูกสำเร็จในการ์ดเป้าหมาย: เด้งโผล่เบาๆ ตอนติ๊ก ===== */
.goal-tick {
  animation: goal-tick-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes goal-tick-pop {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .goal-tick {
    animation: none;
  }
}
</style>

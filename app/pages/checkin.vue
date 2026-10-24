<template>
  <div
    v-if="!isLoading"
    class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[50px] text-moon-ink"
    :class="{ 'view-only': !isToday }"
  >
    <!-- ปุ่มย้อนกลับ -->
    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAEAEA] shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
      aria-label="ย้อนกลับ"
      @click="back"
    >
      <FaIcon name="chevron-left" class="h-[14px] w-2 text-moon-ink" />
    </button>

    <h1 class="text-center text-2xl font-semibold">เช็คอินประจำวัน</h1>

    <!-- กดเปลี่ยนวันในปฏิทิน: ขึ้นหน้ารอโหลดระหว่างดึงข้อมูลของวันนั้น -->
    <LoadingOverlay v-if="isSwitching" text="กำลังโหลดข้อมูลของวันนั้น..." />

    <!-- วันที่ที่กำลังดู: กดเพื่อเปิดปฏิทินเลือกวันเก่าดูย้อนหลัง -->
    <div class="mt-[25px] flex items-center justify-end gap-2">
      <button
        v-if="!isToday"
        type="button"
        class="rounded-full bg-moon-pink px-3 py-[6px] text-xs font-medium transition active:scale-95"
        :disabled="isSwitching"
        @click="changeDay(today)"
      >
        กลับไปวันนี้
      </button>
      <button
        type="button"
        class="flex h-[42px] items-center gap-[5px] rounded-[35px] border border-moon-coral bg-white py-[5px] pl-[5px] pr-3 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition active:scale-95"
        :disabled="isSwitching"
        aria-label="เลือกวันที่"
        @click="showDayPicker = true"
      >
        <span class="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-moon-chip">
          <FaIcon name="calendar-days-regular" class="h-[15px] w-[13px] text-moon-period" />
        </span>
        {{ viewLabel }}
        <FaIcon name="chevron-down" class="ml-1 h-[10px] w-[10px] text-moon-muted" />
      </button>
    </div>

    <!-- หัวหมวด: เป้าหมายวันนี้ -->
    <div class="mt-[26px] flex items-center justify-between">
      <h2 class="text-xl font-medium">{{ isToday ? 'เป้าหมายวันนี้' : 'เป้าหมายของวันนั้น' }}</h2>
      <p v-if="isToday && daysRemaining !== null && !cycleFinished" class="text-xs text-moon-muted">เหลืออีก {{ daysRemaining }} วัน</p>
    </div>

    <!-- รอบ 28 วันครบแล้ว: เปลี่ยนการ์ดเป้าหมายเป็นการ์ดรับผล -->
    <GoalClaimCard
      v-if="isToday && cycleFinished && profileId && openCycleId"
      class="mt-[9px]"
      :profile-id="profileId"
      :goal-cycle-id="openCycleId"
      :active-goal-codes="activeGoals.map(g => g.goal_code)"
      :day-counts="goalDayCounts"
      @claimed="reloadAfterClaim"
    />

    <div v-else class="mt-[9px] flex flex-col gap-[10px]">
      <div
        v-for="goal in activeGoals"
        :key="goal.id"
        class="goal-card flex gap-0 rounded-[24px] border p-5 transition-colors"
        :class="[
          isDone(goal.goal_code)
            ? 'goal-done border-transparent bg-moon-period/45'
            : 'border-moon-pink-soft bg-[#F9F9F9]'
        ]"
      >
        <!-- ซ้าย: ชื่อ + คำอธิบาย + แถบความคืบหน้า -->
        <div class="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p class="text-lg font-medium leading-[26px]" :class="isDone(goal.goal_code) ? 'text-moon-bg' : ''">{{ goal.title }}</p>
          <p class="text-sm leading-[22px]" :class="isDone(goal.goal_code) ? 'text-white' : ''">{{ GOAL_HINTS[goal.goal_code] ?? '' }}</p>
          <!-- จำนวนวันที่ทำสำเร็จในรอบนี้ (ตัวเลขเด่นเหนือแถบ) -->
          <p class="mt-1 text-sm font-medium leading-[22px]">
            ทำมาแล้ว
            <span class="text-lg font-semibold tabular-nums">{{ goalDayCounts[goal.goal_code] ?? 0 }}</span>
            <span class="text-moon-ink/60"> / {{ CYCLE_LENGTH_DAYS }} วัน</span>
          </p>
          <div class="mt-1 h-3 w-[calc(100%-4px)] overflow-hidden rounded-full bg-white">
            <div
              class="h-full rounded-full bg-moon-lavender transition-[width] duration-500"
              :style="{ width: `${Math.min(100, ((goalDayCounts[goal.goal_code] ?? 0) / CYCLE_LENGTH_DAYS) * 100)}%` }"
            />
          </div>
        </div>

        <!-- ขวา: วงกลมติ๊ก (บน) + ป้ายสถานะวันนี้ (ล่าง) -->
        <div class="flex w-[111px] shrink-0 flex-col items-end justify-between">
          <button
            type="button"
            class="relative flex h-[28px] w-[28px] items-center justify-center rounded-full border-2 transition active:scale-90 before:absolute before:-inset-3 before:content-[''] disabled:active:scale-100"
            :class="isDone(goal.goal_code) ? 'border-moon-ink bg-moon-ink' : 'border-moon-period bg-white shadow-sm'"
            :aria-label="`เช็คอิน ${goal.title}`"
            :disabled="!isToday || isAchieved(goal.goal_code)"
            @click="toggleGoal(goal.goal_code, $event)"
          >
            <!-- ยังไม่ติ๊ก = วงกลมว่างๆ ไม่มีเครื่องหมาย / ติ๊กแล้ว = เครื่องหมายถูกใหญ่ชัด -->
            <FaIcon v-if="isDone(goal.goal_code)" name="check" class="h-3 w-[15px] text-white" />
          </button>
          <span
            class="whitespace-nowrap rounded-full px-2 py-2 text-xs leading-[18px]"
            :class="isDone(goal.goal_code) ? 'bg-white text-moon-coral' : 'bg-moon-cream-soft'"
          >
            {{ goalStatusText(goal.goal_code) }}
          </span>
        </div>
      </div>
    </div>

    <!-- เส้นคั่น -->
    <hr class="mt-[30px] border-t border-moon-muted/30">

    <!-- หัวหมวด: บันทึกของวันนี้ -->
    <div class="mt-[13px] flex items-center justify-between">
      <h2 class="text-xl font-medium">{{ isToday ? 'บันทึกของวันนี้' : 'บันทึกของวันนั้น' }}</h2>
      <p class="text-xs text-moon-muted">เรียงตามเวลา</p>
    </div>

    <!-- ไทม์ไลน์: ที่ทำแล้ว → เส้น "ตอนนี้" → ที่ยังไม่ได้ทำ -->
    <div class="mt-[20px] flex flex-col gap-3">
      <p v-if="!timelineDone.length && !timelinePending.length" class="text-sm text-moon-muted">
        {{ isToday ? 'ยังไม่มีบันทึกของวันนี้' : 'วันนั้นไม่มีบันทึกไว้' }}
      </p>

      <div v-for="item in timelineDone" :key="item.key" class="flex gap-[10px]">
        <p class="w-10 shrink-0 text-xs font-medium leading-[18px] text-moon-muted">{{ item.time }}</p>
        <div class="tl-card flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
          <span class="w-1 shrink-0 self-stretch rounded-sm bg-moon-coral" />
          <!-- การ์ดคู่มือกดได้ -> เปิดป๊อปอัพวิธีทำใบเดิมกลับมาอ่านซ้ำ -->
          <div
            class="flex min-w-0 flex-1 flex-col gap-[2px]"
            :class="item.onRead ? 'cursor-pointer' : ''"
            :role="item.onRead ? 'button' : undefined"
            @click="item.onRead?.()"
          >
            <p class="text-sm font-semibold leading-[21px]">{{ item.title }}</p>
            <p v-for="line in item.lines" :key="line" class="text-xs leading-[18px] text-moon-muted">{{ line }}</p>
            <span
              v-if="item.onRead"
              class="read-pill mt-1 inline-flex items-center gap-1 self-start rounded-full border border-moon-lavender bg-moon-lavender-soft px-3 py-[4px] text-xs font-medium leading-[18px]"
            >
              {{ item.readLabel ?? 'อ่านวิธีทำ ›' }}
            </span>
          </div>
          <!-- ทำแล้วแต่ยังไม่ได้บอกความรู้สึก = ปุ่ม / ตอบแล้ว = วงกลมติ๊ก / บันทึกปวด = ไม่มีปุ่ม -->
          <button
            v-if="item.needsFeeling && isToday"
            type="button"
            class="shrink-0 rounded-full border border-moon-coral bg-moon-pink px-3 py-[6px] text-xs font-medium leading-[18px] text-moon-ink shadow-sm transition active:scale-95"
            @click="item.onFeeling?.()"
          >
            บอกความรู้สึก
          </button>
          <span v-else-if="item.kind !== 'pain'" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moon-ink">
            <FaIcon name="check" class="h-[13px] w-[17px] text-white" />
          </span>
        </div>
      </div>

      <!-- เส้นเวลาตอนนี้ (เฉพาะวันนี้) -->
      <div v-if="isToday && (timelineDone.length || timelinePending.length)" class="flex items-center gap-[6px]">
        <span class="rounded-full bg-moon-ink px-[10px] py-[2px] text-xs font-medium leading-[17px] text-white">ตอนนี้ {{ nowLabel }}</span>
        <span class="h-[2px] flex-1 bg-moon-ink" />
      </div>

      <p v-if="timelinePending.length" class="mt-3 text-xs font-medium leading-[18px] text-moon-muted">{{ isToday ? 'ยังไม่ได้ทำวันนี้' : 'เลือกไว้แต่ยังไม่ได้ทำ' }}</p>

      <div v-for="item in timelinePending" :key="item.key" class="flex gap-[10px]">
        <p class="w-10 shrink-0 text-xs font-medium leading-[18px] text-moon-muted">{{ item.carryLabel ?? (isToday ? 'รอ' : '') }}</p>
        <div class="tl-card tl-pending flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
          <span class="w-1 shrink-0 self-stretch rounded-sm bg-[#FBFF63]" />
          <!-- การ์ดคู่มือกดได้ทั้งใบ -> เปิดป๊อปอัพวิธีทำใบเดิมกลับมาอ่านซ้ำ (ใช้ป๊อปอัพเดียวกับหน้าคู่มือ) -->
          <div
            class="flex min-w-0 flex-1 flex-col gap-[2px]"
            :class="item.onRead ? 'cursor-pointer' : ''"
            :role="item.onRead ? 'button' : undefined"
            @click="item.onRead?.()"
          >
            <p class="text-sm font-semibold leading-[21px]">{{ item.title }}</p>
            <p v-for="line in item.lines" :key="line" class="text-xs leading-[18px] text-moon-muted">{{ line }}</p>
            <span
              v-if="item.onRead"
              class="read-pill mt-1 inline-flex items-center gap-1 self-start rounded-full border border-moon-lavender bg-moon-lavender-soft px-3 py-[4px] text-xs font-medium leading-[18px]"
            >
              {{ item.readLabel ?? 'อ่านวิธีทำ ›' }}
            </span>
          </div>
          <button
            v-if="isToday"
            type="button"
            class="shrink-0 rounded-full border border-moon-coral bg-moon-pink px-3 py-[6px] text-xs font-medium leading-[18px] text-moon-ink shadow-sm transition active:scale-95"
            @click="item.onDone?.($event)"
          >
            {{ item.kind === 'guide' ? 'ยังไม่ได้ทำ' : 'ยังไม่ได้กิน' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ปฏิทินเลือกวันดูย้อนหลัง -->
    <DayPickSheet
      v-if="showDayPicker"
      :selected="viewDate"
      :max="today"
      @pick="changeDay"
      @close="showDayPicker = false"
    />

    <PromptDialog
      v-if="askingGuide"
      title="ทำแล้วรู้สึกยังไงบ้าง"
      :message="askingGuide.title"
      primary-label="รู้สึกดีขึ้น"
      secondary-label="เฉยๆ / ยังไม่ดีขึ้น"
      lock-backdrop
      @primary="answerGuideFeeling(true)"
      @secondary="answerGuideFeeling(false)"
    />

    <!-- การ์ดวิธีทำใบเดิมจากหน้าคู่มือ (กดอ่านซ้ำ) กด "ปิด" หรือพื้นที่ว่างแล้วอยู่หน้านี้ต่อ -->
    <GuideDetailDialog
      v-if="readingGuide"
      :title="readingGuide.title"
      :short-description="readingGuide.shortDescription"
      :steps="splitSteps(readingGuide.steps)"
      :recommended="readingGuide.recommended"
      button-label="ปิด"
      @close="readingGuide = null"
    />

    <!-- การ์ดรายละเอียดของว่างที่เลือกไว้ (กดการ์ดของว่างในไทม์ไลน์) กด "ปิด" หรือพื้นที่ว่างแล้วอยู่หน้านี้ต่อ -->
    <SnackDetailDialog
      v-if="readingSnack"
      :name="readingSnack.name"
      :category="readingSnack.category"
      :image-url="readingSnack.imageUrl"
      :description="readingSnack.description"
      :pairing-tip="readingSnack.pairingTip"
      :ingredients="readingSnack.ingredients"
      :recommended="readingSnack.recommended"
      button-label="ปิด"
      @close="readingSnack = null"
    />

    <PromptDialog
      v-if="askingSnack"
      title="กินแล้วรู้สึกยังไงบ้าง"
      :message="askingSnack.name"
      primary-label="สบายตัว / ถูกใจ"
      secondary-label="เฉยๆ / ยังไม่ดีขึ้น"
      lock-backdrop
      @primary="answerFeeling(true)"
      @secondary="answerFeeling(false)"
    />

    <BottomNav active="checkin" />
  </div>

  <!-- ระหว่างดึงข้อมูล: ขึ้นกระต่ายรอโหลด (หน้าจริงโผล่หลังโหลดเสร็จ) -->
  <LoadingOverlay v-else />
</template>

<script setup lang="ts">
import { painLevelLabel, painLocationLabel, splitSteps } from '~/utils/guide-picker'
import { isCycleFinished } from '~/utils/goal-claim'
import type { SnackCategory } from '~/utils/snack-picker'

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

// วันที่กำลังดูอยู่ (เริ่มที่วันนี้) เลือกวันเก่าได้เพื่อดูย้อนหลัง แต่วันที่ผ่านไปแล้วแก้ไม่ได้
const viewDate = ref(today)
const isToday = computed(() => viewDate.value === today)
const showDayPicker = ref(false)
const isSwitching = ref(false)

const isLoading = ref(true)
const profileId = ref<number | null>(null)
const activeGoals = ref<ActiveGoal[]>([])
const checkedGoals = ref<Record<string, boolean>>({})
const goalDayCounts = ref<Record<string, number>>({})
const savingGoalCode = ref<string | null>(null)
const daysRemaining = ref<number | null>(null)
const openCycleId = ref<number | null>(null) // รอบเป้าหมายที่ยังไม่กดรับผล
const cycleFinished = ref(false) // รอบนี้ครบ 28 วันแล้วและรอรับผลอยู่ไหม
// ของว่างที่เลือกไว้วันนี้ (แถวจาก snack_logs) เลือกได้หลายอัน
interface TodaySnack {
  id: number // id ของแถวใน snack_logs
  name: string
  description: string | null // คำอธิบายสั้นของเมนู (โชว์ใต้ชื่อในไทม์ไลน์)
  eatenTime: string // เวลาที่กด "กินแล้ว" เช่น "12:30" (ว่าง = ยังไม่กิน)
  eaten: boolean // กด "กินแล้ว" หรือยัง
  feltBetter: boolean | null // ตอบความรู้สึกแล้วหรือยัง (null = ยังไม่ตอบ)
  logDate: string // วันที่เลือกเมนูนี้ (ถ้าเก่ากว่าวันที่ดูอยู่ = ค้างมาจากวันก่อน)
  // ข้อมูลไว้โชว์ในการ์ดรายละเอียด (กดการ์ดเพื่อเปิดดูซ้ำ)
  category: SnackCategory | null
  imageUrl: string | null
  pairingTip: string | null
  ingredients: string[] | null
  recommended: boolean // ตรงกับเป้าหมายของผู้ใช้ไหม
}
// การบันทึกความปวดของวันนี้ (แถวจาก pain_logs) วันหนึ่งมีได้หลายครั้ง เรียงตามเวลาที่กด
interface TodayPain {
  id: number
  atMs: number // เวลาที่กด (มิลลิวินาที) ไว้จับคู่กับคู่มือที่เลือกหลังจากนั้น
  time: string // เวลาที่กด เช่น "14:05"
  text: string // เช่น "ปวดกลาง (5) · หลังส่วนล่าง"
}
const todayPainLogs = ref<TodayPain[]>([])

// ดึงแถวที่ "เลือกไว้ใน 3 วันก่อนวันที่ดูอยู่ แต่ยังไม่ได้ทำ/กิน" (doneColumn ยังว่าง) ไว้ให้ไปขึ้นรอในวันถัดมา
const CARRY_OVER_DAYS = 3
async function loadCarriedRows(table: 'guide_logs' | 'snack_logs', doneColumn: string, columns: string): Promise<Record<string, unknown>[]> {
  if (!profileId.value) return []
  const from = parseLocalDate(viewDate.value)
  from.setDate(from.getDate() - CARRY_OVER_DAYS)
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from(table)
    .select(columns)
    .eq('user_id', profileId.value)
    .gte('log_date', getLocalDateString(from))
    .lt('log_date', viewDate.value)
    .is(doneColumn, null)
    .order('log_date')
    .order('chosen_at')
  return (data ?? []) as unknown as Record<string, unknown>[]
}

// ป้ายบอกว่าค้างมากี่วัน เช่น "เมื่อวาน" / "2 วันก่อน" (วันเดียวกับที่ดูอยู่ = ไม่ใช่ของค้าง)
function carryLabelOf(logDate: string): string | undefined {
  if (logDate === viewDate.value) return undefined
  const diff = Math.round((parseLocalDate(viewDate.value).getTime() - parseLocalDate(logDate).getTime()) / 86400000)
  return diff <= 1 ? 'เมื่อวาน' : `${diff} วันก่อน`
}

async function loadTodayPain() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from('pain_logs')
    .select('id, logged_at, pain_level, pain_location')
    .eq('user_id', profileId.value)
    .eq('log_date', viewDate.value)
    .order('logged_at')
  // เลือกหลายจุดในครั้งเดียว = หลายแถวที่เวลาเดียวกัน -> รวมเป็นรายการเดียว (เช่น "ปวดกลาง (5) · ท้องน้อย, หลังส่วนล่าง")
  const grouped = new Map<string, { id: number, atMs: number, time: string, level: number | null, places: string[] }>()
  for (const row of data ?? []) {
    const key = `${row.logged_at as string}|${row.pain_level ?? ''}`
    const place = row.pain_location as string | null
    const found = grouped.get(key)
    if (found) {
      if (place) found.places.push(painLocationLabel(place))
    } else {
      grouped.set(key, {
        id: row.id as number,
        atMs: Date.parse(row.logged_at as string),
        time: timeOf(row.logged_at as string),
        level: row.pain_level as number | null,
        places: place ? [painLocationLabel(place)] : []
      })
    }
  }
  todayPainLogs.value = [...grouped.values()].map((g) => {
    const parts = [
      g.level !== null ? `ปวด${painLevelLabel(g.level)} (${g.level})` : 'ไม่ได้ระบุระดับ',
      g.places.join(', ')
    ].filter(Boolean)
    return { id: g.id, atMs: g.atMs, time: g.time, text: parts.join(' · ') }
  })
}

// คู่มือที่เลือกไว้วันนี้ (แถวจาก guide_logs) เลือกได้หลายอัน ทำงานเหมือนของว่าง
interface TodayGuide {
  id: number // id ของแถวใน guide_logs
  title: string
  chosenMs: number // เวลาที่กด "เลือกอันนี้" (ไว้จับคู่กับความปวดที่บันทึกก่อนหน้า)
  doneTime: string // เวลาที่กด "ทำแล้ว" เช่น "10:15" (ว่าง = ยังไม่ทำ)
  done: boolean // กด "ทำแล้ว" หรือยัง
  feltBetter: boolean | null // ตอบความรู้สึกแล้วหรือยัง (null = ยังไม่ตอบ)
  shortDescription: string | null // ไว้โชว์ในการ์ดอ่านซ้ำ
  steps: string | null
  recommended: boolean // คู่มือนี้ตรงกับเป้าหมายของผู้ใช้ไหม (true = ป๊อปอัพโชว์ป้าย "แนะนำสำหรับคุณ")
  logDate: string // วันที่เลือกคู่มือนี้ (ถ้าเก่ากว่าวันที่ดูอยู่ = ค้างมาจากวันก่อน)
}
const todayGuides = ref<TodayGuide[]>([])
const readingGuide = ref<TodayGuide | null>(null) // คู่มือที่กำลังเปิดการ์ดอ่านซ้ำ (null = ไม่โชว์)
const askingGuide = ref<TodayGuide | null>(null) // คู่มือที่กำลังถามความรู้สึกอยู่ (null = ไม่มีป๊อปอัพ)

async function loadTodayGuides() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from('guide_logs')
    .select('id, log_date, done_at, felt_better, chosen_at, pain_relief_guides(title, short_description, steps, linked_goal_code)')
    .eq('user_id', profileId.value)
    .eq('log_date', viewDate.value)
    .order('chosen_at')
  // ดูวันนี้อยู่ -> ดึงคู่มือที่เลือกไว้ใน 3 วันก่อนหน้าแต่ยังไม่ได้ทำ มาขึ้นรอด้วย (ไม่งั้นเลือกไว้เมื่อวานแล้วหายเงียบ)
  const carried = isToday.value ? await loadCarriedRows('guide_logs', 'done_at', 'id, log_date, done_at, felt_better, chosen_at, pain_relief_guides(title, short_description, steps, linked_goal_code)') : []
  todayGuides.value = [...carried, ...(data ?? [])].map((row) => {
    const item = row.pain_relief_guides as unknown as {
      title: string
      short_description: string | null
      steps: string | null
      linked_goal_code: string | null
    } | null
    const goal = activeGoals.value.find(g => g.goal_code === item?.linked_goal_code)
    return {
      id: row.id as number,
      title: item?.title ?? '',
      chosenMs: Date.parse(row.chosen_at as string),
      doneTime: row.done_at ? timeOf(row.done_at as string) : '',
      done: !!row.done_at,
      feltBetter: row.felt_better as boolean | null,
      shortDescription: item?.short_description ?? null,
      steps: item?.steps ?? null,
      recommended: !!goal,
      logDate: row.log_date as string
    }
  })
}

// กด "ทำแล้ว": บันทึกเวลาที่ทำทันที แล้วเด้งถามความรู้สึก
async function markGuideDone(guide: TodayGuide, el?: HTMLElement) {
  if (!guide.done) {
    sparkleBurst(el) // ดาวแวบขึ้นที่ปุ่ม
    const authed = await getAuthedSupabaseClient()
    const { error } = await authed.from('guide_logs').update({ done_at: new Date().toISOString() }).eq('id', guide.id)
    if (error) return
    guide.done = true
    guide.doneTime = timeOf(new Date().toISOString())
  }
  askingGuide.value = guide
}

// ตอบความรู้สึก: true = ดีขึ้น, false = เฉยๆ/ยังไม่ดีขึ้น
async function answerGuideFeeling(better: boolean) {
  const guide = askingGuide.value
  if (!guide) return
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('guide_logs').update({ felt_better: better }).eq('id', guide.id)
  if (!error) guide.feltBetter = better
  askingGuide.value = null
}
// คอลัมน์ที่ดึงจาก snack_logs (รวมข้อมูลเมนูไว้โชว์ในการ์ดรายละเอียด)
const SNACK_LOG_COLUMNS = 'id, log_date, eaten_at, felt_better, snack_items(name, description, category, image_url, pairing_tip, ingredients, linked_goal_code)'
const todaySnacks = ref<TodaySnack[]>([])
const readingSnack = ref<TodaySnack | null>(null) // เมนูที่กำลังเปิดการ์ดรายละเอียด (null = ไม่โชว์)
const askingSnack = ref<TodaySnack | null>(null) // เมนูที่กำลังถามความรู้สึกอยู่ (null = ไม่มีป๊อปอัพ)

async function loadTodaySnacks() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from('snack_logs')
    .select(SNACK_LOG_COLUMNS)
    .eq('user_id', profileId.value)
    .eq('log_date', viewDate.value)
    .order('chosen_at')
  // ดูวันนี้อยู่ -> ดึงของว่างที่เลือกไว้ใน 3 วันก่อนหน้าแต่ยังไม่ได้กิน มาขึ้นรอด้วย (ถามว่ากินที่เลือกไว้หรือยัง)
  const carried = isToday.value ? await loadCarriedRows('snack_logs', 'eaten_at', SNACK_LOG_COLUMNS) : []
  todaySnacks.value = [...carried, ...(data ?? [])].map((row) => {
    const item = row.snack_items as unknown as {
      name: string
      description: string | null
      category: SnackCategory | null
      image_url: string | null
      pairing_tip: string | null
      ingredients: string[] | null
      linked_goal_code: string | null
    } | null
    return {
      id: row.id as number,
      name: item?.name ?? '',
      description: item?.description ?? null,
      eatenTime: row.eaten_at ? timeOf(row.eaten_at as string) : '',
      eaten: !!row.eaten_at,
      feltBetter: row.felt_better as boolean | null,
      logDate: row.log_date as string,
      category: item?.category ?? null,
      imageUrl: item?.image_url ?? null,
      pairingTip: item?.pairing_tip ?? null,
      ingredients: item?.ingredients ?? null,
      recommended: !!item?.linked_goal_code && activeGoals.value.some(g => g.goal_code === item.linked_goal_code)
    }
  })
}

// กด "กินแล้ว": บันทึกเวลากินทันที แล้วเด้งถามความรู้สึก (ถ้ากินเองก่อนแจ้งเตือนก็ถามตรงนี้เลย)
async function markEaten(snack: TodaySnack, el?: HTMLElement) {
  if (!snack.eaten) {
    sparkleBurst(el) // ดาวแวบขึ้นที่ปุ่ม
    const authed = await getAuthedSupabaseClient()
    const { error } = await authed.from('snack_logs').update({ eaten_at: new Date().toISOString() }).eq('id', snack.id)
    if (error) return
    snack.eaten = true
    snack.eatenTime = timeOf(new Date().toISOString())
  }
  askingSnack.value = snack
}

// ตอบความรู้สึก: true = สบายตัว/ถูกใจ, false = เฉยๆ
async function answerFeeling(better: boolean) {
  const snack = askingSnack.value
  if (!snack) return
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('snack_logs').update({ felt_better: better }).eq('id', snack.id)
  if (!error) snack.feltBetter = better
  askingSnack.value = null
}


// เวลา "HH:MM" จากวันเวลา ISO (ใช้โชว์ในไทม์ไลน์)
function timeOf(iso: string) {
  const at = new Date(iso)
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

// คำอธิบายใต้ชื่อเป้าหมายในการ์ด (ตามฟิกม่า)
const GOAL_HINTS: Record<string, string> = {
  sleep_schedule: 'นอนก่อน 23:00 น.',
  reduce_sugar: 'วันละ 1 อย่าง',
  exercise_routine: 'ขยับตัวเบาๆอย่างน้อย 20 นาที',
  reduce_cold_drinks: 'เปลี่ยนเป็นน้ำอุ่นหรือน้ำอุณหภูมิห้อง'
}

// วันที่ที่กำลังดูแบบไทย เช่น "16 ตุลาคม 2569"
const viewLabel = computed(() => {
  const d = parseLocalDate(viewDate.value)
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
})
const nowLabel = ref(timeOf(new Date().toISOString()))

// จับคู่ความปวดกับคู่มือ: คู่มือที่เลือกหลังจากบันทึกปวด (ภายใน 60 นาที) จะแสดงข้อมูลความปวดอยู่ในการ์ดเดียวกัน
// ถ้าไม่ได้บันทึกความปวด คู่มือก็ไม่มีบรรทัดความปวด / ความปวดที่ไม่มีคู่มือจับคู่ยังโชว์เป็นการ์ดของตัวเองเหมือนเดิม
const PAIN_GUIDE_WINDOW_MS = 60 * 60 * 1000
const painForGuide = computed(() => {
  const map = new Map<number, TodayPain>()
  for (const g of todayGuides.value) {
    const before = todayPainLogs.value.filter(p => p.atMs <= g.chosenMs && g.chosenMs - p.atMs <= PAIN_GUIDE_WINDOW_MS)
    const last = before.at(-1)
    if (last) map.set(g.id, last)
  }
  return map
})
const attachedPainIds = computed(() => new Set([...painForGuide.value.values()].map(p => p.id)))

// รายการในไทม์ไลน์ (ผสมความปวด + คู่มือ + ของว่างของวันนี้)
interface TimelineItem {
  key: string
  kind: 'pain' | 'guide' | 'snack'
  time: string
  title: string
  lines: string[]
  needsFeeling?: boolean // ทำ/กินแล้วแต่ยังไม่ได้บอกความรู้สึก
  onFeeling?: () => void
  onRead?: () => void
  onDone?: (e: Event) => void
  readLabel?: string // ข้อความปุ่มเปิดการ์ดรายละเอียด (ไม่ใส่ = "อ่านวิธีทำ ›")
  carryLabel?: string // ค้างมาจากวันก่อน (เช่น "เมื่อวาน") ใช้แทนคำว่า "รอ" ในคอลัมน์เวลา
}

// ส่วน "ทำแล้ว" เรียงตามเวลา
const timelineDone = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []
  for (const e of todayPainLogs.value.filter(x => !attachedPainIds.value.has(x.id))) {
    items.push({ key: `pain-${e.id}`, kind: 'pain', time: e.time, title: e.text, lines: [] })
  }
  for (const g of todayGuides.value.filter(x => x.done)) {
    items.push({
      key: `guide-${g.id}`,
      kind: 'guide',
      time: g.doneTime,
      title: g.title,
      lines: [
        ...(painForGuide.value.get(g.id) ? [painForGuide.value.get(g.id)!.text] : []),
        ...(g.feltBetter === null ? [] : [g.feltBetter ? 'ทำแล้ว · ดีขึ้น' : 'ทำแล้ว · เฉยๆ'])
      ],
      needsFeeling: g.feltBetter === null,
      onFeeling: () => { askingGuide.value = g },
      onRead: () => { readingGuide.value = g }
    })
  }
  for (const s of todaySnacks.value.filter(x => x.eaten)) {
    items.push({
      key: `snack-${s.id}`,
      kind: 'snack',
      time: s.eatenTime,
      title: s.name,
      lines: s.feltBetter === null ? [] : [s.feltBetter ? 'กินแล้ว · สบายตัว' : 'กินแล้ว · เฉยๆ'],
      needsFeeling: s.feltBetter === null,
      onFeeling: () => { askingSnack.value = s },
      readLabel: 'ดูรายละเอียด ›',
      onRead: () => { readingSnack.value = s }
    })
  }
  return items.sort((a, b) => a.time.localeCompare(b.time))
})

// ส่วน "ยังไม่ได้ทำวันนี้" (เลือกไว้แล้วแต่ยังไม่กดทำ/กิน)
const timelinePending = computed<TimelineItem[]>(() => [
  ...todayGuides.value.filter(x => !x.done).map<TimelineItem>(g => ({
    key: `guide-${g.id}`,
    kind: 'guide',
    time: '',
    title: g.title,
    lines: painForGuide.value.get(g.id) ? [painForGuide.value.get(g.id)!.text] : [],
    carryLabel: carryLabelOf(g.logDate),
    onRead: () => { readingGuide.value = g },
    onDone: (e) => { markGuideDone(g, e.currentTarget as HTMLElement) }
  })),
  ...todaySnacks.value.filter(x => !x.eaten).map<TimelineItem>(s => ({
    key: `snack-${s.id}`,
    kind: 'snack',
    time: '',
    title: s.name,
    lines: s.description ? [s.description] : [],
    carryLabel: carryLabelOf(s.logDate),
    readLabel: 'ดูรายละเอียด ›',
    onRead: () => { readingSnack.value = s },
    onDone: (e) => { markEaten(s, e.currentTarget as HTMLElement) }
  }))
])

function isAchieved(goalCode: string) {
  return (goalDayCounts.value[goalCode] ?? 0) >= CYCLE_LENGTH_DAYS
}

async function refreshProgress() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()

  const { data } = await authed
    .from('goal_cycle_progress')
    .select('goal_cycle_id, sleep_days_achieved, exercise_days_achieved, sugar_days_achieved, cold_drink_days_achieved, cycle_end_date')
    .eq('user_id', profileId.value)
    .is('claimed_at', null)
    .order('cycle_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // แปลงเป็น Record เพราะ TypeScript รู้แค่ชื่อคอลัมน์ที่ select ไว้ตายตัว อ่านด้วยชื่อคอลัมน์ที่เป็น string ทั่วไปจะขึ้นแดง
  const progress = data as Record<string, number | null> | null
  for (const goal of activeGoals.value) {
    const column = GOAL_CODE_TO_PROGRESS_COLUMN[goal.goal_code]
    goalDayCounts.value[goal.goal_code] = column ? (progress?.[column] ?? 0) : 0
  }

  openCycleId.value = (data?.goal_cycle_id as number | undefined) ?? null
  cycleFinished.value = isCycleFinished(data?.cycle_end_date as string | undefined, today)

  if (data?.cycle_end_date) {
    const end = new Date(`${data.cycle_end_date}T00:00:00`)
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    daysRemaining.value = Math.max(0, Math.ceil((end.getTime() - today0.getTime()) / 86400000))
  } else {
    daysRemaining.value = null
  }
}

// โหลดเป้าหมายที่เปิดอยู่ + ติ๊กของวันนี้ + ความคืบหน้ารอบ (ใช้ตอนเปิดหน้า และหลังกดรับผลรอบใหม่)
async function loadGoals() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()

  checkedGoals.value = {}
  goalDayCounts.value = {}

  const [goalTypesRes, userGoalsRes] = await Promise.all([
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profileId.value).eq('is_active', true)
  ])

  const goalTypeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  activeGoals.value = (userGoalsRes.data ?? [])
    .map(g => goalTypeById.get(g.goal_type_id))
    .filter((g): g is ActiveGoal => !!g)

  for (const goal of activeGoals.value) goalDayCounts.value[goal.goal_code] = 0

  await loadChecked()
  await refreshProgress()
}

// โหลดว่า "วันที่กำลังดู" ติ๊กเป้าหมายอะไรไว้บ้าง
async function loadChecked() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from('daily_checkins')
    .select('*')
    .eq('user_id', profileId.value)
    .eq('checkin_date', viewDate.value)
    .maybeSingle()
  const next: Record<string, boolean> = {}
  for (const goal of activeGoals.value) {
    const column = GOAL_CODE_TO_CHECKIN_COLUMN[goal.goal_code]
    next[goal.goal_code] = column ? Boolean(data?.[column]) : false
  }
  checkedGoals.value = next
}

// เปลี่ยนวันที่ดู: โหลดข้อมูลของวันนั้นใหม่ (ปฏิทินกดเลือกวัน)
async function changeDay(dateStr: string) {
  showDayPicker.value = false
  if (dateStr === viewDate.value || isSwitching.value) return
  isSwitching.value = true
  viewDate.value = dateStr
  // ให้หน้ารอโหลดโชว์อย่างน้อย ~0.4 วิ จะได้เห็นว่ากำลังเปลี่ยนวัน (ไม่วูบหายเร็วเกินไป)
  await Promise.all([
    loadChecked(),
    loadTodayPain(),
    loadTodaySnacks(),
    loadTodayGuides(),
    new Promise(resolve => setTimeout(resolve, 400))
  ])
  isSwitching.value = false
}

// ติ๊กแล้วหรือยัง (วันนี้: ถ้าเป้าหมายครบ 28 วันแล้วนับว่าติ๊กแล้วด้วย)
function isDone(goalCode: string) {
  return !!checkedGoals.value[goalCode] || (isToday.value && isAchieved(goalCode))
}

// ข้อความในป้ายสถานะของการ์ดเป้าหมาย
function goalStatusText(goalCode: string) {
  if (!isToday.value) return checkedGoals.value[goalCode] ? 'สำเร็จวันนั้น' : 'ไม่ได้เช็คไว้'
  if (isAchieved(goalCode)) return 'สำเร็จครบแล้ว!'
  return checkedGoals.value[goalCode] ? 'สำเร็จวันนี้แล้ว' : 'ยังไม่ได้เช็คของวันนี้'
}

// กด "เริ่มเช็คอินรอบใหม่" ในการ์ดรับผล: โหลดข้อมูลใหม่ทั้งหมดของรอบใหม่
async function reloadAfterClaim() {
  await loadGoals()
  await loadTodayGuides() // ป้าย "แนะนำสำหรับคุณ" ขึ้นกับเป้าหมายที่เปิดอยู่
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

  await loadGoals()

  await loadTodayPain()
  await loadTodaySnacks()
  await loadTodayGuides()

  isLoading.value = false
})

async function toggleGoal(goalCode: string, e?: Event) {
  const column = GOAL_CODE_TO_CHECKIN_COLUMN[goalCode]
  if (!isToday.value || !column || !profileId.value || savingGoalCode.value || isAchieved(goalCode)) return

  const newValue = !checkedGoals.value[goalCode]
  const buttonEl = e?.currentTarget as HTMLElement | undefined // จำปุ่มไว้ก่อน (หลัง await ค่า currentTarget จะหาย)
  savingGoalCode.value = goalCode

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('daily_checkins').upsert({
    user_id: profileId.value,
    checkin_date: today,
    [column]: newValue
  }, { onConflict: 'user_id,checkin_date' })

  if (!error) {
    checkedGoals.value = { ...checkedGoals.value, [goalCode]: newValue }
    if (newValue) sparkleBurst(buttonEl) // ติ๊ก "ทำแล้ว" -> ดาวแวบขึ้นที่ปุ่ม
    await refreshProgress()
  }

  savingGoalCode.value = null
}
</script>

<style scoped>
/* ย้อนดูวันเก่า: ทั้งหน้าจางลงนิดหน่อยเหมือนหน้าบันทึกอาการ (ไม่จางมาก) ยกเว้นอันที่ทำสำเร็จ/บันทึกไว้จริงที่ยังชัดเหมือนเดิม */
.goal-card,
.tl-card {
  transition: opacity 0.25s ease;
}

.view-only h2 {
  opacity: 0.75;
}

.view-only .goal-card:not(.goal-done) {
  opacity: 0.55;
}

.view-only .tl-pending {
  opacity: 0.6;
}

/* ปุ่ม "อ่านวิธีทำ" ให้ดูเป็นปุ่มที่กดได้ (กดแล้วยุบนิดหนึ่ง) */
.read-pill {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: transform 0.15s ease;
}

[role='button']:active .read-pill {
  transform: scale(0.94);
}
</style>

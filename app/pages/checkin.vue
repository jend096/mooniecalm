<template>
  <div
    v-if="!isLoading"
    class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[50px] text-moon-ink"
    :class="{ 'view-only': !isToday }"
  >
    <!-- ปุ่มย้อนกลับ -->
    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-moon-gray shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
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
        class="flex h-[42px] items-center gap-[5px] rounded-[35px] border border-moon-coral bg-moon-card py-[5px] pl-[5px] pr-3 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition active:scale-95"
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
            ? 'goal-done border-transparent bg-moon-period/30'
            : 'border-moon-pink-soft bg-moon-gray-soft'
        ]"
      >
        <!-- ซ้าย: ชื่อ + คำอธิบาย + แถบความคืบหน้า -->
        <div class="flex min-w-0 flex-1 flex-col gap-[2px]">
          <!-- ชื่อเป้าหมาย + แท็บสถานะ: จัดเป็นแถวเดียว (flex) แท็บ shrink-0 ไม่ย่อและไม่ตกบรรทัดล่าง ถ้าชื่อยาวชื่อจะขึ้นสองบรรทัดเองในกล่องของมัน ระยะห่างปรับที่ gap-1.5
               ตำแหน่งแท็บบน-ล่าง: ปรับที่ mt-0 ตรงแท็บ (เดิม mt-[4px] อยู่กลางบรรทัด / mt-0 = ขยับขึ้น 4px ชิดบน / ใส่ -mt-[2px] ถ้าอยากขึ้นอีก)
               สีตัวหนังสือเป็นสีดำ (text-moon-ink) ทั้งสองสถานะ / พื้นแท็บ: ทำแล้ว = ม่วง (bg-moon-lavender) ยังไม่ทำ = เทา (bg-moon-gray) -->
          <!-- ป้ายสถานะต่อท้ายชื่อ ยกขึ้น "เหลื่อมบนตัวอักษร" แบบตัวยก และไม่กินที่ในบรรทัด (กล่องนอก w-0) จึงไม่มีทางตกลงมาใต้ชื่อ
               ตำแหน่ง: ระยะห่างจากชื่อ = ml-1.5 / ยกขึ้นกี่ px = top-[-5px] (ติดลบมาก = สูงขึ้น, 0 = ชิดบนบรรทัด) -->
          <p class="text-lg font-medium leading-[26px] text-moon-ink">{{ goal.title }}<span class="relative ml-1.5 inline-block h-0 w-0 align-top"><span
            class="absolute left-0 top-[-3px] whitespace-nowrap rounded-lg px-2 py-[2px] text-xs font-normal leading-[18px] text-moon-ink"
            :class="isDone(goal.goal_code) ? 'bg-moon-lavender' : 'bg-moon-gray'"
          >{{ goalStatusText(goal.goal_code) }}</span></span></p>
          <p class="text-sm leading-[22px] text-moon-ink">{{ GOAL_HINTS[goal.goal_code] ?? '' }}</p>
          <!-- จำนวนวันที่ทำสำเร็จในรอบนี้ (ตัวเลขเด่นเหนือแถบ) -->
          <p class="mt-1 text-sm font-medium leading-[22px]">
            ทำมาแล้ว
            <span class="text-lg font-semibold tabular-nums">{{ goalDayCounts[goal.goal_code] ?? 0 }}</span>
            <span class="text-moon-ink/60"> / {{ CYCLE_LENGTH_DAYS }} วัน</span>
          </p>
          <div class="mt-1 h-3 w-[calc(100%-4px)] overflow-hidden rounded-full bg-moon-card">
            <div
              class="h-full rounded-full bg-moon-lavender transition-[width] duration-500"
              :style="{ width: `${Math.min(100, ((goalDayCounts[goal.goal_code] ?? 0) / CYCLE_LENGTH_DAYS) * 100)}%` }"
            />
          </div>
        </div>

        <!-- ขวา (ชิดล่าง): ยังไม่ได้เช็ค = ปุ่มดำ "เช็คอิน" / เช็คแล้ว = ไม่แสดงปุ่มอะไร (ยกเลิกไม่ได้)
             ย้อนดูวันเก่า หรือครบ 28 วันแล้ว = ไม่โชว์ปุ่มเหมือนกัน กดปุ่มแล้วเรียก toggleGoal (บันทึกลง daily_checkins) -->
        <div class="flex w-[90px] shrink-0 items-end justify-end">
          <button
            v-if="isToday && !isAchieved(goal.goal_code) && !isDone(goal.goal_code)"
            type="button"
            class="h-[32px] rounded-full bg-moon-ink px-4 text-sm font-medium text-white transition active:scale-95 disabled:opacity-60"
            :aria-label="`เช็คอิน ${goal.title}`"
            :disabled="savingGoalCode !== null"
            @click="toggleGoal(goal.goal_code, $event)"
          >
            เช็คอิน
          </button>
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

      <!-- สีการ์ดในไทม์ไลน์ใช้ชุดเดียวกับการ์ดเป้าหมายด้านบน: ทำแล้ว = bg-moon-period/30 (เหมือนเป้าหมายที่สำเร็จ ตัวเลข 30 = ความทึบสีชมพู ยิ่งน้อยยิ่งจาง) / ยังไม่ได้ทำ = bg-moon-gray-soft + ขอบ border-moon-pink-soft -->
      <div v-for="item in timelineDone" :key="item.key" class="flex gap-[10px]">
        <p class="w-10 shrink-0 text-xs font-medium leading-[18px] text-moon-muted">{{ item.time }}</p>
        <div class="tl-card flex min-w-0 flex-1 items-center gap-3 rounded-[20px] border border-transparent bg-moon-period/30 p-5">
          <!-- แถบสีข้างการ์ด: ทำแล้ว = โคเรลเดิม (bg-moon-coral) / ยังไม่ได้ทำ = เหลืองเดิม (ดูที่การ์ดด้านล่าง) -->
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
          <!-- วงกลมติ๊กถูก: สีเดียวกับติ๊กถูกหน้าอื่นทั้งแอป (bg-moon-period ← --color-period-day ใน tokens.css) -->
          <span v-else-if="item.kind !== 'pain'" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moon-period">
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
        <div class="tl-card tl-pending flex min-w-0 flex-1 items-center gap-3 rounded-[20px] border border-moon-pink-soft bg-moon-gray-soft p-5">
          <span class="w-1 shrink-0 self-stretch rounded-sm bg-moon-yellow" />
          <!-- การ์ดคู่มือกดได้ทั้งใบ -> เปิดป๊อปอัพวิธีทำใบเดิมกลับมาอ่านซ้ำ (ใช้ป๊อปอัพเดียวกับหน้าคู่มือ) -->
          <div
            class="flex min-w-0 flex-1 flex-col gap-[2px]"
            :class="item.onRead ? 'cursor-pointer' : ''"
            :role="item.onRead ? 'button' : undefined"
            @click="item.onRead?.()"
          >
            <!-- ชื่อ + ป้ายสถานะ "ยังไม่ได้ทาน/ยังไม่ได้ทำ": แถวเดียวกันเหมือนการ์ดเป้าหมายวันนี้ (ป้ายต่อท้ายชื่อ ยกขึ้นเหลื่อมบนตัวอักษร ไม่ตกลงมาใต้ชื่อ (ปรับความสูงที่ top-[-5px]) พื้นเทา ตัวดำ ไม่ใช่ปุ่ม กดไม่ได้ -->
            <p class="text-sm font-semibold leading-[21px]">{{ item.title }}<span class="relative ml-1.5 inline-block h-0 w-0 align-top"><span
              class="absolute left-0 top-[-3px] whitespace-nowrap rounded-lg bg-moon-gray px-2 py-[2px] text-xs font-normal leading-[18px] text-moon-ink"
            >{{ item.kind === 'guide' ? 'ยังไม่ได้ทำ' : 'ยังไม่ได้ทาน' }}</span></span></p>
            <p v-for="line in item.lines" :key="line" class="text-xs leading-[18px] text-moon-muted">{{ line }}</p>
            <span
              v-if="item.onRead"
              class="read-pill mt-1 inline-flex items-center gap-1 self-start rounded-full border border-moon-lavender bg-moon-lavender-soft px-3 py-[4px] text-xs font-medium leading-[18px]"
            >
              {{ item.readLabel ?? 'อ่านวิธีทำ ›' }}
            </span>
          </div>
          <!-- ขวา (ชิดล่าง): ปุ่มดำ "เช็คอิน" เหมือนการ์ดเป้าหมายวันนี้ กดแล้วขึ้นป๊อปอัพ "ทานแล้วหรือยัง/ทำแล้วหรือยัง" (ดู askConfirmDone ใน script) -->
          <div v-if="isToday" class="flex shrink-0 items-end self-stretch">
            <button
              type="button"
              class="h-[32px] rounded-full bg-moon-ink px-4 text-sm font-medium text-white transition active:scale-95"
              :aria-label="`เช็คอิน ${item.title}`"
              @click="askConfirmDone(item, $event)"
            >
              เช็คอิน
            </button>
          </div>
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

    <!-- กดปุ่ม "เช็คอิน" ในรายการที่ยังไม่ได้ทำ/ทาน -> ถามก่อนว่าทำ/ทานแล้วหรือยัง
         ตอบ "ทำแล้ว/ทานแล้ว" = บันทึกเวลา แล้วเด้งถามความรู้สึกต่อ (ป๊อปอัพด้านล่าง) / ตอบ "ยังไม่ได้..." หรือกดกากบาท = ปิดเฉยๆ ไม่บันทึก -->
    <PromptDialog
      v-if="confirmingItem"
      :title="confirmingItem.kind === 'guide' ? 'ทำแล้วหรือยัง' : 'ทานแล้วหรือยัง'"
      :message="confirmingItem.title"
      :primary-label="confirmingItem.kind === 'guide' ? 'ทำแล้ว' : 'ทานแล้ว'"
      :secondary-label="confirmingItem.kind === 'guide' ? 'ยังไม่ได้ทำ' : 'ยังไม่ได้ทาน'"
      closable
      @primary="confirmDone"
      @secondary="confirmingItem = null"
      @close="confirmingItem = null"
    />

    <PromptDialog
      v-if="askingGuide"
      title="ทำแล้วรู้สึกยังไงบ้าง"
      :message="askingGuide.title"
      primary-label="รู้สึกดีขึ้น"
      secondary-label="เฉยๆ / ยังไม่ดีขึ้น"
      closable
      @primary="answerGuideFeeling(true)"
      @secondary="answerGuideFeeling(false)"
      @close="askingGuide = null"
    />

    <!-- (ป๊อปอัพถามความรู้สึกด้านบน/ล่างปิดได้ด้วยกากบาทหรือกดพื้นหลัง ไม่ตอบก็ได้ กดตอบทีหลังจากการ์ดในไทม์ไลน์) การ์ดวิธีทำใบเดิมจากหน้าคู่มือ (กดอ่านซ้ำ) กด "ปิด" หรือพื้นที่ว่างแล้วอยู่หน้านี้ต่อ -->
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
      closable
      @primary="answerFeeling(true)"
      @secondary="answerFeeling(false)"
      @close="askingSnack = null"
    />

    <BottomNav active="checkin" />
  </div>

  <!-- ระหว่างดึงข้อมูล: ขึ้นกระต่ายรอโหลด (หน้าจริงโผล่หลังโหลดเสร็จ) -->
  <LoadingOverlay v-else />
</template>

<script setup lang="ts">
// เลข 28 ทั้งแอปรวมอยู่ที่ app/utils/cycle-config.ts (แก้ที่นั่นที่เดียว)
import { CYCLE_LENGTH_DAYS } from '~/utils/cycle-config'
import { painLevelLabel, painLocationLabel, splitSteps } from '~/utils/guide-picker'
import { isCycleFinished } from '~/utils/goal-claim'
import { clearPageCache, readPageCache, readProfileId, writePageCache, writeProfileId } from '~/utils/page-cache'
import type { SnackCategory } from '~/utils/snack-picker'


// ปุ่มย้อนกลับ: กลับหน้าหลักเสมอ (เหมือนหน้าบันทึกอาการ/คู่มือ)
// ไม่ใช้ router.back() เพราะถ้าเปิดหน้านี้ตรงๆ / รีเฟรชหน้า / มาจากเมนูล่าง จะไม่มีหน้าก่อนหน้าให้ย้อน ปุ่มเลยดูเหมือนกดไม่ติด
function back() {
  navigateTo('/home')
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

const today = getLocalDateString()

// วันที่กำลังดูอยู่ (เริ่มที่วันนี้) เลือกวันเก่าได้เพื่อดูย้อนหลัง แต่วันที่ผ่านไปแล้วแก้ไม่ได้
const viewDate = ref(today)
const isToday = computed(() => viewDate.value === today)
const showDayPicker = ref(false)
const isSwitching = ref(false)

// true = ระหว่างโหลดหน้านี้มีคำสั่งที่พลาด (เช่นเน็ตหลุด) -> ไม่จำข้อมูลที่โหว่ และคงของเดิมที่จำไว้
let loadHadError = false
// เพิ่มค่าทุกครั้งที่ผู้ใช้ติ๊กเป้าหมาย ถ้าข้อมูลที่ดึงมาเริ่มดึงก่อนการติ๊ก (เก่ากว่า) จะไม่เอามาทับ
let checkedEditVersion = 0

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
  snackId: number // id ของเมนู (snack_items) ไว้ใช้ตอนทานของที่ค้างมาจากวันก่อน
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
// itemColumn = คอลัมน์บอกว่าเป็นเมนู/คู่มืออันไหน (snack_id / guide_id) ใช้เช็คว่าอันที่ค้างมา "ถูกทำไปแล้วในวันหลัง" หรือยัง
async function loadCarriedRows(table: 'guide_logs' | 'snack_logs', doneColumn: string, itemColumn: 'snack_id' | 'guide_id', columns: string): Promise<Record<string, unknown>[]> {
  if (!profileId.value) return []
  const from = parseLocalDate(viewDate.value)
  from.setDate(from.getDate() - CARRY_OVER_DAYS)
  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from(table)
    .select(columns)
    .eq('user_id', profileId.value)
    .gte('log_date', getLocalDateString(from))
    .lt('log_date', viewDate.value)
    .is(doneColumn, null)
    .order('log_date')
    .order('chosen_at')
  if (error) loadHadError = true
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  if (!rows.length) return []

  // ของที่ค้างมา แต่ภายหลัง (วันถัดมาจนถึงวันนี้) มีแถว "ทำ/ทานแล้ว" ของอันเดียวกันแล้ว = ไม่ต้องขึ้นเป็นของค้างอีก
  // (แถวเก่าของวันนั้นยังเป็น "ยังไม่ได้ทำ" อยู่ในฐานข้อมูลตามจริง ถ้าไปดูวันนั้นก็ยังขึ้นยังไม่ได้ทำเหมือนเดิม)
  const { data: laterDone, error: laterError } = await authed
    .from(table)
    .select(`${itemColumn}, log_date`)
    .eq('user_id', profileId.value)
    .gte('log_date', getLocalDateString(from))
    .lte('log_date', viewDate.value)
    .not(doneColumn, 'is', null)
  if (laterError) loadHadError = true
  const later = (laterDone ?? []) as unknown as Record<string, unknown>[]
  return rows.filter(r => !later.some(l => l[itemColumn] === r[itemColumn] && String(l.log_date) > String(r.log_date)))
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
  const { data, error } = await authed
    .from('pain_logs')
    .select('id, logged_at, pain_level, pain_location')
    .eq('user_id', profileId.value)
    .eq('log_date', viewDate.value)
    .order('logged_at')
  if (error) loadHadError = true
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
  guideId: number // id ของคู่มือ (pain_relief_guides) ไว้ใช้ตอนทำของที่ค้างมาจากวันก่อน
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
  const { data, error } = await authed
    .from('guide_logs')
    .select('id, guide_id, log_date, done_at, felt_better, chosen_at, pain_relief_guides(title, short_description, steps, linked_goal_code)')
    .eq('user_id', profileId.value)
    .eq('log_date', viewDate.value)
    .order('chosen_at')
  if (error) loadHadError = true
  // ดูวันนี้อยู่ -> ดึงคู่มือที่เลือกไว้ใน 3 วันก่อนหน้าแต่ยังไม่ได้ทำ มาขึ้นรอด้วย (ไม่งั้นเลือกไว้เมื่อวานแล้วหายเงียบ)
  const carried = isToday.value ? await loadCarriedRows('guide_logs', 'done_at', 'guide_id', 'id, guide_id, log_date, done_at, felt_better, chosen_at, pain_relief_guides(title, short_description, steps, linked_goal_code)') : []
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
      guideId: row.guide_id as number,
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

// กำลังบันทึก "ทำแล้ว/ทานแล้ว" อยู่เบื้องหลัง (ป๊อปอัพถามความรู้สึกเด้งขึ้นทันทีโดยไม่รอบันทึกเสร็จ แต่ตอนตอบจะรอให้บันทึกเสร็จก่อน)
let pendingSave: Promise<void> | null = null

// กดยืนยัน "ทำแล้ว": เด้งถามความรู้สึกต่อทันที (ไม่ต้องรอ/ไม่ต้องปิดอะไร) แล้วบันทึกเวลาที่ทำเบื้องหลัง
// - ของวันนี้: อัปเดตแถวเดิมว่าทำแล้ว
// - ของที่ค้างมาจากวันก่อน: แถวเดิมของวันนั้น "ไม่แตะ" (วันนั้นยังขึ้นยังไม่ได้ทำเหมือนเดิม) แต่สร้าง/อัปเดตแถวของ "วันนี้" ให้เป็นทำแล้ว
async function markGuideDone(guide: TodayGuide, el?: HTMLElement) {
  if (guide.done) { askingGuide.value = guide; return }
  if (!profileId.value) return
  sparkleBurst(el) // ดาวแวบขึ้นที่ปุ่ม
  const nowIso = new Date().toISOString()

  // ของวันนี้เอง
  if (guide.logDate === viewDate.value) {
    askingGuide.value = guide
    pendingSave = (async () => {
      const authed = await getAuthedSupabaseClient()
      const { error } = await authed.from('guide_logs').update({ done_at: nowIso }).eq('id', guide.id)
      clearPageCache() // ข้อมูลของหน้านี้เปลี่ยนแล้ว ที่จำไว้เป็นของเก่า
      if (error) { if (askingGuide.value === guide) askingGuide.value = null; return }
      guide.done = true
      guide.doneTime = timeOf(nowIso)
    })()
    await pendingSave
    return
  }

  // ของที่ค้างมา: เอาออกจากรายการค้าง ใส่แถวของวันนี้ที่ทำแล้วแทน (id จะได้ตอนบันทึกเสร็จ)
  const doneGuide: TodayGuide = { ...guide, id: 0, logDate: viewDate.value, done: true, doneTime: timeOf(nowIso), feltBetter: null }
  todayGuides.value = todayGuides.value.filter(x => x !== guide && !(x.guideId === guide.guideId && x.logDate === viewDate.value && !x.done))
  todayGuides.value.push(doneGuide)
  const shown = todayGuides.value[todayGuides.value.length - 1]! // ตัวที่อยู่ในรายการจริง (เป็น reactive)
  askingGuide.value = shown
  pendingSave = (async () => {
    const authed = await getAuthedSupabaseClient()
    // upsert: ถ้าวันนี้เลือกคู่มือนี้ไว้แล้ว (มีแถวอยู่) = อัปเดตว่าทำแล้ว / ถ้ายังไม่มี = สร้างแถวใหม่ของวันนี้
    const { data, error } = await authed
      .from('guide_logs')
      .upsert({ user_id: profileId.value, guide_id: guide.guideId, log_date: viewDate.value, done_at: nowIso }, { onConflict: 'user_id,guide_id,log_date' })
      .select('id')
      .single()
    clearPageCache()
    if (error || !data) {
      askingGuide.value = null
      await loadTodayGuides() // บันทึกไม่สำเร็จ: โหลดรายการจริงจากฐานข้อมูลกลับมา (ของค้างจะกลับมาขึ้นเหมือนเดิม)
      return
    }
    shown.id = data.id as number
  })()
  await pendingSave
}

// ตอบความรู้สึก: true = ดีขึ้น, false = เฉยๆ/ยังไม่ดีขึ้น
async function answerGuideFeeling(better: boolean) {
  const guide = askingGuide.value
  if (!guide) return
  await pendingSave // รอให้บันทึก "ทำแล้ว" เสร็จก่อน (ของที่ค้างมาจะได้ id แถวใหม่)
  if (!guide.id) { askingGuide.value = null; return }
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('guide_logs').update({ felt_better: better }).eq('id', guide.id)
  clearPageCache() // ข้อมูลของหน้านี้เปลี่ยนแล้ว ที่จำไว้เป็นของเก่า
  if (!error) guide.feltBetter = better
  askingGuide.value = null
}
// คอลัมน์ที่ดึงจาก snack_logs (รวมข้อมูลเมนูไว้โชว์ในการ์ดรายละเอียด)
const SNACK_LOG_COLUMNS = 'id, snack_id, log_date, eaten_at, felt_better, snack_items(name, description, category, image_url, pairing_tip, ingredients, linked_goal_code)'
const todaySnacks = ref<TodaySnack[]>([])
const readingSnack = ref<TodaySnack | null>(null) // เมนูที่กำลังเปิดการ์ดรายละเอียด (null = ไม่โชว์)
const askingSnack = ref<TodaySnack | null>(null) // เมนูที่กำลังถามความรู้สึกอยู่ (null = ไม่มีป๊อปอัพ)

async function loadTodaySnacks() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from('snack_logs')
    .select(SNACK_LOG_COLUMNS)
    .eq('user_id', profileId.value)
    .eq('log_date', viewDate.value)
    .order('chosen_at')
  if (error) loadHadError = true
  // ดูวันนี้อยู่ -> ดึงของว่างที่เลือกไว้ใน 3 วันก่อนหน้าแต่ยังไม่ได้กิน มาขึ้นรอด้วย (ถามว่ากินที่เลือกไว้หรือยัง)
  const carried = isToday.value ? await loadCarriedRows('snack_logs', 'eaten_at', 'snack_id', SNACK_LOG_COLUMNS) : []
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
      snackId: row.snack_id as number,
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

// กดยืนยัน "ทานแล้ว": เด้งถามความรู้สึกต่อทันที (ไม่ต้องรอ/ไม่ต้องปิดอะไร) แล้วบันทึกเวลากินเบื้องหลัง
// - ของวันนี้: อัปเดตแถวเดิมว่ากินแล้ว
// - ของที่ค้างมาจากวันก่อน (เช่น สุ่มชาขิงไว้เมื่อวาน แต่ไปกินวันนี้): แถวเดิมของเมื่อวาน "ไม่แตะ" (เมื่อวานยังขึ้นยังไม่ได้กิน) แต่สร้าง/อัปเดตแถวของ "วันนี้" ให้เป็นกินแล้ว
async function markEaten(snack: TodaySnack, el?: HTMLElement) {
  if (snack.eaten) { askingSnack.value = snack; return }
  if (!profileId.value) return
  sparkleBurst(el) // ดาวแวบขึ้นที่ปุ่ม
  const nowIso = new Date().toISOString()

  // ของวันนี้เอง
  if (snack.logDate === viewDate.value) {
    askingSnack.value = snack
    pendingSave = (async () => {
      const authed = await getAuthedSupabaseClient()
      const { error } = await authed.from('snack_logs').update({ eaten_at: nowIso }).eq('id', snack.id)
      clearPageCache() // ข้อมูลของหน้านี้เปลี่ยนแล้ว ที่จำไว้เป็นของเก่า
      if (error) { if (askingSnack.value === snack) askingSnack.value = null; return }
      snack.eaten = true
      snack.eatenTime = timeOf(nowIso)
    })()
    await pendingSave
    return
  }

  // ของที่ค้างมา: เอาออกจากรายการค้าง ใส่แถวของวันนี้ที่กินแล้วแทน (id จะได้ตอนบันทึกเสร็จ)
  const eatenSnack: TodaySnack = { ...snack, id: 0, logDate: viewDate.value, eaten: true, eatenTime: timeOf(nowIso), feltBetter: null }
  todaySnacks.value = todaySnacks.value.filter(x => x !== snack && !(x.snackId === snack.snackId && x.logDate === viewDate.value && !x.eaten))
  todaySnacks.value.push(eatenSnack)
  const shown = todaySnacks.value[todaySnacks.value.length - 1]! // ตัวที่อยู่ในรายการจริง (เป็น reactive)
  askingSnack.value = shown
  pendingSave = (async () => {
    const authed = await getAuthedSupabaseClient()
    // upsert: ถ้าวันนี้เลือกเมนูนี้ไว้แล้ว (มีแถวอยู่) = อัปเดตว่ากินแล้ว / ถ้ายังไม่มี = สร้างแถวใหม่ของวันนี้
    const { data, error } = await authed
      .from('snack_logs')
      .upsert({ user_id: profileId.value, snack_id: snack.snackId, log_date: viewDate.value, eaten_at: nowIso }, { onConflict: 'user_id,snack_id,log_date' })
      .select('id')
      .single()
    clearPageCache()
    if (error || !data) {
      askingSnack.value = null
      await loadTodaySnacks() // บันทึกไม่สำเร็จ: โหลดรายการจริงจากฐานข้อมูลกลับมา (ของค้างจะกลับมาขึ้นเหมือนเดิม)
      return
    }
    shown.id = data.id as number
  })()
  await pendingSave
}

// ตอบความรู้สึก: true = สบายตัว/ถูกใจ, false = เฉยๆ
async function answerFeeling(better: boolean) {
  const snack = askingSnack.value
  if (!snack) return
  await pendingSave // รอให้บันทึก "กินแล้ว" เสร็จก่อน (ของที่ค้างมาจะได้ id แถวใหม่)
  if (!snack.id) { askingSnack.value = null; return }
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('snack_logs').update({ felt_better: better }).eq('id', snack.id)
  clearPageCache() // ข้อมูลของหน้านี้เปลี่ยนแล้ว ที่จำไว้เป็นของเก่า
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
  onDone?: (el?: HTMLElement) => void // บันทึกว่าทำ/ทานแล้ว (el = ปุ่มที่ไว้ให้ดาวแวบขึ้น ไม่ใส่ก็ได้)
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
    onDone: (el) => { markGuideDone(g, el) }
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
    onDone: (el) => { markEaten(s, el) }
  }))
])

// กดปุ่ม "เช็คอิน" ในการ์ดที่ยังไม่ได้ทำ/ทาน: จำรายการไว้ + ปุ่มที่กด แล้วเปิดป๊อปอัพถามว่า "ทำ/ทานแล้วหรือยัง"
const confirmingItem = ref<TimelineItem | null>(null)
let confirmingEl: HTMLElement | null = null
function askConfirmDone(item: TimelineItem, e: Event) {
  confirmingItem.value = item
  confirmingEl = e.currentTarget as HTMLElement
}
// ตอบ "ทำแล้ว/ทานแล้ว": บันทึก แล้วขั้นตอนเดิมจะเด้งถามความรู้สึกต่อเอง (markGuideDone / markEaten ตั้ง askingGuide / askingSnack ให้)
function confirmDone() {
  const item = confirmingItem.value
  confirmingItem.value = null
  item?.onDone?.(confirmingEl ?? undefined)
  confirmingEl = null
}

function isAchieved(goalCode: string) {
  return (goalDayCounts.value[goalCode] ?? 0) >= CYCLE_LENGTH_DAYS
}

async function refreshProgress() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()

  const { data, error } = await authed
    .from('goal_cycle_progress')
    .select('goal_cycle_id, sleep_days_achieved, exercise_days_achieved, sugar_days_achieved, cold_drink_days_achieved, cycle_end_date')
    .eq('user_id', profileId.value)
    .is('claimed_at', null)
    .order('cycle_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    loadHadError = true
    return // ดึงความคืบหน้าไม่ได้ ไม่เขียนทับค่าเดิมด้วยศูนย์
  }

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
// keepOld = true: ตอนรีเฟรชเบื้องหลังหลังโชว์ของที่จำไว้ ไม่ล้างค่าเดิมก่อน (ไม่งั้นติ๊กจะหายแวบหนึ่ง)
async function loadGoals(keepOld = false) {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()

  if (!keepOld) {
    checkedGoals.value = {}
    goalDayCounts.value = {}
  }

  const [goalTypesRes, userGoalsRes] = await Promise.all([
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profileId.value).eq('is_active', true)
  ])

  if (goalTypesRes.error || userGoalsRes.error) {
    loadHadError = true
    return
  }

  // ยังไม่ได้เลือกเป้าหมายเลย -> ส่งไปหน้าเลือกเป้าหมาย (onboarding/reveal) ก่อน เหมือนหน้าหลัก ไม่ปล่อยส่วน "เป้าหมายวันนี้" ว่าง
  if ((userGoalsRes.data ?? []).length === 0) {
    clearPageCache()
    navigateTo('/onboarding/reveal')
    return
  }

  const goalTypeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  activeGoals.value = (userGoalsRes.data ?? [])
    .map(g => goalTypeById.get(g.goal_type_id))
    .filter((g): g is ActiveGoal => !!g)

  for (const goal of activeGoals.value) {
    if (!(goal.goal_code in goalDayCounts.value)) goalDayCounts.value[goal.goal_code] = 0
  }

  // ติ๊กของวันนี้ กับความคืบหน้ารอบ ไม่ขึ้นต่อกัน ดึงพร้อมกันได้
  await Promise.all([loadChecked(), refreshProgress()])
}

// โหลดว่า "วันที่กำลังดู" ติ๊กเป้าหมายอะไรไว้บ้าง
async function loadChecked() {
  if (!profileId.value) return
  const authed = await getAuthedSupabaseClient()
  const versionAtStart = checkedEditVersion
  const { data, error } = await authed
    .from('daily_checkins')
    .select('*')
    .eq('user_id', profileId.value)
    .eq('checkin_date', viewDate.value)
    .maybeSingle()
  if (error) {
    loadHadError = true
    return
  }
  // ระหว่างรอ ผู้ใช้ติ๊กเป้าหมายไปแล้ว -> ข้อมูลที่ดึงมาเก่ากว่าการติ๊ก ไม่เอามาทับ
  if (versionAtStart !== checkedEditVersion) return
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
  // ไม่หน่วงเวลาเทียมแล้ว: โหลดเสร็จเมื่อไหร่ก็แสดงเมื่อนั้น (หน้ารอจะโผล่เฉพาะตอนเน็ตช้าจริง ดู LoadingOverlay)
  await Promise.all([
    loadChecked(),
    loadTodayPain(),
    loadTodaySnacks(),
    loadTodayGuides()
  ])
  isSwitching.value = false
}

// ติ๊กแล้วหรือยัง (วันนี้: ถ้าเป้าหมายครบ 28 วันแล้วนับว่าติ๊กแล้วด้วย)
function isDone(goalCode: string) {
  return !!checkedGoals.value[goalCode] || (isToday.value && isAchieved(goalCode))
}

// ข้อความในป้ายสถานะของการ์ดเป้าหมาย
function goalStatusText(goalCode: string) {
  if (!isToday.value) return checkedGoals.value[goalCode] ? 'สำเร็จวัน' : 'ไม่ได้เช็คไว้'
  if (isAchieved(goalCode)) return 'สำเร็จครบแล้ว!'
  return checkedGoals.value[goalCode] ? 'สำเร็จ' : 'ยังไม่สำเร็จ'
}

// กด "เริ่มเช็คอินรอบใหม่" ในการ์ดรับผล: โหลดข้อมูลใหม่ทั้งหมดของรอบใหม่
async function reloadAfterClaim() {
  await loadGoals()
  await loadTodayGuides() // ป้าย "แนะนำสำหรับคุณ" ขึ้นกับเป้าหมายที่เปิดอยู่
}

// ข้อมูลทั้งหมดของวันนี้ที่หน้านี้โชว์ จำไว้ใน page-cache (กลับมาเร็วภายใน 50 วิ = โชว์ทันที แล้วแอบดึงของใหม่ตามหลัง)
interface CheckinSnapshot {
  profileId: number
  activeGoals: ActiveGoal[]
  checkedGoals: Record<string, boolean>
  goalDayCounts: Record<string, number>
  daysRemaining: number | null
  openCycleId: number | null
  cycleFinished: boolean
  todayPainLogs: TodayPain[]
  todaySnacks: TodaySnack[]
  todayGuides: TodayGuide[]
}

// เก็บสภาพหน้าตอนนี้เป็นก้อนเดียว (ไว้จำ)
function buildSnapshot(id: number): CheckinSnapshot {
  return {
    profileId: id,
    activeGoals: activeGoals.value,
    checkedGoals: checkedGoals.value,
    goalDayCounts: goalDayCounts.value,
    daysRemaining: daysRemaining.value,
    openCycleId: openCycleId.value,
    cycleFinished: cycleFinished.value,
    todayPainLogs: todayPainLogs.value,
    todaySnacks: todaySnacks.value,
    todayGuides: todayGuides.value
  }
}

// เอาก้อนที่จำไว้ไปใส่ตัวแปรของหน้า
function applySnapshot(snap: CheckinSnapshot) {
  profileId.value = snap.profileId
  activeGoals.value = snap.activeGoals
  checkedGoals.value = snap.checkedGoals
  goalDayCounts.value = snap.goalDayCounts
  daysRemaining.value = snap.daysRemaining
  openCycleId.value = snap.openCycleId
  cycleFinished.value = snap.cycleFinished
  todayPainLogs.value = snap.todayPainLogs
  todaySnacks.value = snap.todaySnacks
  todayGuides.value = snap.todayGuides
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }
  const authUserId = sessionData.session.user.id

  // เพิ่งเข้าหน้านี้มาไม่นาน -> โชว์ข้อมูลที่จำไว้ทันที (ไม่ขึ้นหน้าโหลด) แล้วดึงของใหม่เงียบๆ ต่อด้านล่าง
  const cached = readPageCache<CheckinSnapshot>(authUserId, 'checkin')
  if (cached) {
    applySnapshot(cached)
    isLoading.value = false
  }

  const authed = await getAuthedSupabaseClient()

  // เลขโปรไฟล์: เคยถามมาจากหน้าอื่นแล้วก็ใช้เลย ไม่ต้องถามฐานข้อมูลซ้ำ
  let myProfileId = readProfileId(authUserId)
  if (myProfileId === null) {
    const { data: profile, error: profileError } = await authed
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (profileError || !profile) {
      isLoading.value = false
      return
    }
    myProfileId = profile.id as number
    writeProfileId(authUserId, myProfileId)
  }
  profileId.value = myProfileId

  // เดิมโหลดทีละอย่างต่อกัน 4 รอบ ตอนนี้ดึงพร้อมกัน 2 รอบ:
  // รอบแรก เป้าหมาย + ความปวด (ไม่ขึ้นต่อกัน) / รอบสอง ของว่าง + คู่มือ (ต้องรู้เป้าหมายก่อนถึงใส่ป้าย "แนะนำ" ได้)
  loadHadError = false
  await Promise.all([loadGoals(Boolean(cached)), loadTodayPain()])
  await Promise.all([loadTodaySnacks(), loadTodayGuides()])

  if (loadHadError) {
    // มีบางอย่างดึงไม่สำเร็จ (เช่นเน็ตหลุด): ถ้ามีของที่จำไว้ ก็คืนค่าเดิม ไม่ให้ข้อมูลโหว่ๆ ทับ / และไม่จำข้อมูลที่ไม่ครบ
    if (cached) applySnapshot(cached)
  } else {
    writePageCache(authUserId, 'checkin', buildSnapshot(myProfileId))
  }

  isLoading.value = false
})

async function toggleGoal(goalCode: string, e?: Event) {
  const column = GOAL_CODE_TO_CHECKIN_COLUMN[goalCode]
  if (!isToday.value || !column || !profileId.value || savingGoalCode.value || isAchieved(goalCode)) return

  const newValue = !checkedGoals.value[goalCode]
  checkedEditVersion++
  const buttonEl = e?.currentTarget as HTMLElement | undefined // จำปุ่มไว้ก่อน (หลัง await ค่า currentTarget จะหาย)
  savingGoalCode.value = goalCode

  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('daily_checkins').upsert({
    user_id: profileId.value,
    checkin_date: today,
    [column]: newValue
  }, { onConflict: 'user_id,checkin_date' })

  clearPageCache() // ติ๊กเป้าหมายแล้ว หน้าหลักที่จำไว้เป็นของเก่า
  checkedEditVersion++
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

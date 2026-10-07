<script setup lang="ts">
// ===== หน้าปฏิทินประจำเดือน (app/pages/calendar.vue) =====
// ทำอะไรได้บ้าง
//  1) เลื่อนดูหลายเดือน: วงสีทึบ = ประจำเดือนมาจริง, วงเส้นประ = ระบบคาดไว้ (รวมเดือนในอนาคต)
//  2) กดวันที่ -> มีเมนูขึ้นมาจากด้านล่าง: "มาวันนี้" / "หมดวันนี้" / "ลบการบันทึก"
//  3) เส้นประของรอบเก่าไม่หายไป ถ้าบันทึกไว้ว่ามาไม่ตรงที่คาด (เก็บใน predicted_start_date)
import type { PeriodRow } from '~/utils/period-prediction'
// import ตรงๆ เพื่อให้ชัวร์ (ฟังก์ชันใหม่ที่เพิ่งเพิ่ม Nuxt บางทียังไม่รู้จักจนกว่าจะรีสตาร์ต dev server)
import { buildMonthCells, daysBetween, estimateCycleLength, getDayKind, startOfDay } from '~/utils/period-prediction'

// ---------- ข้อมูลที่ต้องใช้ ----------
const isLoading = ref(true)
const profileId = ref<number | null>(null)
const periodDurationDays = ref(5) // ประจำเดือนมากี่วัน (ค่าเริ่มต้นถ้าโปรไฟล์ยังไม่มี)
const cycleDurationDays = ref(28) // ความยาวรอบ
const profileLastPeriod = ref<string | null>(null) // วันเริ่มที่ตอบไว้ตอน onboarding
const savedRows = ref<PeriodRow[]>([]) // แถวจากตาราง period_cycles

// ถ้ายังไม่เคยบันทึกในตาราง ให้ใช้วันที่จาก onboarding เป็นรอบแรก (แสดงอย่างเดียว แก้/ลบไม่ได้)
const allRows = computed<PeriodRow[]>(() => {
  if (savedRows.value.length > 0) return savedRows.value
  if (profileLastPeriod.value) {
    return [{ cycle_start_date: profileLastPeriod.value, confirmed_end_date: null, predicted_start_date: null }]
  }
  return []
})

// ความยาวรอบที่ใช้จริง: เฉลี่ยจากรอบที่ผู้ใช้บันทึกไว้ (ถ้ายังไม่พอ ใช้ค่าจากโปรไฟล์)
const effectiveCycleDays = computed(() =>
  estimateCycleLength(allRows.value.map(r => r.cycle_start_date), cycleDurationDays.value)
)

const today = startOfDay(new Date())

// ---------- สร้างรายการเดือนที่จะแสดง (ย้อนหลัง 3 เดือน ไปข้างหน้า 6 เดือน) ----------
const MONTHS_BEFORE = 3
const MONTHS_AFTER = 6
const WEEKDAY_HEAD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const months = computed(() => {
  return Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, i) => {
    const first = new Date(today.getFullYear(), today.getMonth() - MONTHS_BEFORE + i, 1)
    const year = first.getFullYear()
    const monthIndex = first.getMonth()
    return {
      key: `${year}-${monthIndex}`,
      title: `${THAI_MONTHS[monthIndex]} ${year + 543}`,
      isCurrent: i === MONTHS_BEFORE,
      // ช่องว่างหน้าเดือนเป็น null, ช่องวันเป็นออบเจ็กต์ที่ใช้วาดได้เลย
      cells: buildMonthCells(year, monthIndex).map(date =>
        date
          ? {
              date,
              label: date.getDate(),
              kind: getDayKind(date, allRows.value, periodDurationDays.value, effectiveCycleDays.value),
              isToday: daysBetween(today, date) === 0
            }
          : null
      )
    }
  })
})

// ---------- วันที่ที่ผู้ใช้กด (เมนูอยู่ในคอมโพเนนต์ PeriodDaySheet) ----------
const selectedDate = ref<Date | null>(null)
const message = ref('')

function openSheet(date: Date) {
  selectedDate.value = date
}
function closeSheet() {
  selectedDate.value = null
}

function showMessage(text: string) {
  message.value = text
  setTimeout(() => {
    message.value = ''
  }, 4000)
}

// เมนูบันทึกสำเร็จ -> โหลดข้อมูลใหม่ แล้วปิดเมนู
async function onChanged(text: string) {
  await loadRows()
  showMessage(text)
  closeSheet()
}

// ---------- ดึงข้อมูลจากฐานข้อมูล ----------
async function loadRows() {
  if (profileId.value === null) return
  const authed = await getAuthedSupabaseClient()
  const { data } = await authed
    .from('period_cycles')
    .select('id, cycle_start_date, confirmed_end_date, predicted_start_date')
    .eq('user_id', profileId.value)
    .order('cycle_start_date', { ascending: true })
  savedRows.value = (data ?? []) as PeriodRow[]
}

// ---------- เริ่มหน้า ----------
onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }

  const authed = await getAuthedSupabaseClient()
  const { data: profile } = await authed
    .from('user_profiles')
    .select('id, last_period_date, period_duration_days, cycle_duration_days')
    .eq('auth_user_id', sessionData.session.user.id)
    .maybeSingle()

  if (!profile) {
    isLoading.value = false
    return
  }

  profileId.value = profile.id
  profileLastPeriod.value = profile.last_period_date ?? null
  periodDurationDays.value = profile.period_duration_days ?? 5
  cycleDurationDays.value = profile.cycle_duration_days ?? 28

  await loadRows()
  isLoading.value = false

  // เลื่อนจอไปที่เดือนปัจจุบันเลย (รอให้หน้าวาดเสร็จก่อน)
  await nextTick()
  document.getElementById('month-current')?.scrollIntoView({ block: 'start' })
})
</script>

<template>
  <main class="min-h-screen bg-moon-bg font-['Anuphan'] text-moon-ink">
    <!-- แถบบน: ปุ่มกลับ + ชื่อหน้า + คำอธิบายสัญลักษณ์ -->
    <header class="sticky top-0 z-20 border-b border-moon-pink/30 bg-moon-bg/95 px-4 pb-2 pt-3 backdrop-blur">
      <div class="flex items-center gap-3">
        <button
          type="button"
          aria-label="กลับหน้าหลัก"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-90"
          @click="navigateTo('/home')"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 class="text-lg font-semibold">ปฏิทิน</h1>
        <div class="ml-auto flex items-center gap-3 text-xs">
          <span class="flex items-center gap-1">
            <span class="h-3 w-3 rounded-full bg-[var(--color-period-soft)]" /> มาแล้ว
          </span>
          <span class="flex items-center gap-1">
            <span class="h-3 w-3 rounded-full border-2 border-dashed border-[color:var(--color-period-deep)]" /> คาดไว้
          </span>
        </div>
      </div>
      <!-- หัวตารางวันในสัปดาห์ -->
      <!-- -mx-2 ทำให้กว้างเท่าตารางวันด้านล่าง (ตารางใช้ px-2, แถบบนใช้ px-4) ตัวอักษรวันจะได้ตรงคอลัมน์ -->
      <div class="-mx-2 mt-3 grid grid-cols-7 text-center text-xs text-moon-ink/60">
        <span v-for="w in WEEKDAY_HEAD" :key="w">{{ w }}</span>
      </div>
    </header>

    <!-- ข้อความแจ้งผลหลังบันทึก -->
    <p
      v-if="message"
      class="fixed left-1/2 top-24 z-40 -translate-x-1/2 rounded-full bg-moon-ink px-4 py-2 text-sm text-white shadow-lg"
    >
      {{ message }}
    </p>

    <p v-if="isLoading" class="py-10 text-center text-sm text-moon-ink/60">กำลังโหลดปฏิทิน...</p>

    <!-- รายการเดือน เลื่อนลงไปเรื่อยๆ -->
    <section v-else class="px-2 pb-32">
      <div v-for="month in months" :key="month.key" :id="month.isCurrent ? 'month-current' : undefined" class="scroll-mt-28 pt-4">
        <!-- ชื่อเดือนชิดซ้ายของปฏิทิน -->
        <h2 class="mb-2 px-3 text-left text-lg font-semibold">{{ month.title }}</h2>

        <div class="grid grid-cols-7 gap-y-1">
          <template v-for="(cell, i) in month.cells" :key="i">
            <!-- ช่องว่างก่อนวันที่ 1 -->
            <div v-if="!cell" />

            <!-- ช่องวัน: กดได้ทั้งช่อง (พื้นที่กดใหญ่ ไม่ต้องเล็งตรงตัวเลข) -->
            <button
              v-else
              type="button"
              class="flex h-12 items-center justify-center transition active:scale-90"
              @click="openSheet(cell.date)"
            >
              <span
                class="flex h-10 w-10 items-center justify-center rounded-full text-[15px]"
                :class="[
                  cell.isToday ? 'bg-[var(--color-period-deep)] font-bold text-white' : '',
                  !cell.isToday && cell.kind === 'logged' ? 'bg-[var(--color-period-soft)] font-semibold' : '',
                  !cell.isToday && cell.kind === 'predicted' ? 'border-2 border-dashed border-[color:var(--color-period-deep)]' : ''
                ]"
              >
                {{ cell.label }}
              </span>
            </button>
          </template>
        </div>
      </div>
    </section>

    <!-- เมนูที่เลื่อนขึ้นมาจากด้านล่างตอนกดวันที่ -->
    <PeriodDaySheet
      v-if="selectedDate && profileId !== null"
      :date="selectedDate"
      :rows="savedRows"
      :all-rows="allRows"
      :profile-id="profileId"
      :period-days="periodDurationDays"
      :cycle-days="effectiveCycleDays"
      @close="closeSheet"
      @changed="onChanged"
    />
  </main>
</template>

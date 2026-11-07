<script setup lang="ts">
// เลข 28 ทั้งแอปรวมอยู่ที่ app/utils/cycle-config.ts (แก้ที่นั่นที่เดียว)
import { DEFAULT_MENSTRUAL_CYCLE_DAYS } from '~/utils/cycle-config'
import { clearPageCache, readPageCache, readProfileId, toCacheJson, writePageCache, writeProfileId } from '~/utils/page-cache'
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
const cycleDurationDays = ref(DEFAULT_MENSTRUAL_CYCLE_DAYS) // ความยาวรอบ
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
  clearPageCache() // ข้อมูลรอบเปลี่ยนแล้ว หน้าหลักที่จำไว้เป็นของเก่า
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
// ข้อมูลที่หน้านี้ใช้ รวมเป็นก้อนเดียวเพื่อจำไว้ใน page-cache (กลับมาเร็วภายใน 50 วิ = โชว์ทันที แล้วแอบดึงของใหม่ตามหลัง)
interface CalendarSnapshot {
  profile: {
    id: number
    last_period_date: string | null
    period_duration_days: number | null
    cycle_duration_days: number | null
  }
  rows: PeriodRow[]
}

function applySnapshot(snap: CalendarSnapshot) {
  profileId.value = snap.profile.id
  profileLastPeriod.value = snap.profile.last_period_date ?? null
  periodDurationDays.value = snap.profile.period_duration_days ?? 5
  cycleDurationDays.value = snap.profile.cycle_duration_days ?? DEFAULT_MENSTRUAL_CYCLE_DAYS
  savedRows.value = snap.rows
}

// เลื่อนจอไปที่เดือนปัจจุบันเลย (รอให้หน้าวาดเสร็จก่อน)
async function scrollToCurrentMonth() {
  await nextTick()
  document.getElementById('month-current')?.scrollIntoView({ block: 'start' })
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
  const cached = readPageCache<CalendarSnapshot>(authUserId, 'calendar')
  const cachedJson = cached ? toCacheJson(cached) : ''
  if (cached) {
    applySnapshot(cached)
    isLoading.value = false
    await scrollToCurrentMonth()
  }

  const authed = await getAuthedSupabaseClient()
  const fetchRows = (id: number) => authed
    .from('period_cycles')
    .select('id, cycle_start_date, confirmed_end_date, predicted_start_date')
    .eq('user_id', id)
    .order('cycle_start_date', { ascending: true })

  // รู้เลขโปรไฟล์อยู่แล้ว (เคยถามมาจากหน้าอื่น) -> ดึงรอบประจำเดือนไปพร้อมกับโปรไฟล์เลย ไม่ต้องรอต่อคิว
  const knownId = readProfileId(authUserId)
  const rowsEarly = knownId !== null ? fetchRows(knownId) : null

  const { data: profile } = await authed
    .from('user_profiles')
    .select('id, last_period_date, period_duration_days, cycle_duration_days')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!profile) {
    isLoading.value = false
    return
  }
  writeProfileId(authUserId, profile.id)

  // เลขที่จำไว้ตรงกับของจริงถึงใช้ผลที่ดึงล่วงหน้า (ไม่ตรง = ดึงใหม่)
  const rowsRes = rowsEarly && knownId === profile.id ? await rowsEarly : await fetchRows(profile.id)

  // ดึงรอบไม่สำเร็จ (เช่นเน็ตหลุด): ถ้ามีของที่จำไว้โชว์อยู่ก็คงไว้ ไม่เอาข้อมูลโหว่ไปทับ
  if (rowsRes.error && cached) return

  const fresh: CalendarSnapshot = { profile, rows: (rowsRes.data ?? []) as PeriodRow[] }
  if (!rowsRes.error) writePageCache(authUserId, 'calendar', fresh)

  // ข้อมูลใหม่เหมือนที่โชว์อยู่แล้ว = ไม่ต้องวาดซ้ำ
  if (toCacheJson(fresh) !== cachedJson) applySnapshot(fresh)
  isLoading.value = false

  if (!cached) await scrollToCurrentMonth()
})
</script>

<template>
  <!-- พื้นหลังปฏิทินเป็นสีขาว (bg-moon-card = #FFFFFF) เดิมเป็นไล่สีชมพูอ่อน -->
  <main class="min-h-screen bg-moon-card text-moon-ink">
    <!-- แถบบน: ปุ่มกลับ + ชื่อหน้า + โลโก้กระต่าย (ขวาบน) / ใต้โลโก้มีคำอธิบายสัญลักษณ์ / ล่างสุดเป็นหัวตารางวัน -->
    <header class="sticky top-0 z-20 border-b border-moon-pink-soft bg-moon-card px-2 pb-2 pt-3">
      <div class="flex h-10 items-center gap-3 px-2">
        <button
          type="button"
          aria-label="กลับหน้าหลัก"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moon-card shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition active:scale-90"
          @click="navigateTo('/home')"
        >
          <FaIcon name="chevron-left" class="h-[14px] w-2" />
        </button>
        <h1 class="text-lg font-semibold">ปฏิทิน</h1>
        <!-- โลโก้รอง (หน้าอื่นวางที่ BrandCorner มุมขวาบน หน้านี้วางในแถบ ชิดขวา) -->
        <BrandLogoMark :size="42" class="ml-auto shrink-0" aria-hidden="true" />
      </div>
      <!-- คำอธิบายสัญลักษณ์: อยู่ใต้โลโก้กระต่าย ชิดขวา ขนาดใหญ่ขึ้นให้อ่านง่าย (ตัวอักษรปรับที่ text-sm / วงปรับที่ h-4 w-4) -->
      <div class="mt-1 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-3 text-sm">
        <span class="flex items-center gap-1.5">
          <span class="h-4 w-4 rounded-full bg-moon-coral" /> วันนี้
        </span>
        <span class="flex items-center gap-1.5">
          <span class="h-4 w-4 rounded-full bg-moon-pink-soft ring-1 ring-moon-pink" /> มาแล้ว
        </span>
        <span class="flex items-center gap-1.5">
          <span class="h-4 w-4 rounded-full border-2 border-dashed border-moon-coral" /> คาดไว้
        </span>
      </div>
      <!-- หัวตารางวันในสัปดาห์ (7 คอลัมน์เท่ากับตารางด้านล่าง) -->
      <div class="mt-3 grid grid-cols-7 text-center text-xs text-moon-muted">
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

    <LoadingOverlay v-if="isLoading" text="กำลังโหลดปฏิทิน..." />

    <!-- รายการเดือน เลื่อนลงไปเรื่อยๆ -->
    <section v-else class="px-2 pb-32">
      <div v-for="month in months" :key="month.key" :id="month.isCurrent ? 'month-current' : undefined" class="scroll-mt-28 pt-4">
        <!-- ชื่อเดือน มีเส้นสีประจำเดือนคาดด้านบน -->
        <h2 class="border-t border-moon-period px-3 py-2 text-left text-lg font-semibold">{{ month.title }}</h2>

        <div class="mt-0 grid grid-cols-7 gap-y-1">
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
                class="flex h-10 w-10 items-center justify-center rounded-full text-base"
                :class="[
                  cell.isToday ? 'bg-moon-coral text-moon-bg' : '',
                  !cell.isToday && cell.kind === 'logged' ? 'bg-moon-pink-soft ring-1 ring-moon-pink' : '', // มีขอบชมพูบางๆ ให้เห็นชัดบนพื้นขาว
                  !cell.isToday && cell.kind === 'predicted' ? 'border-2 border-dashed border-moon-coral' : ''
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

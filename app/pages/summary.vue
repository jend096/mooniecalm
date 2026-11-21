<script setup lang="ts">
// ===== หน้า "สรุปเดือน" (/summary) ตามฟิกม่า =====
// โชว์ผลของ "เดือน" (= 1 รอบประจำเดือน) ที่เลือก: กราฟความปวดรายวัน + ปวดสูงสุด/เฉลี่ย/ระยะเวลา
//   + % รู้สึกดีขึ้นหลังทำตามคู่มือ/กินของว่าง + อาการเพิ่มเติมที่บันทึกไว้
// ยังไม่เลือกเดือน = โชว์รอบล่าสุดที่กดวันหมดแล้ว / กดปุ่ม "ปฏิทิน" เลือกเทียบได้สูงสุด 3 เดือน (กราฟซ้อนเส้น)
// สถิติและส่วนล่างทั้งหมดคิดจากเดือนแรกในรายการที่เลือก (เดือนใหม่สุด) / ฟังก์ชันดึงข้อมูลอยู่ใน ~/utils/monthly-summary.ts
import { getAuthedSupabaseClient } from '~/utils/supabase-authed-client'
import { writeProfileId } from '~/utils/page-cache'
import { painLevelLabel } from '~/utils/guide-picker'
import type { PeriodRow } from '~/utils/period-prediction'
import {
  buildCycleOptions,
  computePainStats,
  defaultCycleKeys,
  loadCycleDetails,
  loadPainByCycle,
  type CycleDetails,
  type CycleOption,
  type PainPoint
} from '~/utils/monthly-summary'

// สีเส้น/จุดของแต่ละเดือนที่เลือก เรียงใหม่สุดก่อน (ชมพู / ม่วง / เหลือง ตามฟิกม่า)
const SERIES_COLORS = ['var(--color-period-day)', 'var(--color-lavender)', 'var(--color-yellow)']

const isLoading = ref(true)
const loadError = ref('')
const profileId = ref<number | null>(null)
const cycles = ref<CycleOption[]>([])
const selectedKeys = ref<string[]>([])
const painByKey = ref<Record<string, PainPoint[]>>({})
const details = ref<CycleDetails | null>(null)
const pickerOpen = ref(false)
const NOTES_PREVIEW = 3
const notesExpanded = ref(false)
let loadToken = 0

const selectedCycles = computed(() => cycles.value.filter(c => selectedKeys.value.includes(c.key)))
const primary = computed(() => selectedCycles.value[0] ?? null)

const series = computed(() => selectedCycles.value.map((c, i) => ({
  key: c.key,
  label: c.chipLabel,
  color: SERIES_COLORS[i] ?? SERIES_COLORS[0]!,
  points: painByKey.value[c.key] ?? []
})))
const chartDays = computed(() => Math.max(5, ...selectedCycles.value.map(c => c.length)))

const stats = computed(() => computePainStats(primary.value ? (painByKey.value[primary.value.key] ?? []) : []))
const shownNotes = computed(() => {
  const all = details.value?.notes ?? []
  return notesExpanded.value ? all : all.slice(0, NOTES_PREVIEW)
})
const subtitle = computed(() => primary.value ? `ของเดือน ${primary.value.fullLabel}` : '')

// ---------- ดึงข้อมูล ----------
async function loadSelection() {
  const token = ++loadToken
  const id = profileId.value
  const main = primary.value
  if (id === null || !main) return
  loadError.value = ''
  try {
    const needPain = selectedCycles.value.filter(c => !(c.key in painByKey.value))
    const [pain, detail] = await Promise.all([
      needPain.length ? loadPainByCycle(id, needPain) : Promise.resolve({}),
      loadCycleDetails(id, main)
    ])
    if (token !== loadToken) return // ระหว่างรอผู้ใช้เปลี่ยนเดือนไปแล้ว
    painByKey.value = { ...painByKey.value, ...pain }
    details.value = detail
  } catch {
    if (token === loadToken) loadError.value = 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้งนะ'
  }
}

function applySelection(keys: string[]) {
  pickerOpen.value = false
  selectedKeys.value = keys
  details.value = null
  notesExpanded.value = false
  void loadSelection()
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    navigateTo('/onboarding/signup')
    return
  }
  const authUserId = sessionData.session.user.id
  try {
    const authed = await getAuthedSupabaseClient()
    const { data: profile } = await authed
      .from('user_profiles')
      .select('id, period_duration_days')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (!profile) return
    writeProfileId(authUserId, profile.id as number)
    profileId.value = profile.id as number

    const { data, error } = await authed
      .from('period_cycles')
      .select('id, cycle_start_date, confirmed_end_date, predicted_start_date')
      .eq('user_id', profile.id)
      .order('cycle_start_date', { ascending: true })
    if (error) throw error

    cycles.value = buildCycleOptions((data ?? []) as PeriodRow[], (profile.period_duration_days as number | null) ?? 5)
    selectedKeys.value = defaultCycleKeys(cycles.value)
    await loadSelection()
  } catch {
    loadError.value = 'โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้งนะ'
  } finally {
    isLoading.value = false
  }
})

function retry() {
  if (!cycles.value.length) {
    location.reload()
    return
  }
  void loadSelection()
}

function goBack() {
  navigateTo('/home')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-16 text-moon-ink">
    <!-- ปุ่มย้อนกลับ -->
    <button
      type="button"
      class="absolute left-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-moon-gray shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
      aria-label="ย้อนกลับ"
      @click="goBack"
    >
      <FaIcon name="chevron-left" class="h-[14px] w-2" />
    </button>

    <h1 class="text-center text-2xl font-semibold">สรุปผลประจำเดือน</h1>
    <p v-if="subtitle" class="text-center text-[13px] leading-[18px] text-moon-muted">{{ subtitle }}</p>

    <!-- กำลังโหลด -->
    <p v-if="isLoading" class="mt-10 text-center text-sm text-moon-muted">กำลังโหลดข้อมูลของคุณ…</p>

    <!-- ยังไม่เคยบันทึกประจำเดือน -->
    <div v-else-if="!cycles.length && !loadError" class="mt-8 rounded-card bg-moon-card px-6 py-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <p class="text-lg">ยังไม่มีข้อมูลประจำเดือน</p>
      <p class="mt-2 text-sm text-moon-muted">เมื่อคุณบันทึกว่าประจำเดือนมาแล้ว และบันทึกความปวดในแต่ละวัน สรุปของเดือนนั้นจะมาขึ้นที่นี่</p>
      <NuxtLink
        to="/calendar"
        class="mt-5 inline-flex rounded-full bg-moon-ink px-6 py-3 text-sm font-semibold text-moon-on-ink transition active:scale-95"
      >
        ไปที่ปฏิทิน
      </NuxtLink>
    </div>

    <!-- โหลดไม่สำเร็จ (และยังไม่มีข้อมูลโชว์) -->
    <div v-else-if="loadError && !details" class="mt-8 text-center">
      <p class="text-sm text-moon-muted">{{ loadError }}</p>
      <button type="button" class="mt-3 rounded-full bg-moon-pink px-5 py-2 text-sm font-medium transition active:scale-95" @click="retry">
        ลองอีกครั้ง
      </button>
    </div>

    <template v-else>
      <!-- ความปวดตลอดรอบประจำเดือน -->
      <section class="mt-6 flex flex-col gap-3">
        <h2 class="text-lg">ความปวดตลอดรอบประจำเดือน</h2>
        <div class="flex flex-col gap-[33px] rounded-card bg-moon-card px-4 pb-4 pt-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div class="-mb-[17px] flex items-center justify-between gap-3">
            <p class="text-xs leading-[17px] text-moon-muted">เลือกเทียบได้สูงสุด 3 เดือน</p>
            <button
              type="button"
              class="flex shrink-0 items-center gap-[5px] rounded-full border border-moon-pink-soft bg-moon-card py-[3px] pl-[3px] pr-3 transition active:scale-95"
              aria-label="เลือกเดือนที่จะเทียบ"
              @click="pickerOpen = true"
            >
              <span class="flex items-center justify-center rounded-full bg-moon-chip p-[7px]">
                <FaIcon name="calendar-days-regular" class="h-[14px] w-[14px]" />
              </span>
              <span class="text-sm font-medium leading-[22px]">ปฏิทิน</span>
            </button>
          </div>

          <!-- ชิปเดือนที่เลือก -->
          <div class="flex gap-2">
            <div
              v-for="(c, i) in selectedCycles"
              :key="c.key"
              class="flex min-w-0 flex-1 items-center justify-center gap-[6px] rounded-full bg-moon-pink-soft p-2"
            >
              <span class="h-[10px] w-[10px] shrink-0 rounded-full border border-moon-muted/30" :style="{ background: SERIES_COLORS[i] }" />
              <span class="truncate text-[13px] leading-[17px]">{{ c.chipLabel }}</span>
            </div>
          </div>

          <PainLineChart :days="chartDays" :series="series" />

          <!-- สรุปตัวเลขของเดือนแรก -->
          <div class="flex gap-2">
            <div class="flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] bg-moon-pink-soft p-3">
              <p class="text-xxs text-moon-muted">ปวดสูงสุด</p>
              <p class="text-lg font-semibold leading-[23px]">{{ stats.maxDay !== null ? `วันที่ ${stats.maxDay}` : '–' }}</p>
              <p class="text-xxs text-moon-muted">
                {{ stats.maxLevel !== null ? `ระดับ ${stats.maxLevel} (${painLevelLabel(stats.maxLevel)})` : 'ยังไม่มีบันทึก' }}
              </p>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] bg-moon-pink-soft p-3">
              <p class="text-xxs text-moon-muted">ปวดเฉลี่ย</p>
              <p class="text-lg font-semibold leading-[23px]">{{ stats.average !== null ? stats.average : '–' }}</p>
              <p class="text-xxs text-moon-muted">จากระดับ 0–10</p>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] bg-moon-pink-soft p-3">
              <p class="text-xxs text-moon-muted">ระยะเวลา</p>
              <p class="text-lg font-semibold leading-[23px]">{{ primary ? `${primary.length} วัน` : '–' }}</p>
              <p class="text-xxs text-moon-muted">{{ primary?.rangeText }}</p>
            </div>
          </div>
        </div>
      </section>

      <p v-if="loadError" class="mt-4 text-center text-xs text-moon-muted">
        {{ loadError }}
        <button type="button" class="ml-1 underline" @click="retry">ลองอีกครั้ง</button>
      </p>

      <template v-if="details">
        <!-- ผลหลังทำตามคู่มือและของว่าง -->
        <section class="mt-6 flex flex-col gap-3">
          <h2 class="text-lg">ผลที่คุณบันทึกหลังทำตามคู่มือและของว่าง</h2>
          <div class="flex gap-3">
            <div class="flex min-w-0 flex-1 flex-col items-center gap-[10px] rounded-card bg-moon-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <p class="text-sm font-semibold leading-[18px]">คู่มือบรรเทาปวด</p>
              <PercentRing :percent="details.guideTotal.percent" :size="112" :stroke="12" color="var(--color-period-day)" track="var(--color-pink-soft)">
                <span class="text-[26px] font-semibold leading-[31px]">{{ details.guideTotal.percent }}%</span>
                <span class="text-xxs text-moon-muted">รู้สึกดีขึ้น</span>
              </PercentRing>
              <p class="text-center text-xs leading-[17px] text-moon-muted">
                ทำไป {{ details.guideTotal.total }} ครั้ง · รู้สึกดีขึ้น {{ details.guideTotal.felt }} ครั้ง
              </p>
            </div>
            <div class="flex min-w-0 flex-1 flex-col items-center gap-[10px] rounded-card bg-moon-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <p class="text-sm font-semibold leading-[18px]">ของว่างทดแทน</p>
              <PercentRing :percent="details.snackTotal.percent" :size="112" :stroke="12" color="var(--color-lavender)" track="var(--color-lavender-soft)">
                <span class="text-[26px] font-semibold leading-[31px]">{{ details.snackTotal.percent }}%</span>
                <span class="text-xxs text-moon-muted">รู้สึกดีขึ้น</span>
              </PercentRing>
              <p class="text-center text-xs leading-[17px] text-moon-muted">
                เลือกไป {{ details.snackTotal.total }} เมนู · รู้สึกดีขึ้น {{ details.snackTotal.felt }} เมนู
              </p>
            </div>
          </div>
        </section>

        <!-- คู่มือที่เลือกทั้งหมด -->
        <section class="mt-6 flex flex-col gap-3">
          <h2 class="text-lg">คู่มือที่เลือกทั้งหมด ({{ details.guideTotal.total }} ครั้ง)</h2>
          <div class="flex flex-col gap-2 rounded-card bg-moon-cream-soft p-4">
            <p v-if="!details.guides.length" class="py-2 text-center text-xs text-moon-muted">ยังไม่มีคู่มือที่ทำในเดือนนี้</p>
            <div v-for="g in details.guides" :key="g.id" class="flex items-center gap-3 rounded-2xl bg-moon-card p-3">
              <PercentRing :percent="g.percent" :size="48" :stroke="5" color="var(--color-period-day)" track="var(--color-pink-soft)">
                <span class="text-xxs font-semibold">{{ g.percent }}%</span>
              </PercentRing>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium leading-[18px]">{{ g.name }}</p>
                <p class="text-xs leading-4 text-moon-muted">ทำ {{ g.total }} ครั้ง · รู้สึกดีขึ้น {{ g.felt }} ครั้ง</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ของว่างที่เลือกทั้งหมด -->
        <section class="mt-6 flex flex-col gap-3">
          <h2 class="text-lg">ของว่างที่เลือกทั้งหมด ({{ details.snackTotal.total }} เมนู)</h2>
          <div class="flex flex-col gap-2 rounded-card bg-moon-lavender-soft p-4">
            <p v-if="!details.snackCategories.length" class="py-2 text-center text-xs text-moon-muted">ยังไม่มีของว่างที่เลือกในเดือนนี้</p>
            <div v-for="c in details.snackCategories" :key="c.id" class="flex items-center gap-3 rounded-2xl bg-moon-card p-3">
              <PercentRing :percent="c.percent" :size="48" :stroke="5" color="var(--color-lavender)" track="var(--color-lavender-soft)">
                <span class="text-xxs font-semibold">{{ c.percent }}%</span>
              </PercentRing>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium leading-[18px]">{{ c.name }}</p>
                <p class="text-xs leading-4 text-moon-muted">เลือก {{ c.total }} เมนู · รู้สึกดีขึ้น {{ c.felt }} เมนู</p>
              </div>
            </div>
          </div>
        </section>

        <!-- อาการเพิ่มเติม -->
        <section class="mt-6 flex flex-col gap-3">
          <h2 class="text-lg">อาการเพิ่มเติมที่พบรอบนี้</h2>
          <div class="flex flex-col gap-4 rounded-card bg-moon-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p v-if="!details.extras.length" class="py-2 text-center text-xs text-moon-muted">
              ยังไม่มีอาการเพิ่มเติมที่บันทึกตลอดรอบนี้
            </p>
            <div v-for="g in details.extras" :key="g.title">
              <p class="text-sm font-medium leading-[22px]">{{ g.title }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span v-for="it in g.items" :key="it.code" class="flex items-center gap-[6px] rounded-full bg-moon-chip px-4 py-2 text-sm">
                  <span v-if="it.dot" class="h-[10px] w-[10px] shrink-0 rounded-full" :style="{ background: it.dot }" />
                  <template v-if="g.title === 'ยาแก้ปวด'">{{ it.label }}</template>
                  <template v-else>{{ it.label }}({{ it.count }})</template>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- บันทึกเพิ่มเติม (Notes): เฉพาะวันที่พิมพ์ข้อความไว้ ไม่มีเลย = ซ่อนทั้งส่วน -->
        <section v-if="details.notes.length" class="mt-6 flex flex-col gap-3">
          <h2 class="text-lg">บันทึกเพิ่มเติม (Notes)</h2>
          <ul class="flex flex-col gap-2">
            <li v-for="n in shownNotes" :key="n.date" class="rounded-2xl bg-moon-cream-soft p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <p class="text-xxs text-moon-muted">{{ n.dateText }}</p>
              <p class="mt-1 whitespace-pre-line break-words text-sm leading-[21px]">{{ n.text }}</p>
            </li>
          </ul>
          <button
            v-if="details.notes.length > NOTES_PREVIEW"
            type="button"
            class="self-center rounded-full bg-moon-pink px-5 py-2 text-sm font-medium transition active:scale-95"
            :aria-expanded="notesExpanded"
            @click="notesExpanded = !notesExpanded"
          >
            {{ notesExpanded ? 'ย่อลง' : `ดูทั้งหมด (${details.notes.length})` }}
          </button>
        </section>
      </template>

      <!-- คำเตือน -->
      <div class="mt-6 flex items-start gap-2 rounded-2xl bg-moon-card p-4">
        <span class="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-moon-period" />
        <p class="text-xs leading-[18px] text-moon-muted">
          ตัวเลขทั้งหมดสรุปจากที่คุณกดบันทึกเอง ใช้ดูแนวโน้มของตัวเองเท่านั้น ไม่ใช่ผลการรักษาหรือคำวินิจฉัยทางการแพทย์ หากปวดมากผิดปกติควรปรึกษาแพทย์
        </p>
      </div>
    </template>

    <MonthPickerSheet
      v-if="pickerOpen"
      :cycles="cycles"
      :selected="selectedKeys"
      @apply="applySelection"
      @close="pickerOpen = false"
    />

    <BottomNav active="summary" />
  </div>
</template>

<template>
  <div
    v-if="!isLoading"
    class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[50px] text-moon-ink"
    :class="{ 'view-only': !isToday }"
  >
    <!-- สลับวันในปฏิทิน: ขึ้นหน้ารอโหลดระหว่างดึงข้อมูลของวันนั้น -->
    <LoadingOverlay v-if="isSwitching" text="กำลังโหลดข้อมูลของวันนั้น..." />

    <!-- ปุ่มย้อนกลับ -->
    <button
      type="button"
      class="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-moon-gray shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
      aria-label="ย้อนกลับ"
      @click="back"
    >
      <FaIcon name="chevron-left" class="h-[14px] w-2 text-moon-ink" />
    </button>

    <h1 class="text-center text-2xl font-semibold">บันทึกอาการเพิ่มเติม</h1>

    <!-- วันที่ที่กำลังดู: กดเพื่อเลือกวันเก่าดูย้อนหลัง (เหมือนหน้าเช็คอิน) -->
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

    <!-- ดูย้อนหลัง: บอกให้รู้ว่าดูได้อย่างเดียว (ทั้งหน้าจะจางลง เห็นเด่นเฉพาะอันที่เลือกไว้) -->
    <p v-if="!isToday" class="mt-3 rounded-2xl bg-moon-cream-soft px-4 py-3 text-xs leading-[18px] text-moon-muted">
      กำลังดูย้อนหลัง ดูได้อย่างเดียว
    </p>

    <p v-if="errorMessage" class="mt-3 rounded-2xl bg-moon-pink px-4 py-3 text-xs leading-[18px]" role="alert">{{ errorMessage }}</p>

    <!-- ปริมาณเลือดประจำเดือน -->
    <section class="mt-6">
      <h2 class="text-lg font-medium leading-[26px]">ปริมาณเลือดประจำเดือน</h2>
      <div class="extra-card">
        <button
          v-for="opt in FLOW_AMOUNT_OPTIONS"
          :key="opt.code"
          type="button"
          class="extra-chip transition active:scale-95 disabled:active:scale-100"
          :class="values.flow_amount === opt.code ? 'bg-moon-ink text-white' : 'bg-moon-pink-soft'"
          :disabled="!isToday"
          :aria-pressed="values.flow_amount === opt.code"
          @click="pickChoice('flow_amount', opt.code)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- สีของประจำเดือน -->
    <section class="mt-6">
      <h2 class="text-lg font-medium leading-[26px]">สีของประจำเดือน</h2>
      <div class="extra-card">
        <button
          v-for="opt in FLOW_COLOR_OPTIONS"
          :key="opt.code"
          type="button"
          class="extra-chip extra-chip-color transition active:scale-95 disabled:active:scale-100"
          :class="values.flow_color === opt.code ? 'border-moon-ink bg-moon-ink text-white' : 'border-moon-pink-soft bg-moon-card'"
          :disabled="!isToday"
          :aria-pressed="values.flow_color === opt.code"
          @click="pickChoice('flow_color', opt.code)"
        >
          <span class="color-dot" :style="{ backgroundColor: opt.dot }" />
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- สีตกขาว -->
    <section class="mt-6">
      <h2 class="text-lg font-medium leading-[26px]">สีตกขาว</h2>
      <div class="extra-card">
        <button
          v-for="opt in DISCHARGE_COLOR_OPTIONS"
          :key="opt.code"
          type="button"
          class="extra-chip transition active:scale-95 disabled:active:scale-100"
          :class="values.discharge_color === opt.code ? 'bg-moon-ink text-white' : 'bg-moon-lavender-soft'"
          :disabled="!isToday"
          :aria-pressed="values.discharge_color === opt.code"
          @click="pickChoice('discharge_color', opt.code)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- อารมณ์วันนี้ -->
    <section class="mt-6">
      <h2 class="text-lg font-medium leading-[26px]">{{ isToday ? 'อารมณ์วันนี้' : 'อารมณ์ของวันนั้น' }}</h2>
      <div class="extra-card">
        <button
          v-for="opt in MOOD_OPTIONS"
          :key="opt.code"
          type="button"
          class="extra-chip transition active:scale-95 disabled:active:scale-100"
          :class="values.mood === opt.code ? 'bg-moon-ink text-white' : 'bg-moon-pink-soft'"
          :disabled="!isToday"
          :aria-pressed="values.mood === opt.code"
          @click="pickChoice('mood', opt.code)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- อาการ (เลือกได้หลายอัน) -->
    <section class="mt-6">
      <h2 class="text-lg font-medium leading-[26px]">อาการ</h2>
      <div class="extra-card">
        <div v-if="!symptomTypes.length" class="flex w-full items-center justify-between gap-3">
          <p class="text-sm text-moon-muted">โหลดรายการอาการไม่สำเร็จ</p>
          <button type="button" class="retry-btn" @click="reloadSymptomTypes">ลองใหม่</button>
        </div>
        <button
          v-for="s in symptomTypes"
          :key="s.id"
          type="button"
          class="extra-chip transition active:scale-95 disabled:active:scale-100"
          :class="selectedSymptomIds.includes(s.id) ? 'bg-moon-ink text-white' : 'bg-moon-cream-soft'"
          :disabled="!isToday"
          :aria-pressed="selectedSymptomIds.includes(s.id)"
          @click="pickSymptom(s.id)"
        >
          {{ s.label }}
        </button>
      </div>
      <!-- ข้อความเตือนของอาการที่เลือก (เช่น ควรปรึกษาแพทย์) -->
      <p
        v-for="note in symptomNotes"
        :key="note"
        class="mt-2 rounded-2xl bg-moon-cream-soft px-4 py-3 text-xs leading-[18px] text-moon-muted"
      >
        {{ note }}
      </p>
    </section>

    <!-- ยาแก้ปวดที่กิน -->
    <div class="med-card">
      <p class="text-base">{{ isToday ? 'ยาแก้ปวดที่กินวันนี้' : 'ยาแก้ปวดที่กินวันนั้น' }}</p>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-moon-pink-soft bg-moon-bg transition active:scale-90 disabled:opacity-40 disabled:active:scale-100"
          aria-label="ลดจำนวนยา"
          :disabled="!isToday || values.medication_count <= 0"
          @click="changeMedication(-1)"
        >
          <FaIcon name="minus" class="icon-minus text-moon-ink" />
        </button>
        <span class="w-8 text-center text-xl font-medium tabular-nums">{{ values.medication_count }}</span>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-moon-ink transition active:scale-90 disabled:opacity-40 disabled:active:scale-100"
          aria-label="เพิ่มจำนวนยา"
          :disabled="!isToday || values.medication_count >= MEDICATION_MAX"
          @click="changeMedication(1)"
        >
          <FaIcon name="plus" class="icon-plus text-white" />
        </button>
      </div>
    </div>

    <!-- บันทึกอาการเพิ่มเติม (ข้อความ) -->
    <section class="mt-6">
      <h2 class="text-lg font-medium leading-[26px]">บันทึกอาการเพิ่มเติม</h2>
      <!-- วันนี้: กล่องทั้งใบคือช่องพิมพ์ แตะตรงไหนก็พิมพ์ได้เลย บันทึกให้อัตโนมัติ / ย้อนหลัง: ดูข้อความได้อย่างเดียว -->
      <label v-if="isToday" class="note-card note-card-edit">
        <textarea
          ref="noteEl"
          v-model="noteDraft"
          :maxlength="NOTE_MAX_LENGTH"
          rows="4"
          class="note-input"
          placeholder="แตะที่นี่เพื่อเขียนบันทึกอาการเพิ่มเติม"
          @input="onNoteInput"
          @focus="noteFocused = true"
          @blur="onNoteBlur"
        />
        <span v-if="noteFocused" class="note-count">{{ noteDraft.length }} / {{ NOTE_MAX_LENGTH }}</span>
      </label>
      <div v-else class="note-card">
        <p
          class="note-text"
          :class="values.notes ? '' : 'note-empty'"
        >{{ values.notes || 'วันนั้นไม่ได้เขียนบันทึกไว้' }}</p>
      </div>
    </section>

    <!-- ปุ่มเสร็จ: บันทึกไปแล้วทุกครั้งที่กด ปุ่มนี้แค่พากลับหน้าหลัก (ดูย้อนหลังไม่ต้องมี) -->
    <div v-if="isToday" class="mt-6">
      <BaseButton label="เสร็จแล้ว" @click="goHome" />
    </div>

    <!-- ปฏิทินเลือกวันดูย้อนหลัง -->
    <DayPickSheet
      v-if="showDayPicker"
      :selected="viewDate"
      :max="today"
      @pick="changeDay"
      @close="showDayPicker = false"
    />

    <BottomNav active="symptoms" />
  </div>

  <!-- ระหว่างดึงข้อมูล: ขึ้นกระต่ายรอโหลด (หน้าจริงโผล่หลังโหลดเสร็จ) -->
  <LoadingOverlay v-else />
</template>

<script setup lang="ts">
import {
  FLOW_AMOUNT_OPTIONS,
  FLOW_COLOR_OPTIONS,
  DISCHARGE_COLOR_OPTIONS,
  MOOD_OPTIONS,
  MEDICATION_MAX,
  NOTE_MAX_LENGTH,
  emptyExtraValues,
  loadExtraValues,
  saveExtraField
} from '~/utils/extra-logs'
import type { ExtraChoiceField, ExtraValues } from '~/utils/extra-logs'
import {
  addSymptomLog,
  loadSavedSymptomIds,
  loadSymptomTypes,
  notesForSelected,
  removeSymptomLog
} from '~/utils/symptom-logs'
import type { SymptomType } from '~/utils/symptom-logs'
import { parseLocalDate } from '~/utils/period-prediction'

// ===== หน้า "บันทึกอาการเพิ่มเติม" (app/pages/symptoms.vue) =====
// กติกา:
//   - กดตัวเลือกไหน = บันทึกลงฐานข้อมูลทันที (ไม่มีปุ่มบันทึก)
//   - กดตัวที่เลือกอยู่ซ้ำ = เอาออก และลบออกจากฐานข้อมูลทันที
//   - เลือกวันเก่าดูย้อนหลังได้ แต่แก้ไม่ได้ (ปุ่มทุกอันถูกปิด และทั้งหน้าจางลงเป็นโหมดดูอย่างเดียว เห็นเด่นเฉพาะอันที่เลือกไว้)
//   - ข้อมูลหน้านี้ไม่ไปปนกับหน้าเช็คอิน เก็บพร้อมวันที่ไว้ให้หน้าสรุปเดือนจัดเข้ารอบประจำเดือนเอง
// ปุ่มย้อนกลับ: กลับหน้าหลักเสมอ (ไม่ใช้ router.back เพราะอาจย้อนไปหน้าเช็คอิน)
function back() {
  navigateTo('/home')
}

// ปุ่ม "เสร็จแล้ว": ทุกอย่างบันทึกไปแล้วตอนกด ปุ่มนี้แค่พากลับหน้าหลัก
function goHome() {
  navigateTo('/home')
}

const today = getLocalDateString()
const viewDate = ref(today)
const isToday = computed(() => viewDate.value === today)
const showDayPicker = ref(false)
const isSwitching = ref(false)

const isLoading = ref(true)
const profileId = ref<number | null>(null)
const errorMessage = ref('')
const values = ref<ExtraValues>(emptyExtraValues())
const symptomTypes = ref<SymptomType[]>([])
const selectedSymptomIds = ref<number[]>([])

const viewLabel = computed(() => {
  const d = parseLocalDate(viewDate.value)
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
})

const symptomNotes = computed(() => notesForSelected(symptomTypes.value, selectedSymptomIds.value))

// ตัวเลือกที่กำลังบันทึกอยู่ ไว้กันกดรัวซ้อนกัน
const busy = ref(new Set<string>())

function showError() {
  errorMessage.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'
  setTimeout(() => { errorMessage.value = '' }, 4000)
}

// โหลดรายการอาการใหม่ (ใช้ตอนโหลดครั้งแรกไม่สำเร็จ)
async function reloadSymptomTypes() {
  symptomTypes.value = await loadSymptomTypes()
}

// โหลดข้อมูลของวันที่กำลังดู
async function loadDay() {
  if (!profileId.value) return
  const [extra, ids] = await Promise.all([
    loadExtraValues(profileId.value, viewDate.value),
    loadSavedSymptomIds(profileId.value, viewDate.value)
  ])
  values.value = extra ?? emptyExtraValues()
  selectedSymptomIds.value = ids
  noteDraft.value = values.value.notes ?? ''
  await nextTick()
  growNote()
}

async function changeDay(dateStr: string) {
  showDayPicker.value = false
  if (dateStr === viewDate.value || isSwitching.value) return
  isSwitching.value = true
  await saveNote() // เก็บข้อความที่ค้างอยู่ของวันเดิมก่อนเปลี่ยนวัน
  viewDate.value = dateStr
  // ให้หน้ารอโหลดโชว์อย่างน้อย ~0.4 วิ จะได้เห็นว่ากำลังเปลี่ยนวัน (ไม่วูบหายเร็วเกินไป)
  await Promise.all([loadDay(), new Promise(resolve => setTimeout(resolve, 400))])
  isSwitching.value = false
}

// กดตัวเลือกของหมวดที่เลือกได้อันเดียว (ปริมาณเลือด / สีเลือด / สีตกขาว / อารมณ์)
// กดอันใหม่ = เปลี่ยนค่า / กดอันเดิม = เอาออก (บันทึกทันที ถ้าพลาดคืนค่าเดิม)
async function pickChoice(field: ExtraChoiceField, code: string) {
  if (!isToday.value || !profileId.value || busy.value.has(field)) return
  const before = values.value[field]
  const next = before === code ? null : code
  values.value[field] = next
  busy.value.add(field)
  const ok = await saveExtraField(profileId.value, viewDate.value, field, next)
  busy.value.delete(field)
  if (!ok) {
    values.value[field] = before
    showError()
  }
}

// กดอาการ (เลือกได้หลายอัน): เพิ่ม/ลบแถวใน symptom_logs ทันที
async function pickSymptom(id: number) {
  const key = `symptom-${id}`
  if (!isToday.value || !profileId.value || busy.value.has(key)) return
  const wasSelected = selectedSymptomIds.value.includes(id)
  selectedSymptomIds.value = wasSelected
    ? selectedSymptomIds.value.filter(x => x !== id)
    : [...selectedSymptomIds.value, id]
  busy.value.add(key)
  const ok = wasSelected
    ? await removeSymptomLog(profileId.value, viewDate.value, id)
    : await addSymptomLog(profileId.value, viewDate.value, id)
  busy.value.delete(key)
  if (!ok) {
    // บันทึกไม่ได้ -> คืนสถานะเดิม
    selectedSymptomIds.value = wasSelected
      ? [...selectedSymptomIds.value, id]
      : selectedSymptomIds.value.filter(x => x !== id)
    showError()
  }
}

// ปุ่ม − / + ของจำนวนยา (บันทึกทันที 0 ถึง MEDICATION_MAX)
async function changeMedication(step: number) {
  if (!isToday.value || !profileId.value || busy.value.has('medication_count')) return
  const before = values.value.medication_count
  const next = Math.min(MEDICATION_MAX, Math.max(0, before + step))
  if (next === before) return
  values.value.medication_count = next
  busy.value.add('medication_count')
  const ok = await saveExtraField(profileId.value, viewDate.value, 'medication_count', next)
  busy.value.delete('medication_count')
  if (!ok) {
    values.value.medication_count = before
    showError()
  }
}

// ----- ข้อความบันทึก: แตะกล่องแล้วพิมพ์ได้เลย บันทึกให้อัตโนมัติ (ไม่มีปุ่มบันทึก) -----
//   หยุดพิมพ์ 1 วินาที / แตะออกจากกล่อง / เปลี่ยนวัน / ออกจากหน้า = บันทึกให้ทันที
//   ลบข้อความจนว่างเปล่า = ลบบันทึกออกจากฐานข้อมูล
const noteDraft = ref('')
const noteFocused = ref(false)
const noteEl = ref<HTMLTextAreaElement | null>(null)
let noteTimer: ReturnType<typeof setTimeout> | null = null
let noteSaving = false

// ให้กล่องสูงขึ้นตามข้อความที่พิมพ์ (ต่ำสุด 106px)
function growNote() {
  const el = noteEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(106, el.scrollHeight)}px`
}

function onNoteInput() {
  growNote()
  if (noteTimer) clearTimeout(noteTimer)
  noteTimer = setTimeout(saveNote, 1000)
}

function onNoteBlur() {
  noteFocused.value = false
  saveNote()
}

async function saveNote() {
  if (noteTimer) {
    clearTimeout(noteTimer)
    noteTimer = null
  }
  if (!isToday.value || !profileId.value || noteSaving) return
  const date = viewDate.value
  const text = noteDraft.value.trim()
  const next = text === '' ? null : text
  if (next === values.value.notes) return // ไม่มีอะไรเปลี่ยน ไม่ต้องบันทึก
  noteSaving = true
  const ok = await saveExtraField(profileId.value, date, 'notes', next)
  noteSaving = false
  if (!ok) {
    showError() // ข้อความที่พิมพ์ยังอยู่ในกล่อง ไม่หาย
    return
  }
  if (date !== viewDate.value) return // ระหว่างรอ เปลี่ยนไปดูวันอื่นแล้ว
  values.value.notes = next
  // ระหว่างรอบันทึก ถ้ามีพิมพ์เพิ่ม ให้บันทึกรอบใหม่ต่อ
  if ((noteDraft.value.trim() || null) !== next) await saveNote()
}

// ออกจากหน้าแล้วยังมีข้อความค้าง ให้บันทึกให้ก่อน
onBeforeUnmount(() => {
  saveNote()
})

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
  symptomTypes.value = await loadSymptomTypes()
  await loadDay()
  isLoading.value = false
  await nextTick()
  growNote() // หน้าเพิ่งโชว์ ให้กล่องสูงพอดีกับข้อความที่โหลดมา
})
</script>

<style scoped>
/* โหมดดูย้อนหลัง: ทุกอย่างจางลงนิดหน่อย (ไม่จางมาก) ยกเว้นตัวเลือกที่ถูกเลือกไว้ที่ยังชัดเหมือนเดิม จะได้รู้ว่าวันนั้นเลือกอะไร */
.extra-chip,
.med-card,
.note-card {
  transition: opacity 0.25s ease;
}

.view-only h2 {
  opacity: 0.75;
}

.view-only .extra-chip {
  opacity: 0.5;
}

.view-only .extra-chip[aria-pressed='true'] {
  opacity: 1;
}

.view-only .med-card,
.view-only .note-card {
  opacity: 0.8;
}

/* เลย์เอาต์หลักของหน้านี้เขียนเป็น CSS ตรงๆ (ขนาดตามฟิกม่า) สีดูที่คลาส Tailwind ในแม่แบบ */
.extra-card {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 17px;
  border: 1px solid var(--color-pink-soft);
  border-radius: 20px;
  background: var(--color-card);
}

.extra-chip {
  height: 38px;
  padding: 0 16px;
  border-radius: 9999px;
  font-size: 14px;
  line-height: 18px;
}

/* ชิปสีเลือด: มีจุดสีนำหน้า สูง 42 */
.extra-chip-color {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 16px 0 13px;
  border-width: 1px;
  border-style: solid;
}

.color-dot {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
}

.med-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 74px;
  margin-top: 24px;
  padding: 0 17px;
  border: 1px solid var(--color-pink-soft);
  border-radius: 20px;
  background: var(--color-card);
}

.icon-minus {
  width: 14px;
  height: 3px;
}

.icon-plus {
  width: 14px;
  height: 14px;
}

.note-card {
  min-height: 140px;
  margin-top: 12px;
  padding: 17px;
  border: 1px solid var(--color-pink-soft);
  border-radius: 20px;
  background: var(--color-card);
}

/* วันนี้: ทั้งกล่องเป็นช่องพิมพ์ แตะตรงไหนก็เริ่มพิมพ์ (ขอบเข้มขึ้นตอนกำลังพิมพ์) */
.note-card-edit {
  display: flex;
  flex-direction: column;
  cursor: text;
  transition: border-color 0.2s ease;
}

.note-card-edit:focus-within {
  border-color: var(--color-period-day);
}

/* ตัวหนังสือ 16px เพราะ iPhone จะซูมหน้าจอเองถ้าช่องพิมพ์เล็กกว่า 16px */
.note-input {
  display: block;
  width: 100%;
  min-height: 106px;
  padding: 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 16px;
  line-height: 24px;
}

.note-input::placeholder {
  color: var(--color-hint);
}

.note-count {
  align-self: flex-end;
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-muted);
}

.note-text {
  font-size: 16px;
  line-height: 24px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.note-empty {
  color: var(--color-hint);
}

.retry-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border: 1px solid var(--color-coral);
  border-radius: 9999px;
  background: var(--color-pink);
  font-size: 12px;
  line-height: 18px;
}
</style>

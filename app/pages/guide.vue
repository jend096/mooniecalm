<script setup lang="ts">
// ===== หน้า "คู่มือบรรเทาปวด" (/guide) ตามฟิกม่า =====
// (1) เปิดหน้ามาจะมีแผ่นเด้งขึ้นจากด้านล่าง ทำต่อเนื่องในแผ่นเดียว: เลือก "ระดับปวด" ก่อน (2/5/8) -> แล้วเลือก "ตำแหน่งที่ปวด" (เลือกได้หลายจุด)
//     ขั้นระดับกด "ข้าม" ได้ (ไม่ใส่ระดับ) แต่ขั้นตำแหน่ง "ข้ามไม่ได้" ต้องเลือกอย่างน้อย 1 จุดถึงจะกดถัดไปได้
// (2) กด "ถัดไป" ที่ขั้นตำแหน่ง -> บันทึกแล้วแผ่นปิด หน้าหลักโชว์คู่มือของทุกจุดที่เลือก (ถ้ายังไม่ได้เลือกจุดไหน จะไม่โชว์คู่มืออะไรเลย)
// (3) รายการคู่มืออยู่ในหน้าหลัก ในการ์ดไม่มีวิธีทำ ต้องกด "เลือกอันนี้" -> บันทึก แล้วเด้งการ์ดวิธีทำให้อ่าน
//     กด "ถัดไป" หรือพื้นที่ว่างบนการ์ด -> ขึ้นติ๊กถูก "บันทึกแล้ว" แล้วไปหน้าเช็คอิน (อยากอ่านซ้ำกดอ่านที่หน้าเช็คอินได้)
//     อันที่เลือกแล้วจะล่นไปอยู่ล่างสุดของรายการ และปุ่มเปลี่ยนเป็น "อ่านเพิ่มเติม" (กดแล้วเปิดการ์ดอ่านซ้ำ ไม่บันทึกซ้ำ)
// ทุกครั้งที่เข้าหน้านี้เริ่มใหม่หมด ไม่ใส่ค่าเดิมที่เคยเลือกไว้ให้ และนับเป็น "การบันทึกความปวด 1 ครั้ง" ใหม่
// pain_logs เก็บ "1 จุดต่อ 1 แถว" (เลือก 3 จุด = 3 แถว ระดับและเวลาเดียวกัน) มี log_date ของวันที่กด ไว้ดูย้อนหลังและใส่ในสรุปรอบเดือน
// ส่วน daily_checkins.pain_level/pain_location คือ "สรุปของวัน" คำนวณจาก pain_logs ใหม่ทุกครั้งที่บันทึก (ระดับสูงสุดของวัน + ทุกจุดที่เคยเลือก)
// ระดับปวดที่บันทึกในวันที่ยังไม่ถึงช่วงประจำเดือน ถือเป็นสัญญาณช่วงก่อนประจำเดือน (PMS) นับจาก log_date ของวันแรกที่กดปวด ไว้ใช้ในหน้าสรุป
// วันที่ข้ามระดับปวด = ไม่มีค่าระดับปวดของวันนั้น หน้าสรุปจะไม่นับวันนั้น
// ตัวคิดว่าโชว์คู่มือไหน/เรียงยังไงอยู่ใน ~/utils/guide-picker.ts (ทดสอบแยกแล้ว)
import type { GuideItem } from '~/utils/guide-picker'
import {
  PAIN_LEVELS,
  PAIN_LOCATIONS,
  SEVERE_PAIN_LEVEL,
  filterGuidesByLocation,
  isQuickGuide,
  painLevelLabel,
  painLocationLabel,
  splitSteps
} from '~/utils/guide-picker'

type Step = 'sheet' | 'list' // sheet = แผ่นเลือกตำแหน่ง/ระดับกำลังเปิดอยู่ / list = ปิดแผ่นแล้ว โชว์รายการคู่มือ
type SheetStep = 'level' | 'location'

const isLoading = ref(true)
const loadError = ref(false)
const profileId = ref<number | null>(null)

const step = ref<Step>('sheet')
const sheetStep = ref<SheetStep>('level') // แผ่นเริ่มที่ขั้น "ระดับปวด" ก่อน แล้วค่อยไป "ตำแหน่งที่ปวด"
const painLevel = ref<number | null>(null) // ระดับปวดที่บันทึกในรอบนี้ (2/5/8) null = ข้าม/ยังไม่เลือก
const levelChoice = ref<number | null>(null) // ระดับที่กดเลือกอยู่ (ยังไม่บันทึกจนกว่าจะกด "ถัดไป") เริ่มต้นไม่เลือกอะไร
const selectedLocations = ref<string[]>([]) // จุดที่ติ๊กไว้ในแผ่น (ยังไม่บันทึกจนกว่าจะจบขั้นระดับ)
const locations = ref<string[]>([]) // จุดที่บันทึกแล้วในรอบนี้ ([] = ไม่ได้ระบุ ดูคู่มือทั้งหมด)
const saveError = ref('')
const isSaving = ref(false)

const allGuides = ref<GuideItem[]>([])
const goalCodes = ref<string[]>([]) // เป้าหมายที่ผู้ใช้กำลังทำอยู่
const chosenGuideIds = ref<number[]>([]) // คู่มือที่เลือกไว้แล้ววันนี้ (เลือกได้หลายอัน)
const reading = ref<GuideItem | null>(null) // คู่มือที่กำลังโชว์ในการ์ดอ่านวิธีทำ (null = ไม่โชว์)
const showSaved = ref(false) // true = กำลังโชว์ติ๊กถูก "บันทึกแล้ว" ก่อนไปหน้าเช็คอิน

// วันที่วันนี้แบบ YYYY-MM-DD ตามเวลาเครื่อง
function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const isSevere = computed(() => painLevel.value !== null && painLevel.value >= SEVERE_PAIN_LEVEL)

// รายการที่โชว์ในขั้นที่ 3 (เรียงแล้ว)
// ยังไม่ได้เลือกตำแหน่ง = ไม่โชว์คู่มืออะไรเลย
const guides = computed(() =>
  locations.value.length ? filterGuidesByLocation(allGuides.value, locations.value, painLevel.value, goalCodes.value) : []
)

// ปวดมาก: คู่มือที่ทำได้ทันที 2 อันแรกในรายการได้ป้าย "เริ่มจากอันนี้"
const startHereIds = computed(() => {
  if (!isSevere.value) return []
  return guides.value.filter(isQuickGuide).slice(0, 2).map(g => g.id)
})

// คู่มือที่ตรงกับเป้าหมายของผู้ใช้ -> ได้ป้าย "แนะนำสำหรับคุณ" (ไม่บอกชื่อเป้าหมาย ให้ป้ายสั้นเหมือนในฟิกม่า)
function isRecommended(guide: GuideItem): boolean {
  return !!guide.linked_goal_code && goalCodes.value.includes(guide.linked_goal_code)
}

// เรียงรายการที่โชว์: อันที่ยังไม่เลือกอยู่บน อันที่เลือกแล้ว "ล่นลงไปอยู่ล่างสุด" (ลำดับในกลุ่มเดิมยังเหมือนเดิม)
const orderedGuides = computed(() => [
  ...guides.value.filter(g => !chosenGuideIds.value.includes(g.id)),
  ...guides.value.filter(g => chosenGuideIds.value.includes(g.id))
])

// บันทึกความปวดของรอบนี้ลง pain_logs: 1 จุดต่อ 1 แถว (ระดับเดียวกัน เวลาเดียวกัน) แล้วสรุปค่าของวันลง daily_checkins ให้ตรงกัน สำเร็จคืน true
async function savePain(level: number | null): Promise<boolean> {
  if (profileId.value === null || selectedLocations.value.length === 0) return false
  isSaving.value = true
  saveError.value = ''
  const authed = await getAuthedSupabaseClient()

  const rows = selectedLocations.value.map(code => ({
    user_id: profileId.value,
    log_date: todayString(),
    pain_location: code,
    ...(level !== null ? { pain_level: level } : {})
  }))
  const { error } = await authed.from('pain_logs').insert(rows)
  if (error) {
    isSaving.value = false
    saveError.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
    return false
  }

  const ok = await syncDailySummary()
  isSaving.value = false
  if (!ok) saveError.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
  return ok
}

// สรุปของวัน: อ่าน pain_logs ทั้งวัน -> ระดับสูงสุด + จุดที่เคยเลือก (ไม่ซ้ำ เรียงตามเวลา) -> เขียนลง daily_checkins
// ถ้าวันนี้ไม่มีระดับเลย (ข้ามทุกครั้ง) จะไม่แตะ pain_level
async function syncDailySummary(): Promise<boolean> {
  if (profileId.value === null) return false
  const authed = await getAuthedSupabaseClient()
  const { data, error } = await authed
    .from('pain_logs')
    .select('pain_level, pain_location')
    .eq('user_id', profileId.value)
    .eq('log_date', todayString())
    .order('logged_at')
  if (error) return false

  const rows = data ?? []
  const levels = rows.map(r => r.pain_level as number | null).filter((v): v is number => v !== null)
  const places = [...new Set(rows.map(r => r.pain_location as string | null).filter((v): v is string => !!v))]

  const summary: { user_id: number, checkin_date: string, pain_level?: number, pain_location?: string[] } = {
    user_id: profileId.value,
    checkin_date: todayString(),
    pain_location: places
  }
  if (levels.length) summary.pain_level = Math.max(...levels)

  const { error: upsertError } = await authed.from('daily_checkins').upsert(summary, { onConflict: 'user_id,checkin_date' })
  return !upsertError
}

// ขั้นระดับ: "ถัดไป" (ต้องเลือกระดับก่อน) หรือ "ข้าม" (ไม่ใส่ระดับ) -> ไปขั้นเลือกตำแหน่งในแผ่นเดิม
function goToLocation(skip: boolean) {
  if (!skip && levelChoice.value === null) return
  if (skip) levelChoice.value = null
  saveError.value = ''
  sheetStep.value = 'location'
}

// ขั้นตำแหน่ง: ติ๊ก/เอาออก (เลือกได้กี่จุดก็ได้)
function toggleLocation(code: string) {
  selectedLocations.value = selectedLocations.value.includes(code)
    ? selectedLocations.value.filter(c => c !== code)
    : [...selectedLocations.value, code]
}

// ขั้นตำแหน่ง: "ถัดไป" (ต้องเลือกอย่างน้อย 1 จุด) -> บันทึกระดับ+ตำแหน่ง แล้วปิดแผ่น
async function finishSheet() {
  if (isSaving.value || selectedLocations.value.length === 0) return
  const level = levelChoice.value
  if (await savePain(level)) {
    painLevel.value = level
    locations.value = [...selectedLocations.value]
    step.value = 'list'
  }
}

// เปิดแผ่นใหม่เพื่อบันทึกความปวดอีกครั้ง (นับเป็นการบันทึกใหม่ ไม่แก้ของเดิม)
function reopenSheet() {
  selectedLocations.value = []
  levelChoice.value = null
  saveError.value = ''
  sheetStep.value = 'level'
  step.value = 'sheet'
}

// กด "เลือกอันนี้": เก็บ 1 แถวใน guide_logs (เลือกได้หลายอันต่อวัน) แล้วเด้งการ์ดวิธีทำ
// ถ้าเคยเลือกอันนี้แล้ว (ปุ่มเขียนว่า "เลือกแล้ว") กดอีกทีแค่เปิดการ์ดอ่านซ้ำ ไม่บันทึกซ้ำ
// "ทำแล้ว" และ "รู้สึกยังไง" จะมาอัปเดตแถวเดียวกันนี้ทีหลังที่หน้าเช็คอิน
async function chooseGuide(guide: GuideItem) {
  if (isSaving.value) return
  if (chosenGuideIds.value.includes(guide.id)) {
    reading.value = guide
    return
  }
  if (profileId.value === null) return
  isSaving.value = true
  saveError.value = ''
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('guide_logs').upsert({
    user_id: profileId.value,
    guide_id: guide.id,
    log_date: todayString()
  }, { onConflict: 'user_id,guide_id,log_date', ignoreDuplicates: true })
  isSaving.value = false
  if (error) {
    saveError.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
    return
  }
  chosenGuideIds.value = [...chosenGuideIds.value, guide.id]
  reading.value = guide
}

// ปิดการ์ดอ่านวิธีทำ (กดถัดไปหรือพื้นที่ว่าง) -> โชว์ติ๊กถูกให้รู้ว่าบันทึกแล้ว (SavedOverlay) แล้วค่อยไปหน้าเช็คอิน
function closeReading() {
  reading.value = null
  showSaved.value = true
}

function goBack() {
  navigateTo('/home')
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
    loadError.value = true
    isLoading.value = false
    return
  }
  profileId.value = profile.id

  const [guidesRes, userGoalsRes, goalTypesRes, chosenRes] = await Promise.all([
    authed.from('pain_relief_guides').select('id, guide_code, category, title, short_description, steps, linked_goal_code, body_area').order('id'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('guide_logs').select('guide_id').eq('user_id', profile.id).eq('log_date', todayString())
  ])
  if (guidesRes.error) {
    loadError.value = true
    isLoading.value = false
    return
  }
  allGuides.value = (guidesRes.data ?? []) as GuideItem[]

  const typeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  const activeTypes = (userGoalsRes.data ?? [])
    .map(g => typeById.get(g.goal_type_id))
    .filter((g): g is NonNullable<typeof g> => !!g)
  goalCodes.value = activeTypes.map(g => g.goal_code as string)

  // ระดับปวด/จุดที่ปวดไม่ดึงของเดิมมาใส่ (เริ่มใหม่ทุกครั้ง) ดึงแค่ว่าวันนี้เลือกคู่มืออันไหนไปแล้ว
  chosenGuideIds.value = (chosenRes.data ?? []).map(r => r.guide_id as number)

  isLoading.value = false
})
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-16 font-['Anuphan'] text-moon-ink">
    <!-- ปุ่มย้อนกลับ -->
    <button
      type="button"
      class="absolute left-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAEAEA] shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
      aria-label="ย้อนกลับ"
      @click="goBack"
    >
      <FaIcon name="chevron-left" class="h-[14px] w-2" />
    </button>

    <h1 class="text-center text-2xl font-semibold">คู่มือบรรเทาปวด</h1>

    <LoadingOverlay v-if="isLoading" />

    <div v-else-if="loadError" class="mt-20 text-center">
      <p class="text-sm text-moon-muted">
        โหลดข้อมูลไม่สำเร็จ
      </p>
      <button type="button" class="mt-4 rounded-full bg-moon-ink px-6 py-2 text-sm font-medium text-white" @click="navigateTo('/home')">
        กลับหน้าหลัก
      </button>
    </div>

    <template v-else>
      <!-- สรุปที่บันทึกไว้รอบนี้ (ตำแหน่ง + ระดับ) เป็นการ์ดมีกรอบ หน้าตาเหมือนการ์ด "อาหารที่แพ้" ในหน้า snack
           ไม่ใช้ปุ่มทรงแคปซูลแล้ว เพราะดูเหมือนปุ่มกดได้ ทั้งที่กดไม่ได้ / ปุ่มข้างขวาเปลี่ยนเป็น "บันทึกใหม่" หรือ "เลือกตำแหน่ง" ถ้ายังไม่ได้เลือก -->
      <div class="mt-[25px] rounded-2xl border border-moon-pink-soft bg-white py-[11px] pl-5 pr-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs leading-[18px] text-moon-muted">
              ตำแหน่งที่ปวด
            </p>
            <p class="mt-1 text-sm font-medium leading-[21px]">
              {{ locations.length ? locations.map(painLocationLabel).join(', ') : 'ยังไม่ได้เลือก' }}
            </p>
            <template v-if="locations.length && painLevel !== null">
              <p class="mt-2 text-xs leading-[18px] text-moon-muted">
                ระดับปวด
              </p>
              <p class="mt-1 text-sm font-medium leading-[21px]">
                {{ painLevelLabel(painLevel) }}
              </p>
            </template>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-full border border-moon-coral bg-moon-pink px-4 py-[6px] text-xs font-medium leading-[18px] text-moon-ink shadow-sm transition active:scale-95"
            @click="reopenSheet"
          >
            {{ locations.length ? 'บันทึกใหม่' : 'เลือกตำแหน่ง' }}
          </button>
        </div>
      </div>
      <p v-if="saveError && step === 'list'" class="mt-3 text-center text-xs text-moon-coral">
        {{ saveError }}
      </p>

      <hr class="mt-[33px] border-t border-moon-muted/30">

      <!-- รายการคู่มือ: ในการ์ดไม่มีวิธีทำ ต้องกด "เลือกอันนี้" -> บันทึก แล้วเด้งการ์ดวิธีทำให้อ่าน -->
      <p
        v-if="isSevere && locations.length"
        class="mt-[25px] rounded-2xl bg-moon-coral/10 p-4 text-xs leading-relaxed text-moon-coral"
      >
        วันนี้ปวดมาก เราเรียงวิธีที่ทำได้ทันทีไว้ด้านบน ถ้าปวดจนทนไม่ไหว หรือปวดผิดจากที่เคยเป็น ควรปรึกษาแพทย์
      </p>

      <div class="mt-[25px] flex flex-col gap-[10px]">
        <div
          v-for="guide in orderedGuides"
          :key="guide.id"
          class="relative flex items-center gap-4 rounded-2xl bg-white py-5 pl-8 pr-5 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
        >
          <!-- แถบสีด้านซ้ายของการ์ด -->
          <span class="absolute bottom-4 left-2 top-4 w-1 rounded-sm bg-[#FBFF67]" />
          <div class="flex min-w-0 flex-1 flex-col">
            <div v-if="startHereIds.includes(guide.id) || isRecommended(guide)" class="mb-1 flex flex-wrap gap-1">
              <span
                v-if="startHereIds.includes(guide.id)"
                class="rounded-full bg-moon-pink-soft px-2 py-[2px] text-xxs font-medium"
              >
                เริ่มจากอันนี้
              </span>
              <RecommendBadge v-if="isRecommended(guide)" />
            </div>
            <h3 class="text-base font-semibold leading-6">
              {{ guide.title }}
            </h3>
            <p v-if="guide.short_description" class="line-clamp-2 text-sm leading-[21px] text-moon-muted">
              {{ guide.short_description }}
            </p>
          </div>

          <button
            type="button"
            :disabled="isSaving"
            class="shrink-0 rounded-full px-5 py-2 text-sm font-medium leading-[21px] transition active:scale-95"
            :class="chosenGuideIds.includes(guide.id) ? 'border border-moon-ink bg-white text-moon-ink' : 'bg-moon-ink text-white'"
            @click="chooseGuide(guide)"
          >
            {{ chosenGuideIds.includes(guide.id) ? 'อ่านเพิ่มเติม' : 'เลือกอันนี้' }}
          </button>
        </div>

        <p v-if="locations.length && !guides.length" class="text-center text-sm text-moon-muted">
          ยังไม่มีคู่มือสำหรับจุดนี้
        </p>
      </div>

      <p class="mt-8 text-center text-xs leading-relaxed text-moon-muted">
        คำแนะนำทั่วไปเพื่อบรรเทาอาการเบื้องต้น ผลของแต่ละคนไม่เหมือนกัน
        ไม่ใช่การวินิจฉัยหรือแทนคำแนะนำของแพทย์
      </p>
    </template>

    <!-- แผ่นเลือกตำแหน่ง -> ระดับปวด: เด้งขึ้นจากด้านล่างตอนเข้าหน้านี้ ทำต่อเนื่องในแผ่นเดียว (แถบเมนูล่างอยู่เหนือแผ่นนี้ตามฟิกม่า) -->
    <Transition name="sheet">
      <div v-if="step === 'sheet' && !isLoading && !loadError" class="fixed inset-0 z-20 flex items-end bg-moon-ink/30">
        <div class="sheet-panel max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3">
          <div class="mx-auto h-1 w-10 rounded-sm bg-[#CBD5E1]" />

          <!-- ขั้นที่ 1: ระดับปวด -->
          <template v-if="sheetStep === 'level'">
            <h2 class="mt-7 text-xl font-semibold leading-7">ระดับปวด</h2>
            <p class="mt-[19px] text-sm text-moon-ink/50">
              ตอนนี้ปวดระดับไหน (ไม่อยากระบุกด "ข้าม" ได้)
            </p>

            <div class="mt-[19px] flex flex-col gap-3">
              <button
                v-for="level in PAIN_LEVELS"
                :key="level.value"
                type="button"
                class="flex items-center justify-between gap-3 rounded-2xl border bg-moon-card px-5 py-[11px] text-left transition active:scale-[0.98]"
                :class="levelChoice === level.value ? 'border-moon-period' : 'border-moon-pink-soft'"
                @click="levelChoice = level.value"
              >
                <span class="flex flex-col gap-1">
                  <span class="text-base font-semibold leading-6">{{ level.description }}</span>
                  <span class="text-xs leading-[18px] text-moon-muted">{{ level.title }}</span>
                </span>
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  :class="levelChoice === level.value ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
                >
                  <FaIcon v-if="levelChoice === level.value" name="check" class="h-3 w-3 text-white" />
                </span>
              </button>
            </div>

            <div class="mt-[32px] flex gap-3">
              <button
                type="button"
                class="flex h-[59px] flex-1 items-center justify-center rounded-3xl border-2 border-moon-pink bg-white text-lg font-semibold transition active:scale-95"
                @click="goToLocation(true)"
              >
                ข้าม
              </button>
              <button
                type="button"
                :disabled="levelChoice === null"
                class="flex h-[59px] flex-1 items-center justify-center rounded-3xl bg-moon-ink text-lg font-semibold text-white transition enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-moon-ink/30"
                @click="goToLocation(false)"
              >
                ถัดไป
              </button>
            </div>
          </template>

          <!-- ขั้นที่ 2: ตำแหน่งที่ปวด (เลือกได้หลายจุด ข้ามไม่ได้) -->
          <template v-else>
            <div class="mt-7 flex items-center gap-3">
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moon-pink-soft transition active:scale-95"
                aria-label="กลับไปเลือกระดับปวด"
                @click="sheetStep = 'level'"
              >
                <FaIcon name="chevron-left" class="h-3 w-[7px] text-moon-ink" />
              </button>
              <h2 class="text-xl font-semibold leading-7">ตำแหน่งที่ปวด</h2>
            </div>
            <p class="mt-[19px] text-sm text-moon-ink/50">
              เลือกได้หลายจุด
            </p>

            <div class="mt-[19px] flex flex-col gap-3">
              <button
                v-for="loc in PAIN_LOCATIONS"
                :key="loc.code"
                type="button"
                class="flex items-center justify-between gap-3 rounded-2xl border bg-moon-card px-5 py-4 text-left transition active:scale-[0.98]"
                :class="selectedLocations.includes(loc.code) ? 'border-moon-period' : 'border-moon-pink-soft'"
                @click="toggleLocation(loc.code)"
              >
                <span class="text-base font-medium">{{ loc.label }}</span>
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  :class="selectedLocations.includes(loc.code) ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
                >
                  <FaIcon v-if="selectedLocations.includes(loc.code)" name="check" class="h-3 w-3 text-white" />
                </span>
              </button>
            </div>

            <button
              type="button"
              :disabled="isSaving || selectedLocations.length === 0"
              class="mt-[32px] flex h-[59px] w-full items-center justify-center gap-2 rounded-3xl bg-moon-ink text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-moon-ink/30"
              :class="isSaving ? '!bg-moon-ink' : ''"
              @click="finishSheet"
            >
              <BrandLogoMark v-if="isSaving" :size="34" stage="bob" />
              {{ isSaving ? 'กำลังบันทึก...' : 'ถัดไป' }}
            </button>
          </template>

          <p v-if="saveError" class="mt-3 text-center text-xs text-moon-coral">
            {{ saveError }}
          </p>
        </div>
      </div>
    </Transition>

    <!-- การ์ดวิธีทำ: กด "ถัดไป" หรือพื้นที่ว่าง -> ไปหน้าเช็คอิน -->
    <GuideDetailDialog
      v-if="reading"
      :title="reading.title"
      :short-description="reading.short_description"
      :steps="splitSteps(reading.steps)"
      :recommended="isRecommended(reading)"
      button-label="ถัดไป"
      @close="closeReading"
    />

    <!-- กด "ถัดไป" แล้วขึ้นติ๊กถูก "บันทึกแล้ว" ครู่หนึ่ง ก่อนพาไปหน้าเช็คอิน -->
    <SavedOverlay v-if="showSaved" @done="navigateTo('/checkin')" />

    <BottomNav active="none" />
  </div>
</template>

<style scoped>
/* แผ่นเด้งขึ้นจากด้านล่าง + พื้นมืดค่อยๆ ขึ้น (ปิดก็เลื่อนลงกลับ) */
.sheet-enter-active,
.sheet-leave-active {
  transition: background-color 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  background-color: transparent;
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s ease-out;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel {
    transition: none;
  }
}
</style>

<script setup lang="ts">
// ===== หน้า "อยากทานอะไรตอนนี้ดี" (/snack) =====
// ลำดับการทำงาน: แตะเลือกหมวด (หรือ "สุ่มทั้งหมด") แล้วกด "ถัดไป" -> ระบบสุ่มเมนูที่ไม่มีของที่แพ้ -> กด "สุ่มใหม่" ได้ไม่จำกัด -> กด "บันทึก" ถึงจะนับว่าเลือกแล้ว
// วันหนึ่งบันทึกได้หลายเมนู (เมนูที่บันทึกไปแล้ววันนี้จะไม่ถูกสุ่มซ้ำ พอข้ามวันก็กลับมาให้สุ่มได้ใหม่)
// ตัวคิดว่าจะโชว์เมนูไหนอยู่ใน ~/utils/snack-picker.ts (ทดสอบแยกแล้ว) หน้านี้ดูแลแค่ดึงข้อมูล + หน้าจอ
import type { SnackChoice, SnackItem } from '~/utils/snack-picker'
import {
  ALLERGY_OPTIONS,
  NO_ALLERGY_LABEL,
  OTHER_ALLERGY_MAX_COUNT,
  OTHER_ALLERGY_MAX_LENGTH,
  OTHER_ALLERGY_MIN_LENGTH,
  SNACK_CATEGORY_LABEL,
  SNACK_LABEL_NOTE,
  SNACK_SAFETY_NOTE,
  allergyDisplayLabel,
  cleanOtherAllergyWord,
  isOtherAllergyLabel,
  otherAllergyWords,
  pickSnack,
  poolForChoice,
  snackImageCandidates,
  toOtherAllergyLabel
} from '~/utils/snack-picker'

// ปุ่มเลือกหมวด 4 หมวด + "ไม่รู้" (any)
// ข้อความบนปุ่มบอกแค่ลักษณะของว่าง ไม่อ้างสรรพคุณ (ยังไม่มีงานวิจัยรองรับว่าลดปวด/ลดบวม)
// blob = สีลายหัวกระต่ายหลังการ์ด (ใช้ opacity ที่ตัวรูปทั้งก้อน หูกับหัวเลยไม่ซ้อนกันเป็นเส้น) / ring = สีวงแหวนหน้าชื่อหมวด (ตามฟิกม่า) เรียงตามช่องในตาราง 2 คอลัมน์
const CHOICES: { value: SnackChoice, title: string, hint: string, blob: string, ring: string }[] = [
  { value: 'warming', title: 'อุ่นๆ', hint: 'ทานแล้วอุ่นสบายท้อง', blob: 'text-moon-coral opacity-50', ring: 'border-moon-coral' },
  { value: 'savory', title: 'เค็มๆ มันๆ', hint: 'ทานเพลิน อิ่มง่าย', blob: 'text-moon-cream', ring: 'border-[#FCFF8F]' },
  { value: 'refreshing', title: 'สดชื่น', hint: 'เบาๆ ชื่นใจ', blob: 'text-moon-period-predicted opacity-50', ring: 'border-moon-period-predicted' },
  { value: 'sweet', title: 'อิ่มท้อง', hint: 'ให้พลังงาน', blob: 'text-moon-lavender opacity-50', ring: 'border-moon-lavender' }
]

const isLoading = ref(true)
const loadError = ref(false)
const profileId = ref<number | null>(null)

const allSnacks = ref<SnackItem[]>([]) // เมนูทั้งหมดในฐานข้อมูล
const allergies = ref<string[]>([]) // สิ่งที่แพ้ (ข้อความไทย เหมือนใน user_profiles.allergies)
const goalCodes = ref<string[]>([]) // เป้าหมายที่กำลังทำอยู่ (ใช้ถ่วงน้ำหนักการสุ่ม)
const todayIds = ref<number[]>([]) // เมนูที่บันทึกไปแล้ว "วันนี้" (ไม่สุ่มซ้ำในวันเดียวกัน)

const choice = ref<SnackChoice | null>(null) // หมวดที่เลือกอยู่ (null = ยังไม่เลือก)
const picked = ref<SnackChoice | null>(null) // หมวดที่แตะเลือกไว้ (ยังไม่ไปต่อจนกว่าจะกด "ถัดไป")
const nextBtnEl = ref<HTMLElement | null>(null)
const nextBounceKey = ref(0) // เพิ่มค่าทุกครั้งที่แตะเลือกหมวด เพื่อให้ปุ่มถัดไปเด้งใหม่ทุกครั้ง

// แตะเลือกหมวด: ไฮไลต์หมวดนั้น แล้วให้ปุ่ม "ถัดไป" ด้านล่าง "เด้ง" เพื่อบอกว่ามีปุ่มให้กดต่อ
// (เพื่อนหลายคนไม่เห็นว่ามีปุ่มถัดไปอยู่ด้านล่าง) ถ้าปุ่มอยู่นอกจอก็เลื่อนหน้าลงมาให้เห็น
async function pickChoice(value: SnackChoice) {
  picked.value = value
  nextBounceKey.value++
  await nextTick()
  // เลื่อนหน้าลงไปสุดท้ายหน้า ให้ปุ่ม "ถัดไป" ลอยขึ้นมาเหนือแถบเมนูล่างให้เห็นชัด
  // (ใต้ปุ่มมีที่ว่าง 7rem เผื่อแถบเมนูไว้แล้ว) — อยากเลื่อนน้อยลง เปลี่ยน top เป็นค่าอื่น หรือใช้ scrollIntoView({ block: 'center' })
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
}
const current = ref<SnackItem | null>(null) // เมนูที่กำลังโชว์
const noResult = ref(false) // เลือกหมวดแล้วแต่ไม่มีเมนูที่ปลอดภัยเลย
// ขั้นตอนตอนกดบันทึก: idle = ปกติ / saving = กำลังบันทึก (ดาวหมุน) / saved = บันทึกแล้ว (ติ๊กถูก + ป๊อปอัพถามว่าจะสุ่มอีกหรือถัดไป)
const savePhase = ref<'idle' | 'saving' | 'saved'>('idle')
const savedName = ref('') // ชื่อเมนูที่เพิ่งบันทึก (ไว้โชว์ในป๊อปอัพ)
const checkRef = ref<HTMLElement | null>(null) // วงกลมติ๊กถูก (ไว้ปล่อยดาวแวบ)
const saveError = ref('')
const isSavingAllergy = ref(false)
const allergyError = ref('')
const imageFailed = ref(false)
const showAllergyEditor = ref(false)
const otherInput = ref('') // ช่องพิมพ์ "แพ้อย่างอื่น"
const otherOpen = ref(false) // กล่อง "อื่นๆ" เปิดอยู่ไหม

// วันที่วันนี้แบบ YYYY-MM-DD ตามเวลาเครื่อง
function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ข้อความสรุปที่แพ้ ไว้โชว์บนหัวหน้า
const allergySummary = computed(() => {
  const real = allergies.value.filter(a => a !== NO_ALLERGY_LABEL)
  return real.length ? real.map(allergyDisplayLabel).join(', ') : 'ไม่มี'
})

// ตอนเปิดแผ่น: ถ้าเคยพิมพ์คำอื่นๆ ไว้แล้ว ให้กล่องพิมพ์เปิดค้างไว้
watch(showAllergyEditor, (open) => {
  if (open) otherOpen.value = otherAllergyLabels.value.length > 0
})

// คำที่ผู้ใช้พิมพ์เองว่าแพ้ (เก็บในรายการเดียวกับกลุ่มที่กดเลือก แต่ขึ้นต้นด้วย "อื่นๆ: ")
const otherAllergyLabels = computed(() => allergies.value.filter(isOtherAllergyLabel))

const categoryLabel = computed(() => (current.value ? SNACK_CATEGORY_LABEL[current.value.category] : ''))

// ชื่อหมวดที่ผู้ใช้เลือกไว้ (โชว์บนหน้าผลลัพธ์ กันลืมว่าเลือกหมวดอะไรมา)
const choiceTitle = computed(() => {
  if (choice.value === 'any') return 'สุ่มทั้งหมด'
  return CHOICES.find(c => c.value === choice.value)?.title ?? ''
})
const choiceRing = computed(() => CHOICES.find(c => c.value === choice.value)?.ring ?? 'border-moon-pink')
// รูป: ลองดึงจาก Supabase Storage ก่อน ถ้าโหลดไม่ได้ค่อยลองโฟลเดอร์สำรอง (ไล่นามสกุล png / jpg / jpeg / webp) หมดแล้วค่อยโชว์กล่องสี
const imageTry = ref(0)
// ที่เก็บรูปบน Supabase Storage (ที่เก็บชื่อ snacks ตั้งเป็นสาธารณะ ใครเปิดลิงก์ดูรูปได้)
const supabaseUrl = useRuntimeConfig().public.supabase?.url ?? ''
const storageBase = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/snacks` : ''
const imageCandidates = computed(() => snackImageCandidates(current.value?.image_url, storageBase))
const imageSrc = computed(() => imageCandidates.value[imageTry.value] ?? '')
watch(current, () => { imageTry.value = 0 })
function onImageError() {
  if (imageTry.value + 1 < imageCandidates.value.length) imageTry.value++
  else imageFailed.value = true
}

// ป้าย "แนะนำสำหรับคุณ" โชว์เฉพาะเมื่อเมนูนี้ผูกกับเป้าหมายที่ผู้ใช้กำลังทำอยู่จริง
const isRecommended = computed(() => {
  const code = current.value?.linked_goal_code
  return !!code && goalCodes.value.includes(code)
})

// สุ่มเมนูใหม่จากหมวดที่เลือก (excludeCurrent = true เมื่อกด "สุ่มใหม่" จะได้ไม่ซ้ำอันเดิม)
function roll(excludeCurrent: boolean) {
  if (!choice.value) return
  const pool = poolForChoice(allSnacks.value, allergies.value, choice.value)
  const picked = pickSnack(pool, todayIds.value, goalCodes.value, excludeCurrent ? (current.value?.id ?? null) : null, Math.random, seenIds.value)
  current.value = picked
  noResult.value = picked === null
  imageFailed.value = false
}

// ---------- สุ่มแบบมีแอนิเมชัน ----------
// ผลสุ่มจริงตัดสินไว้ก่อนเลย แล้วเล่นภาพ "ไพ่สีประจำหมวด 4 ใบสลับกันไปมา" ประมาณ 1.8 วินาที ก่อนเด้งเมนูจริงขึ้นมา
// การเลือกเมนู: เมนูที่ตรงเป้าหมายของผู้ใช้ในหมวดนั้นจะมาก่อน (ดู pickSnack) และจำไว้ว่าอันไหนโผล่แล้ว (seenIds) จะได้ไม่วนซ้ำจนกว่าจะเห็นอันอื่นครบ
const ROLL_MS = 1800
const isRolling = ref(false)
const seenIds = ref<number[]>([]) // เมนูที่โผล่ให้ดูแล้วในหมวดนี้ (เริ่มใหม่ทุกครั้งที่เลือกหมวด)
const resultKey = ref(0) // เปลี่ยนค่าทุกครั้งที่ได้เมนูใหม่ -> การ์ดเล่นแอนิเมชันเด้งขึ้นใหม่
const resultRef = ref<HTMLElement | null>(null)
let rollTimer: ReturnType<typeof setTimeout> | undefined

// ไพ่ 4 ใบ สีพาสเทลตามสีกระต่ายหน้าเลือกหมวด (อุ่นๆ / เค็มๆ มันๆ / สดชื่น / อิ่มท้อง)
// base = สีพื้นไล่เฉด (ใช้สีทึบ ไม่ใช้สีโปร่งใส เพื่อให้เนื้อสีเนียน) / tint = สีของใบถัดไป ใช้ค่อยๆ จางทับเพื่อให้สีไหลเปลี่ยนไปมา
const PASTEL = ['#FFC4C4', '#FDFFC2', '#FFD1F1', '#DDD2FF']
const PASTEL_LIGHT = ['#FFE6E6', '#FFFFEC', '#FFEBF8', '#F1ECFF']
const SHUFFLE_CARDS = PASTEL.map((main, i) => ({
  slot: i,
  base: `linear-gradient(160deg, ${main} 0%, ${PASTEL_LIGHT[i]} 100%)`,
  tint: `linear-gradient(160deg, ${PASTEL[(i + 1) % 4]} 0%, ${PASTEL_LIGHT[(i + 1) % 4]} 100%)`
}))

// วางเมนูที่สุ่มได้ลงหน้าจอ + ปล่อยดาวแวบ
function land(item: SnackItem | null) {
  current.value = item
  noResult.value = item === null
  imageFailed.value = false
  resultKey.value++
  if (item) {
    if (!seenIds.value.includes(item.id)) seenIds.value = [...seenIds.value, item.id]
    nextTick(() => sparkleBurst(resultRef.value, 12))
  }
}

function rollWithAnimation(excludeCurrent: boolean) {
  if (!choice.value || isRolling.value) return
  const pool = poolForChoice(allSnacks.value, allergies.value, choice.value)
  // เห็นเมนูที่ยังไม่ได้บันทึกครบหมดแล้ว -> เริ่มนับรอบใหม่ (เมนูตรงเป้าหมายจะกลับมาก่อนอีกครั้ง)
  const unseen = pool.filter(item => !todayIds.value.includes(item.id) && !seenIds.value.includes(item.id))
  if (unseen.length === 0) seenIds.value = []
  const finalPick = pickSnack(pool, todayIds.value, goalCodes.value, excludeCurrent ? (current.value?.id ?? null) : null, Math.random, seenIds.value)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // ไม่มีเมนู / มีตัวเลือกเดียว / ผู้ใช้ลดแอนิเมชัน -> ลงผลเลย
  if (!finalPick || pool.length < 2 || reduceMotion) {
    land(finalPick)
    return
  }
  isRolling.value = true
  rollTimer = setTimeout(() => {
    isRolling.value = false
    land(finalPick)
  }, ROLL_MS)
}

function selectChoice(value: SnackChoice) {
  choice.value = value
  seenIds.value = []
  rollWithAnimation(false)
}

function backToChoose() {
  clearTimeout(rollTimer)
  isRolling.value = false
  choice.value = null
  picked.value = null
  current.value = null
  noResult.value = false
}

onUnmounted(() => clearTimeout(rollTimer))

// บันทึกเมนูที่เลือก (นับเฉพาะตอนกดบันทึก) เก็บเป็น 1 แถวใน snack_logs
// "กินแล้ว" และ "รู้สึกยังไง" จะมาอัปเดตแถวเดียวกันนี้ทีหลังที่หน้าเช็คอิน
// ระหว่างบันทึกโชว์ดาวหมุน (อย่างน้อย ~1 วินาทีให้เห็นแอนิเมชัน) พอสำเร็จเปลี่ยนเป็นติ๊กถูก แล้วถามว่าจะสุ่มอีกหรือถัดไป
async function saveSnack() {
  if (!current.value || profileId.value === null || savePhase.value !== 'idle') return
  const snack = current.value
  savePhase.value = 'saving'
  saveError.value = ''
  const authed = await getAuthedSupabaseClient()
  const [{ error }] = await Promise.all([
    authed.from('snack_logs').upsert({
      user_id: profileId.value,
      snack_id: snack.id,
      log_date: todayString()
    }, { onConflict: 'user_id,snack_id,log_date', ignoreDuplicates: true }),
    new Promise(resolve => setTimeout(resolve, 1100))
  ])
  if (error) {
    saveError.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
    savePhase.value = 'idle'
    return
  }
  if (!todayIds.value.includes(snack.id)) todayIds.value = [...todayIds.value, snack.id]
  savedName.value = snack.name
  savePhase.value = 'saved'
  await nextTick()
  sparkleBurst(checkRef.value, 12)
}

// ป๊อปอัพหลังบันทึก: "สุ่มอีก" = ปิดป๊อปอัพแล้วสุ่มเมนูใหม่ในหมวดเดิม / "ถัดไป" = ไปหน้าเช็คอิน
function rollAgain() {
  savePhase.value = 'idle'
  rollWithAnimation(false)
}

// บันทึกรายการที่แพ้ลงโปรไฟล์ (ใช้ร่วมกันทุกปุ่มในแผ่นแก้ไข) ไม่สำเร็จจะย้อนกลับเป็นค่าเดิม
async function saveAllergies(next: string[]) {
  if (profileId.value === null || isSavingAllergy.value) return
  const before = allergies.value
  isSavingAllergy.value = true
  allergyError.value = ''
  allergies.value = next
  const authed = await getAuthedSupabaseClient()
  const { error } = await authed.from('user_profiles').update({ allergies: next }).eq('id', profileId.value)
  if (error) {
    allergies.value = before // บันทึกไม่สำเร็จ ย้อนกลับ
    allergyError.value = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
  } else if (choice.value && !isRolling.value) {
    // ถ้ากำลังโชว์เมนูอยู่แล้วที่แพ้เปลี่ยน ให้สุ่มใหม่ทันที เผื่อเมนูที่โชว์มีของที่เพิ่งติ๊กว่าแพ้
    roll(false)
  }
  isSavingAllergy.value = false
}

// กดเลือก/เอาออกของที่แพ้ แล้วบันทึกลงโปรไฟล์ทันที
async function toggleAllergy(label: string) {
  if (profileId.value === null || isSavingAllergy.value) return
  let next: string[]
  if (label === NO_ALLERGY_LABEL) {
    next = [NO_ALLERGY_LABEL] // "ไม่มีอาการแพ้" เลือกได้อันเดียว ล้างอันอื่น
    otherOpen.value = false
    otherInput.value = ''
  } else {
    const without = allergies.value.filter(a => a !== NO_ALLERGY_LABEL)
    next = without.includes(label) ? without.filter(a => a !== label) : [...without, label]
    if (next.length === 0) next = [NO_ALLERGY_LABEL] // เอาออกจนหมด = ไม่มีที่แพ้
  }
  await saveAllergies(next)
}

// กล่อง "อื่นๆ": กดเปิดให้ขึ้นช่องพิมพ์ / กดซ้ำ = ปิดและเอาคำที่เคยพิมพ์ออก (เหมือนหน้า onboarding)
async function toggleOtherBox() {
  if (isSavingAllergy.value) return
  if (otherOpen.value) {
    otherOpen.value = false
    otherInput.value = ''
    allergyError.value = ''
    const next = allergies.value.filter(a => !isOtherAllergyLabel(a))
    if (next.length !== allergies.value.length) await saveAllergies(next.length ? next : [NO_ALLERGY_LABEL])
  } else {
    otherOpen.value = true
    if (allergies.value.includes(NO_ALLERGY_LABEL)) await saveAllergies([]) // เลือกพร้อม "ไม่มีอาการแพ้" ไม่ได้
  }
}

// เพิ่มอาหารอื่นๆ ที่แพ้ (พิมพ์เอง) ใช้ toggleAllergy ตัวเดิมบันทึก จึงล้าง "ไม่มีอาการแพ้" ให้เองและสุ่มเมนูใหม่ทันที
async function addOtherAllergy() {
  allergyError.value = ''
  const word = cleanOtherAllergyWord(otherInput.value)
  if (word.length < OTHER_ALLERGY_MIN_LENGTH) {
    allergyError.value = `พิมพ์อย่างน้อย ${OTHER_ALLERGY_MIN_LENGTH} ตัวอักษร`
    return
  }
  const label = toOtherAllergyLabel(word)
  if (allergies.value.includes(label)) {
    otherInput.value = '' // มีคำนี้อยู่แล้ว ไม่ต้องเพิ่มซ้ำ
    return
  }
  if (otherAllergyWords(allergies.value).length >= OTHER_ALLERGY_MAX_COUNT) {
    allergyError.value = `เพิ่มได้สูงสุด ${OTHER_ALLERGY_MAX_COUNT} คำ`
    return
  }
  await toggleAllergy(label)
  if (!allergyError.value) otherInput.value = ''
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
    .select('id, allergies')
    .eq('auth_user_id', sessionData.session.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    loadError.value = true
    isLoading.value = false
    return
  }
  profileId.value = profile.id
  allergies.value = (profile.allergies as string[] | null) ?? []

  const [snacksRes, userGoalsRes, goalTypesRes, todayLogsRes] = await Promise.all([
    authed
      .from('snack_items')
      .select('id, snack_code, name, category, image_url, description, pairing_tip, linked_goal_code, allergens, ingredients'),
    authed.from('user_goals').select('goal_type_id').eq('user_id', profile.id).eq('is_active', true),
    authed.from('goal_types').select('id, goal_code, title'),
    authed.from('snack_logs').select('snack_id').eq('user_id', profile.id).eq('log_date', todayString())
  ])

  if (snacksRes.error) {
    loadError.value = true
    isLoading.value = false
    return
  }
  allSnacks.value = (snacksRes.data ?? []) as SnackItem[]

  const typeById = new Map((goalTypesRes.data ?? []).map(g => [g.id, g]))
  const activeTypes = (userGoalsRes.data ?? [])
    .map(g => typeById.get(g.goal_type_id))
    .filter((g): g is NonNullable<typeof g> => !!g)
  goalCodes.value = activeTypes.map(g => g.goal_code as string)

  todayIds.value = (todayLogsRes.data ?? []).map(r => r.snack_id as number)

  isLoading.value = false
})
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[54px] font-['Anuphan'] text-moon-ink">
    <!-- ปุ่มย้อนกลับ: อยู่หน้าเมนู = กลับไปเลือกหมวดใหม่ / อยู่หน้าเลือกหมวด = กลับหน้าหลัก -->
    <button
      type="button"
      class="absolute left-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAEAEA] shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
      :aria-label="choice ? 'เลือกหมวดใหม่' : 'ย้อนกลับ'"
      @click="choice ? backToChoose() : navigateTo('/home')"
    >
      <FaIcon name="chevron-left" class="h-[14px] w-2" />
    </button>

    <h1 class="text-center text-2xl font-semibold">อยากทานอะไรตอนนี้ดี</h1>

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
      <!-- สรุปที่แพ้ + ปุ่มแก้ (กดแล้วแผ่นแก้ไขเด้งขึ้นจากด้านล่าง) -->
      <div class="mt-[41px] rounded-2xl border border-moon-pink-soft bg-white py-[11px] pl-5 pr-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs leading-[18px] text-moon-muted">
              อาหารที่แพ้
            </p>
            <p class="mt-1 text-sm font-medium leading-[21px]">
              {{ allergySummary }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-full border border-moon-coral bg-moon-pink px-4 py-[6px] text-xs font-medium leading-[18px] text-moon-ink shadow-sm transition active:scale-95"
            @click="showAllergyEditor = true"
          >
            แก้ไข
          </button>
        </div>
      </div>

      <!-- ขั้นที่ 1: เลือกหมวด (แตะเลือก ปุ่มถัดไปด้านล่างเด้งบอก แล้วกด "ถัดไป") -->
      <div v-if="!choice" class="flex flex-1 flex-col">
        <p class="mt-[35px] pl-[9px] text-sm text-moon-muted">
          วันนี้อยากได้แบบไหน
        </p>
        <div class="mt-[25px] grid grid-cols-2 gap-3">
          <button
            v-for="c in CHOICES"
            :key="c.value"
            type="button"
            class="relative h-[176px] overflow-hidden rounded-[24px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition active:scale-[0.98]"
            :class="picked === c.value ? 'ring-2 ring-moon-period' : ''"
            @click="pickChoice(c.value)"
          >
            <!-- ลายหัวกระต่ายเงาสีประจำหมวด -->
            <RabbitBlob class="pointer-events-none absolute left-[34px] top-[53px] h-[190px] w-[190px]" :class="c.blob" />
            <span class="relative flex items-center gap-2">
              <span class="h-5 w-5 shrink-0 rounded-full border-[5px] bg-white" :class="c.ring" />
              <span class="text-lg font-semibold leading-[26px]">{{ c.title }}</span>
            </span>
            <p class="relative mt-1 text-xs leading-[18px] text-moon-muted">{{ c.hint }}</p>
          </button>
        </div>

        <div class="mt-[13px] flex justify-end">
          <button
            type="button"
            class="rounded-[24px] border bg-moon-cream-soft px-[26px] py-[10px] text-sm font-medium leading-[21px] transition active:scale-95"
            :class="picked === 'any' ? 'border-moon-period ring-2 ring-moon-period' : 'border-[#FFED88]'"
            @click="pickChoice('any')"
          >
            สุ่มทั้งหมด
          </button>
        </div>

        <!-- ปุ่มถัดไป: ห่างจากด้านบนและแถบเมนูล่างตามฟิกม่า ยังไม่เลือกหมวดกดไม่ได้ พอเลือกแล้วเด้งหนึ่งที (key เปลี่ยนทุกครั้งที่แตะ ให้เล่นใหม่) -->
        <div :key="nextBounceKey" ref="nextBtnEl" class="mt-auto px-[14px] pt-[64px]" :class="picked ? 'next-bounce' : ''">
          <BaseButton :disabled="picked === null" @click="picked && selectChoice(picked)" />
        </div>
      </div>

      <!-- ขั้นที่ 2: ผลลัพธ์ -->
      <div v-else class="mt-[40px]">
        <!-- บอกว่าเมนูนี้มาจากหมวดไหน (กันผู้ใช้ลืมว่าเลือกอะไรมา) -->
        <p class="mb-4 flex items-center justify-center gap-2 text-sm text-moon-muted">
          <span class="h-4 w-4 shrink-0 rounded-full border-[4px] bg-white" :class="choiceRing" />
          เมนูนี้เลือกมาจากหมวด
          <span class="font-semibold text-moon-ink">{{ choiceTitle }}</span>
        </p>

        <!-- กำลังสุ่ม: ไพ่ 4 ใบสีประจำหมวด (ลายหัวกระต่าย) สลับตำแหน่งไปมาเหมือนสับไพ่ -->
        <div v-if="isRolling" class="shuffle-stage relative mx-auto h-[300px] w-full max-w-[320px]" role="status" aria-live="polite">
          <div
            v-for="card in SHUFFLE_CARDS"
            :key="card.slot"
            class="shuffle-card absolute left-1/2 top-[18px] h-[230px] w-[170px] overflow-hidden rounded-[24px] bg-white shadow-[0_6px_18px_rgba(41,41,41,0.16)]"
            :style="{ '--i': card.slot }"
          >
            <!-- สีพื้นไล่เฉดอ่อนๆ + ชั้นสีของใบถัดไปค่อยๆ จางเข้า-ออก ให้สีเปลี่ยนไหลต่อกันไม่กระตุก -->
            <span class="absolute inset-0" :style="{ background: card.base }" />
            <span class="shuffle-tint absolute inset-0" :style="{ background: card.tint }" />
            <RabbitBlob class="absolute left-1/2 top-[34px] h-[150px] w-[150px] -translate-x-1/2 text-white/70" />
            <svg viewBox="0 0 24 24" class="shuffle-sparkle absolute bottom-4 right-4 h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
              <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
            </svg>
          </div>
          <p class="absolute inset-x-0 bottom-0 text-center text-sm text-moon-muted">กำลังสุ่มให้...</p>
        </div>

        <div v-else-if="noResult" class="rounded-[24px] bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
          <p class="text-sm font-medium">
            หมวดนี้ไม่มีเมนูที่ปลอดภัยกับที่แพ้
          </p>
          <p class="mt-1 text-xs text-moon-muted">
            ลองเลือกหมวดอื่น หรือแก้รายการที่แพ้ด้านบน
          </p>
        </div>

        <div
          v-else-if="current"
          :key="resultKey"
          ref="resultRef"
          class="result-pop overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
        >
          <!-- รูปดึงจาก Supabase Storage (ที่เก็บ snacks) มีโฟลเดอร์สำรอง public/assets/snacks/ ถ้าโหลดไม่ได้จะโชว์กล่องสีแทน -->
          <img
            v-if="imageSrc && !imageFailed"
            :src="imageSrc"
            :alt="current.name"
            class="h-44 w-full object-cover"
            @error="onImageError"
          >
          <div v-else class="flex h-44 w-full items-center justify-center bg-[#D9D9D9]/40 text-xs text-moon-muted">
            ยังไม่มีรูป
          </div>

          <div class="p-5">
            <p class="text-xs font-medium leading-[18px] text-moon-muted">
              {{ categoryLabel }}
            </p>
            <h2 class="text-[22px] font-semibold leading-[33px]">
              {{ current.name }}
            </h2>
            <p v-if="isRecommended" class="mt-1">
              <RecommendBadge large />
            </p>
            <p v-if="current.description" class="mt-2 text-sm leading-[21px] text-moon-ink/70">
              {{ current.description }}
            </p>
            <p v-if="current.pairing_tip" class="mt-3 flex items-start gap-1 rounded-2xl bg-moon-lavender p-3 text-xs leading-[18px] text-white">
              <FaIcon name="wand-magic-sparkles" class="mt-[3px] h-[13px] w-[14px] shrink-0 text-moon-coral" />
              <span>กินคู่กับ: {{ current.pairing_tip }}</span>
            </p>
            <!-- วัตถุดิบหลักของเมนู ให้ผู้ใช้ตรวจเองได้ว่ามีของที่แพ้ไหม -->
            <p v-if="current.ingredients?.length" class="mt-3 text-xs text-moon-muted">
              วัตถุดิบหลัก: {{ current.ingredients.join(', ') }}
            </p>
            <!-- คำเตือน: เป็นของว่างกินเล่น ไม่ใช่ยา ไม่ใช่อาหารหลัก + ให้อ่านฉลากสินค้าสำเร็จรูป (ข้อความอยู่ใน snack-picker.ts) -->
            <p class="mt-6 text-xs leading-relaxed text-moon-coral/60">
              {{ SNACK_SAFETY_NOTE }}
            </p>
            <p class="mt-2 text-xs leading-relaxed text-moon-coral/60">
              {{ SNACK_LABEL_NOTE }}
            </p>

            <div class="mt-5 flex gap-3">
              <button
                type="button"
                class="flex-1 rounded-full border border-moon-coral bg-white py-3 text-base font-medium transition active:scale-95"
                @click="rollWithAnimation(true)"
              >
                สุ่มใหม่
              </button>
              <button
                type="button"
                class="flex-1 rounded-full bg-moon-ink py-3 text-base font-medium text-white transition active:scale-95"
                @click="saveSnack"
              >
                บันทึก
              </button>
            </div>
            <p v-if="saveError" class="mt-2 text-center text-xs text-moon-coral">
              {{ saveError }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- พื้นมืดหลังแผ่นแก้ไขที่แพ้ -->
    <div v-if="showAllergyEditor" class="fixed inset-0 z-30 bg-moon-ink/30" @click="showAllergyEditor = false" />

    <!-- แผ่นแก้ไขอาหารที่แพ้: เด้งขึ้นจากด้านล่าง หน้าตาเหมือนหน้า "คุณแพ้อะไรบ้าง?" ตอน onboarding (อันที่เคยติ๊กไว้จะติ๊กค้างให้) -->
    <div
      class="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[92vh] max-w-[430px] flex-col rounded-t-3xl bg-moon-card shadow-xl transition-transform duration-300 ease-out"
      :class="showAllergyEditor ? 'translate-y-0' : 'pointer-events-none translate-y-full'"
    >
      <div class="px-9 pt-5">
        <div class="mx-auto h-1 w-10 rounded-sm bg-[#CBD5E1]" />
      </div>

      <div class="flex items-start justify-between gap-3 px-9 pt-4">
        <h2 class="text-2xl font-semibold text-moon-ink">
          คุณแพ้อะไรบ้าง?
        </h2>
        <button
          type="button"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-moon-pink-soft"
          aria-label="ปิด"
          @click="showAllergyEditor = false"
        >
          <FaIcon name="xmark" class="h-4 w-4 text-moon-muted" />
        </button>
      </div>
      <p class="px-9 pt-2 text-xs font-normal text-moon-ink">
        สามารถเลือกได้มากกว่า 1 ข้อ (กดแล้วบันทึกให้อัตโนมัติ)
      </p>

      <div class="mt-6 flex-1 overflow-y-auto px-9 pb-4">
        <div class="flex flex-col gap-3">
          <button
            v-for="label in [...ALLERGY_OPTIONS, NO_ALLERGY_LABEL]"
            :key="label"
            type="button"
            :disabled="isSavingAllergy"
            class="flex w-full items-center justify-between rounded-2xl border bg-moon-card px-5 py-4 text-left text-base font-medium text-moon-ink"
            :class="allergies.includes(label) ? 'border-moon-period' : 'border-moon-pink-soft'"
            @click="toggleAllergy(label)"
          >
            {{ label }}
            <span
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
              :class="allergies.includes(label) ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
            >
              <FaIcon v-if="allergies.includes(label)" name="check" class="h-3 w-3 text-white" />
            </span>
          </button>

          <!-- "อื่นๆ" อยู่ล่างสุด เป็นกล่องเดียวกัน: กดแล้วกล่องขยายลงมา มีช่องพิมพ์อยู่ข้างใน -->
          <div
            class="w-full overflow-hidden rounded-2xl border bg-moon-card"
            :class="otherOpen ? 'border-moon-period' : 'border-moon-pink-soft'"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between px-5 py-4 text-left text-base font-medium text-moon-ink"
              @click="toggleOtherBox"
            >
              อื่นๆ
              <span
                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
                :class="otherOpen ? 'border-moon-period bg-moon-period' : 'border-moon-pink-soft bg-moon-card'"
              >
                <FaIcon v-if="otherOpen" name="check" class="h-3 w-3 text-white" />
              </span>
            </button>

            <div v-if="otherOpen" class="px-5 pb-4">
              <div v-if="otherAllergyLabels.length" class="mb-3 flex flex-wrap gap-2">
                <button
                  v-for="label in otherAllergyLabels"
                  :key="label"
                  type="button"
                  :disabled="isSavingAllergy"
                  class="rounded-full bg-moon-ink px-3 py-1.5 text-xs font-medium text-white"
                  @click="toggleAllergy(label)"
                >
                  {{ allergyDisplayLabel(label) }}<FaIcon name="xmark" class="ml-1 inline h-3 w-3" />
                </button>
              </div>
              <form class="flex gap-2" @submit.prevent="addOtherAllergy">
                <input
                  v-model="otherInput"
                  type="text"
                  :maxlength="OTHER_ALLERGY_MAX_LENGTH"
                  placeholder="โปรดใส่สิ่งที่คุณแพ้"
                  class="min-w-0 flex-1 rounded-full border border-moon-pink-soft bg-moon-bg px-4 py-2.5 text-sm text-moon-ink outline-none placeholder:text-moon-muted focus:border-moon-pink"
                >
                <button
                  type="submit"
                  :disabled="isSavingAllergy"
                  class="shrink-0 rounded-full bg-moon-ink px-5 py-2.5 text-sm font-medium text-white"
                >
                  เพิ่ม
                </button>
              </form>
            </div>
          </div>
        </div>

        <p v-if="allergyError" class="mt-3 text-sm text-moon-coral">
          {{ allergyError }}
        </p>
      </div>

      <div class="px-9 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
        <BaseButton label="เสร็จแล้ว" @click="showAllergyEditor = false" />
      </div>
    </div>

    <!-- หลังกด "บันทึก": ดาวหมุน -> ติ๊กถูก -> ถามว่าจะสุ่มอีกหรือถัดไป (ต้องกดปุ่มเท่านั้น กดพื้นหลังไม่ปิด) -->
    <div v-if="savePhase !== 'idle'" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
      <div class="w-full max-w-sm rounded-3xl bg-white px-6 pb-6 pt-8 text-center shadow-2xl">
        <div class="mx-auto flex h-[84px] w-[84px] items-center justify-center">
          <BrandLogoMark v-if="savePhase === 'saving'" :size="84" stage="bob" />
          <span v-else ref="checkRef" class="check-pop flex h-[84px] w-[84px] items-center justify-center rounded-full bg-moon-period">
            <svg viewBox="0 0 52 52" class="h-11 w-11" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path class="check-draw" d="M14 27 L23 36 L39 17" />
            </svg>
          </span>
        </div>

        <p class="mt-4 text-lg font-semibold">
          {{ savePhase === 'saving' ? 'กำลังบันทึก...' : 'บันทึกแล้ว!' }}
        </p>
        <p v-if="savePhase === 'saved'" class="mt-1 text-sm text-moon-ink/70">
          {{ savedName }}
        </p>
        <p v-if="savePhase === 'saved'" class="mt-3 text-sm leading-relaxed text-moon-ink/70">
          อยากสุ่มเมนูอื่นเพิ่มอีก หรือไปหน้าเช็คอินต่อเลยดีคะ
        </p>

        <div v-if="savePhase === 'saved'" class="mt-6 flex flex-col gap-2">
          <button
            type="button"
            class="w-full rounded-full bg-moon-pink py-3.5 font-semibold text-moon-ink shadow-sm transition active:scale-95"
            @click="navigateTo('/checkin')"
          >
            ถัดไป
          </button>
          <button
            type="button"
            class="w-full rounded-full border-2 border-moon-pink bg-white py-3.5 font-semibold text-moon-ink transition active:scale-95"
            @click="rollAgain"
          >
            สุ่มอีก
          </button>
        </div>
      </div>
    </div>

    <BottomNav active="home" />
  </div>
</template>

<style scoped>
/* ปุ่มถัดไปเด้งขึ้นลงเล็กน้อย 2 ที ตอนผู้ใช้แตะเลือกหมวด */
.next-bounce {
  animation: next-bounce 0.7s ease-out;
}
@keyframes next-bounce {
  0% { transform: translateY(0); }
  25% { transform: translateY(-14px); }
  50% { transform: translateY(0); }
  70% { transform: translateY(-6px); }
  100% { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .next-bounce { animation: none; }
}

/* การ์ดผลลัพธ์เด้งขึ้นมาตอนได้เมนูใหม่ */
.result-pop {
  animation: result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes result-pop {
  0% {
    opacity: 0;
    transform: translateY(18px) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ตอนสุ่ม: ไพ่ 4 ใบวนเป็นวงรีสลับที่กันอย่างต่อเนื่อง (เหมือนสับไพ่)
   ทุกใบวิ่งตามแอนิเมชันเดียวกันแต่เริ่มคนละจังหวะ (animation-delay ติดลบตามเลข --i = เหลื่อมกันใบละ 1/4 รอบ)
   ครึ่งรอบแรกใบไพ่ลอยมาด้านหน้า (สูงขึ้นนิด ใหญ่ขึ้นนิด) ครึ่งรอบหลังวนกลับไปด้านหลัง (เล็กลงนิด) ใช้ linear + ตัดช่วงถี่ๆ ให้เคลื่อนไหวต่อเนื่องไม่สะดุด */
.shuffle-card {
  margin-left: -85px;
  transform-origin: 50% 100%;
  animation: shuffle-orbit 1.8s linear infinite;
  animation-delay: calc(var(--i) * -0.45s);
  will-change: transform;
}

@keyframes shuffle-orbit {
  0% {
    transform: translate(-64.0px, 2.0px) rotate(-14.0deg) scale(0.980);
    z-index: 10;
  }
  6.25% {
    transform: translate(-59.1px, -2.6px) rotate(-12.9deg) scale(1.003);
    z-index: 13;
  }
  12.5% {
    transform: translate(-45.3px, -6.5px) rotate(-9.9deg) scale(1.022);
    z-index: 16;
  }
  18.75% {
    transform: translate(-24.5px, -9.1px) rotate(-5.4deg) scale(1.035);
    z-index: 17;
  }
  25% {
    transform: translate(-0.0px, -10.0px) rotate(-0.0deg) scale(1.040);
    z-index: 18;
  }
  31.25% {
    transform: translate(24.5px, -9.1px) rotate(5.4deg) scale(1.035);
    z-index: 17;
  }
  37.5% {
    transform: translate(45.3px, -6.5px) rotate(9.9deg) scale(1.022);
    z-index: 16;
  }
  43.75% {
    transform: translate(59.1px, -2.6px) rotate(12.9deg) scale(1.003);
    z-index: 13;
  }
  50% {
    transform: translate(64.0px, 2.0px) rotate(14.0deg) scale(0.980);
    z-index: 10;
  }
  56.25% {
    transform: translate(59.1px, 6.6px) rotate(12.9deg) scale(0.957);
    z-index: 7;
  }
  62.5% {
    transform: translate(45.3px, 10.5px) rotate(9.9deg) scale(0.938);
    z-index: 4;
  }
  68.75% {
    transform: translate(24.5px, 13.1px) rotate(5.4deg) scale(0.925);
    z-index: 3;
  }
  75% {
    transform: translate(0.0px, 14.0px) rotate(0.0deg) scale(0.920);
    z-index: 2;
  }
  81.25% {
    transform: translate(-24.5px, 13.1px) rotate(-5.4deg) scale(0.925);
    z-index: 3;
  }
  87.5% {
    transform: translate(-45.3px, 10.5px) rotate(-9.9deg) scale(0.938);
    z-index: 4;
  }
  93.75% {
    transform: translate(-59.1px, 6.6px) rotate(-12.9deg) scale(0.957);
    z-index: 7;
  }
  100% {
    transform: translate(-64.0px, 2.0px) rotate(-14.0deg) scale(0.980);
    z-index: 10;
  }
}

/* ชั้นสีของใบถัดไปจางเข้า-ออกช้าๆ ตามจังหวะเดียวกัน ทำให้สีบนไพ่ไหลเปลี่ยนไปมา */
.shuffle-tint {
  opacity: 0;
  animation: shuffle-tint 1.8s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.45s);
}

@keyframes shuffle-tint {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.9;
  }
}

.shuffle-sparkle {
  animation: shuffle-twinkle 0.8s ease-in-out infinite;
}

@keyframes shuffle-twinkle {
  0%,
  100% {
    transform: scale(0.7) rotate(0deg);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15) rotate(30deg);
    opacity: 1;
  }
}

/* บันทึกสำเร็จ: วงกลมเด้งขึ้น แล้วเส้นติ๊กถูกค่อยๆ ถูกวาด */
.check-pop {
  animation: check-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes check-pop {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.check-draw {
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: check-draw 0.4s ease-out 0.25s forwards;
}

@keyframes check-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .result-pop,
  .shuffle-card,
  .shuffle-sparkle,
  .shuffle-tint,
  .check-pop {
    animation: none;
  }

  .check-draw {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>

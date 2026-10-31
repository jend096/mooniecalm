import type { AvatarSelections } from './avatar-selections-storage'

// Onboarding answers are collected before signup and normally live only in the
// Pinia store / localStorage of the browser that answered them. When the magic
// link is opened in another browser (e.g. Gmail's in-app browser on mobile)
// those are empty, so the answers are also sent along as user_metadata in
// signInWithOtp() and read back from the session here.
export interface OnboardingMetadata {
  birth_date: string | null
  weight_kg: number | null
  height_cm: number | null
  last_period_date: string | null
  period_duration_days: number | null
  food_allergies: string[]
  avatar_selections: AvatarSelections
  consent_at: string | null // เวลาที่กดยินยอมเก็บข้อมูลสุขภาพ (ดู ~/utils/consent.ts)
  consent_version: string | null // ฉบับข้อความที่ผู้ใช้เห็นตอนกดยินยอม
}

const AVATAR_SLOTS: (keyof AvatarSelections)[] = ['eyes', 'ears', 'body_color', 'fx_overlay']

function emptyAvatarSelections(): AvatarSelections {
  return { eyes: null, ears: null, body_color: null, fx_overlay: null }
}

function isEmptySelections(selections: AvatarSelections): boolean {
  return Object.values(selections).every(v => v === null)
}

// Built from the store/localStorage of the current browser, for signInWithOtp's options.data.
export function buildOnboardingMetadata(): OnboardingMetadata {
  const onboarding = useOnboardingStore()
  const avatarSelections = useAvatarSelections()

  return {
    birth_date: onboarding.birthDate || null,
    weight_kg: onboarding.weightKg,
    height_cm: onboarding.heightCm,
    last_period_date: onboarding.lastPeriodDate || null,
    period_duration_days: onboarding.periodDurationDays,
    food_allergies: [...onboarding.foodAllergies],
    avatar_selections: { ...avatarSelections.value },
    consent_at: readConsent()?.at ?? null,
    consent_version: readConsent()?.version ?? null
  }
}

// ===== เก็บคำตอบ onboarding ข้ามการเด้งไปหน้า Google =====
// คำตอบ (วันเกิด น้ำหนัก ส่วนสูง ประจำเดือน ที่แพ้) อยู่ใน Pinia ซึ่งอยู่แค่ในความจำของหน้าเว็บ
// พอกด "ดำเนินการต่อด้วย Google" เบราว์เซอร์ออกไปหน้า Google แล้วโหลดหน้าเว็บใหม่ตอนกลับมา ความจำนั้นหายหมด
// (ทางอีเมลไม่เป็นไร เพราะแนบคำตอบไปกับ user_metadata แต่ Google แนบไม่ได้)
// เลยจดคำตอบลง localStorage ไว้ก่อนเด้งออกไป พอกลับมาสร้างโปรไฟล์ก็หยิบมาเติมที่ว่าง แล้วลบทิ้ง
const PENDING_ONBOARDING_KEY = 'mooniecalm-pending-onboarding'

export function savePendingOnboarding() {
  try {
    window.localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(buildOnboardingMetadata()))
  } catch {
    // เก็บไม่ได้ (เช่นปิด storage) ก็ไม่เป็นไร แค่คำตอบจะไม่ตามมาหลังกลับจาก Google
  }
}

function readPendingOnboarding(): OnboardingMetadata | null {
  try {
    const raw = window.localStorage.getItem(PENDING_ONBOARDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    // ผ่านตัวแปลงเดิม เพื่อให้ชนิดข้อมูลถูกต้องและค่าแปลกๆ กลายเป็นค่าว่าง
    return resolveOnboardingData(parsed, emptyOnboardingData())
  } catch {
    return null
  }
}

function clearPendingOnboarding() {
  try {
    window.localStorage.removeItem(PENDING_ONBOARDING_KEY)
  } catch {
    // ลบไม่ได้ก็ข้าม
  }
}

function emptyOnboardingData(): OnboardingMetadata {
  return {
    birth_date: null,
    weight_kg: null,
    height_cm: null,
    last_period_date: null,
    period_duration_days: null,
    food_allergies: [],
    avatar_selections: emptyAvatarSelections(),
    consent_at: null,
    consent_version: null
  }
}

// เอาค่าที่จดไว้ก่อนไปหน้า Google มาเติมเฉพาะช่องที่ตอนนี้ยังว่าง (ค่าที่มีอยู่แล้วไม่ถูกทับ)
function fillMissing(primary: OnboardingMetadata, fallback: OnboardingMetadata): OnboardingMetadata {
  const selections = emptyAvatarSelections()
  for (const slot of AVATAR_SLOTS) {
    selections[slot] = primary.avatar_selections[slot] ?? fallback.avatar_selections[slot]
  }
  return {
    birth_date: primary.birth_date ?? fallback.birth_date,
    weight_kg: primary.weight_kg ?? fallback.weight_kg,
    height_cm: primary.height_cm ?? fallback.height_cm,
    last_period_date: primary.last_period_date ?? fallback.last_period_date,
    period_duration_days: primary.period_duration_days ?? fallback.period_duration_days,
    food_allergies: primary.food_allergies.length ? primary.food_allergies : fallback.food_allergies,
    avatar_selections: selections,
    consent_at: primary.consent_at ?? fallback.consent_at,
    consent_version: primary.consent_version ?? fallback.consent_version
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function avatarSelectionsFromMetadata(value: unknown): AvatarSelections {
  const selections = emptyAvatarSelections()
  if (!value || typeof value !== 'object') return selections

  for (const slot of AVATAR_SLOTS) {
    selections[slot] = stringOrNull((value as Record<string, unknown>)[slot])
  }
  return selections
}

// user_metadata wins field by field; the local store/localStorage only fills in
// what the metadata doesn't have (e.g. users created before this change, or
// OAuth sign-ins, which can't carry options.data).
export function resolveOnboardingData(
  metadata: Record<string, unknown> | undefined,
  local: OnboardingMetadata
): OnboardingMetadata {
  const meta = metadata ?? {}
  const metaSelections = avatarSelectionsFromMetadata(meta.avatar_selections)
  const metaAllergies = Array.isArray(meta.food_allergies)
    ? meta.food_allergies.filter((a): a is string => typeof a === 'string')
    : null

  return {
    birth_date: stringOrNull(meta.birth_date) ?? local.birth_date,
    weight_kg: numberOrNull(meta.weight_kg) ?? local.weight_kg,
    height_cm: numberOrNull(meta.height_cm) ?? local.height_cm,
    last_period_date: stringOrNull(meta.last_period_date) ?? local.last_period_date,
    period_duration_days: numberOrNull(meta.period_duration_days) ?? local.period_duration_days,
    food_allergies: metaAllergies ?? local.food_allergies,
    avatar_selections: isEmptySelections(metaSelections) ? local.avatar_selections : metaSelections,
    consent_at: stringOrNull(meta.consent_at) ?? local.consent_at,
    consent_version: stringOrNull(meta.consent_version) ?? local.consent_version
  }
}

// เช็คว่าผู้ใช้คนนี้ "เคยตอบคำถามสร้างอวตารแล้วหรือยัง" (ไว้กันไม่ให้สร้างโปรไฟล์เปล่าให้คนที่กด "เข้าสู่ระบบ" โดยยังไม่เคยตอบอะไร)
// หาคำตอบจาก 3 ที่ เหมือนตอนบันทึกจริง: จดจำในเบราว์เซอร์นี้ / ที่แนบไปกับลิงก์อีเมล (userMetadata) / ที่จดไว้ก่อนเด้งไปหน้า Google
// คืนค่า true = มีคำตอบอย่างน้อยหนึ่งข้อ
export function hasOnboardingAnswers(userMetadata: Record<string, unknown> | undefined): boolean {
  let local = buildOnboardingMetadata()
  if (isEmptySelections(local.avatar_selections)) {
    local.avatar_selections = readAvatarSelectionsFromStorage()
  }
  const pending = readPendingOnboarding()
  if (pending) local = fillMissing(local, pending)
  const data = resolveOnboardingData(userMetadata, local)
  return !isEmptySelections(data.avatar_selections)
}

export async function saveOnboardingProfile(userId: string) {
  const sessionClient = useSupabaseClient()
  const { data: sessionData } = await sessionClient.auth.getSession()
  const supabase = await getAuthedSupabaseClient()

  let local = buildOnboardingMetadata()
  if (isEmptySelections(local.avatar_selections)) {
    local.avatar_selections = readAvatarSelectionsFromStorage()
  }
  // กลับมาจากหน้า Google: ความจำของหน้าเว็บหายไปแล้ว ดึงคำตอบที่จดไว้ก่อนไปมาเติมช่องที่ว่าง
  const pending = readPendingOnboarding()
  if (pending) local = fillMissing(local, pending)

  const data = resolveOnboardingData(sessionData.session?.user.user_metadata, local)

  // ใส่เฉพาะช่องที่ "มีค่าจริง" เท่านั้น ถ้าส่งค่าว่าง (null) ไปด้วย จะเขียนทับข้อมูลเดิมของผู้ใช้เดิมจนหายหมด
  // (เช่น ล็อกอินเมลเดิมในเครื่องที่ความจำคำตอบถูกล้างไปแล้ว) ช่องที่ไม่ใส่ = ฐานข้อมูลคงค่าเดิมไว้
  const profileFields: Record<string, unknown> = {
    auth_user_id: userId,
    email: sessionData.session?.user.email
  }
  if (data.birth_date !== null) profileFields.birth_date = data.birth_date
  if (data.weight_kg !== null) profileFields.weight_kg = data.weight_kg
  if (data.height_cm !== null) profileFields.height_cm = data.height_cm
  if (data.last_period_date !== null) profileFields.last_period_date = data.last_period_date
  if (data.period_duration_days !== null) profileFields.period_duration_days = data.period_duration_days
  if (data.food_allergies.length > 0) profileFields.allergies = data.food_allergies

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .upsert(profileFields, { onConflict: 'auth_user_id' })
    .select('id')
    .single()

  if (error) throw error

  // เก็บหลักฐานความยินยอมแยกอีกคำสั่ง (ถ้ายังไม่ได้รัน SQL เพิ่มคอลัมน์ จะแค่เตือนในคอนโซล ไม่ให้สมัครพัง)
  if (data.consent_at) {
    const { error: consentError } = await supabase
      .from('user_profiles')
      .update({ consent_health_at: data.consent_at, consent_version: data.consent_version })
      .eq('id', profile.id)
    if (consentError) console.warn('[saveOnboardingProfile] เก็บความยินยอมไม่สำเร็จ (รัน consent-columns.sql แล้วหรือยัง?)', consentError)
  }

  const selections = data.avatar_selections

  // TEMP DEBUG: remove once avatar selections are confirmed to persist correctly.
  console.log('[saveOnboardingProfile] avatarSelections used for insert:', selections)

  const avatarRows = (Object.entries(selections) as [string, string | null][])
    .filter(([, assetCode]) => assetCode !== null)
    .map(([featureSlot, assetCode]) => ({
      user_id: profile.id,
      feature_slot: featureSlot,
      current_asset_code: assetCode
    }))

  if (avatarRows.length > 0) {
    const { error: avatarError } = await supabase
      .from('user_avatar_state')
      .upsert(avatarRows, { onConflict: 'user_id,feature_slot' })

    if (avatarError) throw avatarError
  }

  // บันทึกครบแล้ว ลบที่จดไว้ก่อนไปหน้า Google ทิ้ง ไม่ให้ค้างไปใช้กับบัญชีอื่น
  clearPendingOnboarding()

  // บันทึกลงฐานข้อมูลแล้ว ล้างคำตอบอวตารที่จำไว้ในเครื่อง (ทั้งในความจำและ localStorage)
  // ไม่งั้นคำตอบเก่าค้างอยู่ แล้วคนถัดไปที่ใช้เครื่องนี้ (หรือบัญชีใหม่ที่ยังไม่เคยตอบ) จะถูกนับว่า "เคยตอบแล้ว" ทั้งที่ไม่ได้ตอบ
  const avatarSelections = useAvatarSelections()
  avatarSelections.value = emptyAvatarSelections()
}

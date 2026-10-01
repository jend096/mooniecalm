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
    avatar_selections: { ...avatarSelections.value }
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
    avatar_selections: isEmptySelections(metaSelections) ? local.avatar_selections : metaSelections
  }
}

export async function saveOnboardingProfile(userId: string) {
  const sessionClient = useSupabaseClient()
  const { data: sessionData } = await sessionClient.auth.getSession()
  const supabase = await getAuthedSupabaseClient()

  const local = buildOnboardingMetadata()
  if (isEmptySelections(local.avatar_selections)) {
    local.avatar_selections = readAvatarSelectionsFromStorage()
  }

  const data = resolveOnboardingData(sessionData.session?.user.user_metadata, local)

  const { data: profile, error } = await supabase.from('user_profiles').upsert({
    auth_user_id: userId,
    email: sessionData.session?.user.email,
    birth_date: data.birth_date,
    weight_kg: data.weight_kg,
    height_cm: data.height_cm,
    last_period_date: data.last_period_date,
    period_duration_days: data.period_duration_days,
    allergies: data.food_allergies
  }, { onConflict: 'auth_user_id' }).select('id').single()

  if (error) throw error

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
}

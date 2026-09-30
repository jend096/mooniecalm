export async function saveOnboardingProfile(userId: string) {
  const onboarding = useOnboardingStore()
  const sessionClient = useSupabaseClient()
  const { data: sessionData } = await sessionClient.auth.getSession()
  const supabase = await getAuthedSupabaseClient()

  const { data: profile, error } = await supabase.from('user_profiles').upsert({
    auth_user_id: userId,
    email: sessionData.session?.user.email,
    birth_date: onboarding.birthDate,
    weight_kg: onboarding.weightKg,
    height_cm: onboarding.heightCm,
    last_period_date: onboarding.lastPeriodDate,
    period_duration_days: onboarding.periodDurationDays
  }, { onConflict: 'auth_user_id' }).select('id').single()

  if (error) throw error

  const avatarSelections = useAvatarSelections()
  let selections = avatarSelections.value

  const isEmpty = Object.values(selections).every(v => v === null)
  if (isEmpty) {
    selections = readAvatarSelectionsFromStorage()
  }

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

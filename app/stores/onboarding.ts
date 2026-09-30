export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    name: '',
    birthDate: '',
    weightKg: null as number | null,
    heightCm: null as number | null,
    lastPeriodDate: '',
    periodDurationDays: null as number | null,
    foodAllergies: [] as string[],
    profileImageUrl: '' as string
  }),
  actions: {
    async submit() {
      // TODO: save this.$state to the Supabase `user_profiles` table
      // once the Supabase client is configured in this project.
      console.log('onboarding profile', this.$state)
    },
    reset() {
      this.$reset()
    }
  }
})

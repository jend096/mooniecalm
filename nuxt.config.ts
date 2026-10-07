// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/supabase'],
  css: ['~/assets/css/tokens.css'],
  supabase: {
    useSsrCookies: false,
    redirectOptions: {
      login: '/onboarding/signup',
      callback: '/onboarding/signup',
      exclude: ['/*']
    },
    clientOptions: {
      auth: {
        flowType: 'implicit'
      }
    }
  },
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600&display=swap'
        }
      ]
    }
  }
})
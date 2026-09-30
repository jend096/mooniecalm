import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Workaround: useSupabaseClient() isn't attaching the apikey header on
// PostgREST (.from) / Storage calls when useSsrCookies is false. Build a
// standalone client instead, but forward the already-authenticated session's
// access token so requests are still made as the signed-in user (otherwise
// they hit tables/storage as anon and RLS will reject them).
//
// auth.persistSession/autoRefreshToken/detectSessionInUrl are all off so this
// client never spins up its own GoTrueClient or touches localStorage — it
// only ever fires requests with the token it's handed, avoiding the
// "Multiple GoTrueClient instances" collision with the main @nuxtjs/supabase
// client. The instance is cached and reused; it's only rebuilt when the
// access token actually changes (e.g. after the main client refreshes it),
// so a long-lived page doesn't keep firing requests with an expired token.
let cachedClient: SupabaseClient | null = null
let cachedAccessToken: string | null = null

export async function getAuthedSupabaseClient(): Promise<SupabaseClient> {
  const config = useRuntimeConfig()
  const authedClient = useSupabaseClient()
  const { data: sessionData } = await authedClient.auth.getSession()
  const accessToken = sessionData.session?.access_token ?? null

  if (cachedClient && cachedAccessToken === accessToken) {
    return cachedClient
  }

  cachedAccessToken = accessToken
  cachedClient = createClient(config.public.supabase.url, config.public.supabase.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}
  })

  return cachedClient
}

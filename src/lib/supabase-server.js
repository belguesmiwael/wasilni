import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function cleanUrl(raw) {
  try { return new URL((raw || '').trim()).origin }
  catch { return (raw || '').trim() }
}

const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

export async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
      .from('user_profiles').select('*').eq('id', user.id).single()
    return { ...user, profile }
  } catch (e) {
    console.error('getUser error:', e.message)
    return null
  }
}

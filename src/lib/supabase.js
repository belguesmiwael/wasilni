'use client'
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
}

export const supabase = createClient()

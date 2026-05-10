'use client'
import { createBrowserClient } from '@supabase/ssr'

function cleanUrl(raw) {
  try { return new URL((raw || '').trim()).origin }
  catch { return (raw || '').trim() }
}

const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
}

export const supabase = createClient()

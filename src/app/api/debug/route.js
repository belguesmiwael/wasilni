import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function cleanUrl(raw) {
  try {
    return new URL(raw.trim()).origin
  } catch {
    return raw.trim()
  }
}

export async function GET() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const cleanedUrl = cleanUrl(rawUrl)
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  let connectionTest = null
  let error = null

  try {
    const supabase = createClient(cleanedUrl, anon)
    const { data, error: err } = await supabase.from('hubs').select('id').limit(1)
    connectionTest = err ? `FAIL: ${err.message}` : `OK — ${data?.length} row(s)`
    error = err?.message || null
  } catch (e) {
    connectionTest = `EXCEPTION: ${e.message}`
    error = e.message
  }

  return NextResponse.json({
    raw_url_length: rawUrl.length,
    cleaned_url: cleanedUrl,
    cleaned_length: cleanedUrl.length,
    connection_test: connectionTest,
    error,
  })
}

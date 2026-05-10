import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  let connectionTest = null
  let error = null

  try {
    const supabase = createClient(url, anon)
    const { data, error: err } = await supabase.from('hubs').select('id').limit(1)
    connectionTest = err ? `FAIL: ${err.message}` : `OK — ${data?.length} row(s)`
    error = err?.message || null
  } catch (e) {
    connectionTest = `EXCEPTION: ${e.message}`
    error = e.message
  }

  return NextResponse.json({
    url_preview: url.substring(0, 40) + '...',
    url_length: url.length,
    anon_length: anon.length,
    anon_starts_with: anon.substring(0, 10),
    connection_test: connectionTest,
    error,
  })
}

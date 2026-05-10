import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: {
      set: !!url,
      value: url ? url.substring(0, 30) + '...' : 'MISSING',
      startsWithHttps: url?.startsWith('https://') ?? false,
      endsWithSupabase: url?.includes('.supabase.co') ?? false,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      set: !!anon,
      length: anon?.length ?? 0,
      preview: anon ? anon.substring(0, 20) + '...' : 'MISSING',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      set: !!service,
      length: service?.length ?? 0,
      preview: service ? service.substring(0, 20) + '...' : 'MISSING',
    },
  })
}

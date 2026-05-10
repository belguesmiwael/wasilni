import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

function cleanUrl(raw) {
  try { return new URL((raw || '').trim()).origin }
  catch { return (raw || '').trim() }
}

const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl
    const isProtected = ['/passenger','/driver','/trip','/admin'].some(r => pathname.startsWith(r))
    const isAuthPage = pathname.startsWith('/auth')

    if (!user && isProtected) return NextResponse.redirect(new URL('/auth/login', request.url))
    if (user && isAuthPage) {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || 'passenger'
      const dest = role === 'admin' ? '/admin/dashboard' : role === 'driver' ? '/driver/dashboard' : '/passenger/search'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    if (pathname.startsWith('/admin') && user) {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return NextResponse.redirect(new URL('/passenger/search', request.url))
    }
  } catch (e) {
    console.error('Middleware error:', e.message)
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/debug|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

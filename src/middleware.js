import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const protectedRoutes = ['/passenger', '/driver', '/trip', '/admin']
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))
  const isAuthPage = pathname.startsWith('/auth')

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'passenger'
    const dest = role === 'admin' ? '/admin/dashboard' : role === 'driver' ? '/driver/dashboard' : '/passenger/search'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Admin guard
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/passenger/search', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // WAJIB: refresh session — jangan hapus baris ini
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ─── HALAMAN PUBLIK ─────────────────────────────────────────
  const publicPaths = ['/', '/login', '/register', '/harga-pangan']
  const isPublicPath = publicPaths.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  // ─── REDIRECT: user tidak login → halaman protected ────────
  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ─── REDIRECT: user sudah login → halaman auth ─────────────
  if (user && (pathname === '/login' || pathname === '/register')) {
    const userRole = user.user_metadata?.role as string | undefined
    const roleRedirects: Record<string, string> = {
      petani:        '/petani/dashboard',
      pembeli:       '/pembeli/marketplace',
      penyedia_alat: '/penyedia/dashboard',
      admin:         '/admin/dashboard',
    }
    const redirectTo = roleRedirects[userRole ?? ''] ?? '/petani/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // ─── RBAC per route group ──────────────────────────────────
  if (user) {
    const userRole = user.user_metadata?.role as string | undefined

    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (pathname.startsWith('/petani') && userRole !== 'petani') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    if (pathname.startsWith('/penyedia') && userRole !== 'penyedia_alat') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
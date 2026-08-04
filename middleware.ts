import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Route yang harus login
const PROTECTED_PREFIXES = [
  '/petani',
  '/pembeli',
  '/penyedia',
  '/admin',
  '/pilih-peran',
  '/settings',
]

// Route yang hanya bisa diakses ketika BELUM login
const AUTH_ONLY_ROUTES = ['/login', '/register']

// Pemetaan prefix route ke role yang diizinkan
const ROLE_REQUIRED: Record<string, string[]> = {
  '/admin': ['admin'],
  '/petani': ['petani', 'admin'],
  '/penyedia': ['penyedia_alat', 'admin'],
  '/pembeli': ['pembeli', 'petani', 'penyedia_alat', 'admin'], // semua bisa akses marketplace
}

/**
 * Helper untuk matching path secara presisi (mencegah bypass seperti /admin-fake atau /petani-evil)
 */
function isPathMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const { pathname } = request.nextUrl

  // Kalau ENV belum dikonfigurasi, skip middleware (dev fallback)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Refresh session — wajib untuk keep session valid
  const { data: { user } } = await supabase.auth.getUser()

  // ─── Redirect user yang sudah login dari halaman auth ────────────
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some(r => isPathMatch(pathname, r))
  if (user && isAuthOnlyRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    const metaRole = user.user_metadata?.role as string | undefined
    const dbRole = (profile as any)?.role as string | undefined
    const role = dbRole ?? metaRole ?? 'pembeli'
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : 'pembeli'

    const roleRedirects: Record<string, string> = {
      petani: '/petani/dashboard',
      pembeli: '/pembeli/marketplace',
      penyedia_alat: '/penyedia/dashboard',
      admin: '/admin/dashboard',
    }
    const destination = roleRedirects[normalizedRole] ?? '/pembeli/marketplace'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // ─── Protect route yang butuh login ──────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(prefix => isPathMatch(pathname, prefix))
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ─── Role-based access control ───────────────────────────────────
  if (user && isProtected) {
    const matchedPrefix = Object.keys(ROLE_REQUIRED).find(prefix =>
      isPathMatch(pathname, prefix)
    )

    if (matchedPrefix) {
      const allowedRoles = ROLE_REQUIRED[matchedPrefix]

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, roles')
        .eq('id', user.id)
        .maybeSingle()

      const metaRole = user.user_metadata?.role as string | undefined
      const metaRoles = user.user_metadata?.roles as string[] | undefined
      const dbRole = (profile as any)?.role as string | undefined
      const dbRoles = (profile as any)?.roles as string[] | undefined

      const activeRole = (dbRole ?? metaRole)?.trim().toLowerCase()
      const userRolesRaw = dbRoles ?? metaRoles ?? (activeRole ? [activeRole] : [])
      const userRoles: string[] = userRolesRaw.map(r => String(r).trim().toLowerCase())

      // Multi-role & missing profile fallback:
      // Jika profile belum ada untuk user non-admin, berikan default role 'pembeli'
      const effectiveRoles = userRoles.length > 0
        ? userRoles
        : (matchedPrefix !== '/admin' ? ['pembeli'] : [])
      const effectiveActiveRole = activeRole ?? (matchedPrefix !== '/admin' ? 'pembeli' : undefined)

      const hasAccess =
        (effectiveActiveRole && allowedRoles.includes(effectiveActiveRole)) ||
        effectiveRoles.some(r => allowedRoles.includes(r.trim().toLowerCase()))

      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
}
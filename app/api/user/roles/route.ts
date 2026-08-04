import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/client'

const SELF_SERVICE_ROLES: UserRole[] = ['petani', 'pembeli', 'penyedia_alat']

/**
 * GET /api/user/roles
 * Ambil role terbaru dari database (bukan dari JWT/cache).
 * Dipakai oleh client setelah switch role untuk re-sync state.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn('[API /api/user/roles GET] 401 Unauthorized - invalid user session:', authError?.message)
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    if (dbError) {
      console.error('[API /api/user/roles GET DB ERROR]:', dbError)
      return NextResponse.json({ error: 'Gagal membaca profil' }, { status: 500 })
    }

    const profileAny = profile as { role: UserRole | null; roles: UserRole[] | null } | null
    const activeRole: UserRole = profileAny?.role ?? 'pembeli'
    const roles: UserRole[] =
      profileAny?.roles && profileAny.roles.length > 0
        ? profileAny.roles
        : [activeRole]

    return NextResponse.json({ role: activeRole, roles })
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    console.error('[API /api/user/roles GET EXCEPTION]:', errorObj.stack || errorObj.message)
    return NextResponse.json({ error: errorObj.message || 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

/**
 * POST /api/user/roles
 * Update role aktif + daftar roles user.
 * Menulis ke DB (profiles) DAN JWT metadata secara atomik.
 * Blokir assignment role admin dari self-service.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authUserError } = await supabase.auth.getUser()

    if (authUserError || !user) {
      console.warn('[API /api/user/roles POST] 401 Unauthorized - user session invalid:', authUserError?.message)
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    let body: any = null
    try {
      body = await request.json()
    } catch {
      console.warn('[API /api/user/roles POST] 400 Bad Request - invalid JSON body')
      return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
    }

    console.log('[API /api/user/roles POST] Incoming Request:', {
      userId: user.id,
      userEmail: user.email,
      body,
    })

    const { roles, activeRole } = body as { roles?: unknown; activeRole?: unknown }

    if (!Array.isArray(roles) || roles.length === 0 || typeof activeRole !== 'string') {
      console.warn('[API /api/user/roles POST] 400 Bad Request - missing parameters:', { roles, activeRole })
      return NextResponse.json(
        { error: 'Parameter roles (array) dan activeRole (string) wajib diisi' },
        { status: 400 }
      )
    }

    // Blokir role admin dari self-service
    if ((roles as string[]).includes('admin') || activeRole === 'admin') {
      console.warn('[API /api/user/roles POST] 403 Forbidden - self-service admin role assignment denied for user:', user.id)
      return NextResponse.json(
        { error: 'Akses ditolak. Tidak dapat memberikan peran admin melalui jalur ini.' },
        { status: 403 }
      )
    }

    const validatedRoles = (roles as string[]).filter((r): r is UserRole =>
      SELF_SERVICE_ROLES.includes(r as UserRole)
    )

    if (validatedRoles.length === 0) {
      console.warn('[API /api/user/roles POST] 400 Bad Request - no valid roles provided:', roles)
      return NextResponse.json({ error: 'Minimal pilih 1 peran yang valid' }, { status: 400 })
    }

    const validatedActiveRole = SELF_SERVICE_ROLES.includes(activeRole as UserRole)
      ? (activeRole as UserRole)
      : validatedRoles[0]

    if (!validatedRoles.includes(validatedActiveRole)) {
      console.warn('[API /api/user/roles POST] 400 Bad Request - activeRole not in roles list:', { validatedActiveRole, validatedRoles })
      return NextResponse.json(
        { error: 'Peran aktif tidak terdapat dalam daftar peran' },
        { status: 400 }
      )
    }

    // 1. Primary Strategy: Update database profiles using user's authenticated client `supabase`
    // Using upsert ensures the record is created if missing, or updated if existing.
    const { data: updatedProfile, error: dbError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          role: validatedActiveRole,
          roles: validatedRoles,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, role, roles')

    console.log('[API /api/user/roles POST] User Client Upsert Result:', { updatedProfile, dbError })

    let finalProfile = updatedProfile
    let finalDbError = dbError

    // 2. Secondary Strategy: Fallback to Admin Client if user client upsert returned error
    if (dbError) {
      try {
        const adminSupabase = createAdminSupabaseClient()
        const { data: adminProfile, error: adminDbError } = await adminSupabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              role: validatedActiveRole,
              roles: validatedRoles,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('id, role, roles')

        console.log('[API /api/user/roles POST] Admin Client Fallback Upsert Result:', { adminProfile, adminDbError })
        finalProfile = adminProfile
        finalDbError = adminDbError
      } catch (adminErr) {
        console.warn('[API /api/user/roles POST] Admin Client Fallback Error:', adminErr)
      }
    }

    if (finalDbError) {
      console.error('[API /api/user/roles POST] DB Error Saving Role:', finalDbError)
      return NextResponse.json(
        { error: `Gagal menyimpan profil: ${finalDbError.message}` },
        { status: 500 }
      )
    }

    // 3. Sync Auth Metadata
    try {
      await supabase.auth.updateUser({
        data: {
          role: validatedActiveRole,
          roles: validatedRoles,
        },
      })
    } catch (authErr) {
      console.warn('[API /api/user/roles POST] User metadata update notice:', authErr)
    }

    try {
      const adminSupabase = createAdminSupabaseClient()
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          role: validatedActiveRole,
          roles: validatedRoles,
        },
      })
    } catch (adminAuthErr) {
      // Best-effort admin sync
    }

    console.log(
      `[AUDIT SUCCESS] User ${user.id} updated active role → ${validatedActiveRole}, roles: [${validatedRoles.join(', ')}]`
    )

    return NextResponse.json({
      success: true,
      role: validatedActiveRole,
      roles: validatedRoles,
    })
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    console.error('[API /api/user/roles POST EXCEPTION STACK]:', errorObj.stack || errorObj.message)
    return NextResponse.json(
      { error: errorObj.message || 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

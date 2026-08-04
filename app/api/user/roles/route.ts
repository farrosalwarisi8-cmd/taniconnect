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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const { data: profile, error: dbError } = await createAdminSupabaseClient()
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    if (dbError) {
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
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server'
    return NextResponse.json({ error: message }, { status: 500 })
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const body = await request.json()
    const { roles, activeRole } = body as { roles?: unknown; activeRole?: unknown }

    if (!Array.isArray(roles) || roles.length === 0 || typeof activeRole !== 'string') {
      return NextResponse.json(
        { error: 'Parameter roles (array) dan activeRole (string) wajib diisi' },
        { status: 400 }
      )
    }

    // Blokir role admin dari self-service
    if ((roles as string[]).includes('admin') || activeRole === 'admin') {
      return NextResponse.json(
        { error: 'Akses ditolak. Tidak dapat memberikan peran admin melalui jalur ini.' },
        { status: 403 }
      )
    }

    const validatedRoles = (roles as string[]).filter((r): r is UserRole =>
      SELF_SERVICE_ROLES.includes(r as UserRole)
    )

    if (validatedRoles.length === 0) {
      return NextResponse.json({ error: 'Minimal pilih 1 peran yang valid' }, { status: 400 })
    }

    const validatedActiveRole = SELF_SERVICE_ROLES.includes(activeRole as UserRole)
      ? (activeRole as UserRole)
      : validatedRoles[0]

    if (!validatedRoles.includes(validatedActiveRole)) {
      return NextResponse.json(
        { error: 'Peran aktif tidak terdapat dalam daftar peran' },
        { status: 400 }
      )
    }

    // Gunakan admin client untuk bypass RLS
    const adminSupabase = createAdminSupabaseClient()

    // 1. Update database (source of truth)
    const { data: updatedProfile, error: dbError } = await adminSupabase
      .from('profiles')
      .update({ role: validatedActiveRole, roles: validatedRoles })
      .eq('id', user.id)
      .select('id, role, roles')

    if (dbError || !updatedProfile || updatedProfile.length === 0) {
      return NextResponse.json(
        { error: 'Gagal menyimpan perubahan role, coba lagi' },
        { status: 500 }
      )
    }

    // 2. Sinkronkan JWT metadata agar middleware selalu up-to-date
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        role: validatedActiveRole,
        roles: validatedRoles,
      },
    })

    if (authError) {
      // Non-fatal: DB sudah diupdate, metadata sync adalah best-effort
      console.warn('[ROLE UPDATE] JWT metadata sync gagal:', authError.message)
    }

    console.log(
      `[AUDIT] User ${user.id} ganti role aktif → ${validatedActiveRole}, semua role: [${validatedRoles.join(', ')}]`
    )

    return NextResponse.json({
      success: true,
      role: validatedActiveRole,
      roles: validatedRoles,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

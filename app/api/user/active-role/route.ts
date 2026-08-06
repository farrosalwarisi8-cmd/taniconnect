import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * PATCH /api/user/active-role
 * Mengubah role aktif user tanpa logout.
 * Body: { active_role: string } atau { activeRole: string }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
    }

    const bodyObj = body as { active_role?: string; activeRole?: string }
    const newActiveRole = (bodyObj.active_role || bodyObj.activeRole || '').trim().toLowerCase()

    if (!newActiveRole) {
      return NextResponse.json({ error: 'Parameter active_role wajib diisi' }, { status: 400 })
    }

    // Ambil profile & roles dari DB (single source of truth)
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    if (dbError || !profile) {
      return NextResponse.json(
        { error: 'Profil tidak ditemukan' },
        { status: 404 }
      )
    }

    const profileAny = profile as { role: string | null; roles: string[] | null }
    const userRoles = (profileAny.roles ?? []).map((r: string) => r.trim().toLowerCase())
    if (userRoles.length === 0 && profileAny.role) {
      userRoles.push(profileAny.role.trim().toLowerCase())
    }

    // Validasi apakah user memiliki role tersebut
    if (!userRoles.includes(newActiveRole)) {
      return NextResponse.json(
        { error: `Anda tidak memiliki peran ${newActiveRole}` },
        { status: 403 }
      )
    }

    const adminSupabase = createAdminSupabaseClient()

    // Update active_role di profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminSupabase.from('profiles') as any)
      .update({ role: newActiveRole, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('[API /user/active-role PATCH] Update error:', updateError)
      return NextResponse.json(
        { error: `Gagal memperbarui peran aktif: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Update auth user metadata agar middleware/JWT sinkron
    const { error: authMetaError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          role: newActiveRole,
          roles: userRoles,
        },
      }
    )

    if (authMetaError) {
      console.warn('[API /user/active-role PATCH] Auth meta update warning:', authMetaError.message)
    }

    return NextResponse.json({
      success: true,
      active_role: newActiveRole,
      roles: userRoles,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    console.error('[API /user/active-role PATCH] Exception:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

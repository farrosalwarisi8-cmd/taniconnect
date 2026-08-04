import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { SELF_ASSIGNABLE_ROLES } from '@/lib/role-access'
import type { UserRole } from '@/lib/supabase/client'

/**
 * POST /api/profile/roles
 * User mengupdate role sendiri (petani/pembeli/penyedia_alat saja).
 * Menggunakan service role agar tidak terblokir RLS.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const body = await request.json()
    const { roles, activeRole } = body as { roles?: string[]; activeRole?: string }

    if (!Array.isArray(roles) || roles.length === 0 || !activeRole) {
      return NextResponse.json(
        { error: 'Parameter roles dan activeRole wajib diisi.' },
        { status: 400 }
      )
    }

    // Blokir assignment role admin dari sisi user
    const invalidRoles = roles.filter(r => !SELF_ASSIGNABLE_ROLES.includes(r as UserRole))
    if (invalidRoles.length > 0 || !SELF_ASSIGNABLE_ROLES.includes(activeRole as UserRole)) {
      return NextResponse.json(
        { error: 'Role admin hanya bisa diberikan oleh administrator.' },
        { status: 403 }
      )
    }

    const sanitizedRoles = roles.filter(r =>
      SELF_ASSIGNABLE_ROLES.includes(r as UserRole)
    ) as UserRole[]

    const sanitizedActive = SELF_ASSIGNABLE_ROLES.includes(activeRole as UserRole)
      ? (activeRole as UserRole)
      : sanitizedRoles[0]

    const adminSupabase = createAdminSupabaseClient()

    const { error: dbError } = await adminSupabase
      .from('profiles')
      .update({
        role: sanitizedActive,
        roles: sanitizedRoles,
      })
      .eq('id', user.id)

    if (dbError) {
      return NextResponse.json(
        { error: `Gagal memperbarui profil: ${dbError.message}` },
        { status: 500 }
      )
    }

    await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        role: sanitizedActive,
        roles: sanitizedRoles,
      },
    })

    return NextResponse.json({
      success: true,
      role: sanitizedActive,
      roles: sanitizedRoles,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

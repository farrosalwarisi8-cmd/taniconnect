import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const body = await request.json()
    const { roles, activeRole } = body

    if (!roles || !Array.isArray(roles) || !activeRole) {
      return NextResponse.json({ error: 'Parameter roles (array) dan activeRole wajib diisi' }, { status: 400 })
    }

    const SELF_SERVICE_ROLES = ['petani', 'pembeli', 'penyedia_alat']

    if (roles.includes('admin') || activeRole === 'admin') {
      return NextResponse.json(
        { error: 'Akses ditolak. Tidak dapat memberikan peran admin melalui jalur ini.' },
        { status: 403 }
      )
    }

    const validatedRoles = roles.filter((r: string) => SELF_SERVICE_ROLES.includes(r))

    if (validatedRoles.length === 0) {
      return NextResponse.json({ error: 'Minimal pilih 1 peran yang valid' }, { status: 400 })
    }

    if (!validatedRoles.includes(activeRole)) {
      return NextResponse.json({ error: 'Peran aktif tidak terdapat dalam daftar peran' }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()

    // ── DEBUG: Log semua yang dikirim ke Supabase ───────────────────────────
    console.log('[ROLES UPDATE] User ID:', user.id)
    console.log('[ROLES UPDATE] Payload:', { roles: validatedRoles, role: activeRole })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: dbError } = await (adminSupabase.from('profiles') as any)
      .update({ roles: validatedRoles, role: activeRole })
      .eq('id', user.id)
      .select('id, role, roles')

    // ── DEBUG: Log hasil update ─────────────────────────────────────────────
    console.log('[ROLES UPDATE] DB Response — data:', JSON.stringify(data))
    console.log('[ROLES UPDATE] DB Response — error:', JSON.stringify(dbError))

    if (dbError) {
      // Return error asli dari Supabase supaya bisa didebug
      return NextResponse.json(
        {
          error: 'Gagal menyimpan perubahan role',
          details: dbError.message,
          hint: dbError.hint ?? null,
          code: dbError.code ?? null,
        },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: 'Update berhasil tapi tidak ada baris yang berubah. Cek apakah user profile ada di database.',
          userId: user.id,
        },
        { status: 500 }
      )
    }

    // Update metadata auth
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          role: activeRole,
          roles: validatedRoles,
        },
      }
    )

    if (authError) {
      console.warn('[ROLES UPDATE AUTH META ERROR]', authError.message)
    }

    console.log(`[AUDIT] User ${user.id} self-assigned roles: ${validatedRoles.join(',')}, active: ${activeRole}`)

    return NextResponse.json({
      success: true,
      role: activeRole,
      roles: validatedRoles,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server'
    console.error('[ROLES UPDATE UNCAUGHT ERROR]', err)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
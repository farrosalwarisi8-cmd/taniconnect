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

    // Validasi & filter role
    if (roles.includes('admin') || activeRole === 'admin') {
      return NextResponse.json(
        { error: 'Akses ditolak. Tidak dapat memberikan peran admin melalui jalur ini.' },
        { status: 403 }
      )
    }

    const validatedRoles = roles.filter(r => SELF_SERVICE_ROLES.includes(r))

    if (validatedRoles.length === 0) {
      return NextResponse.json({ error: 'Minimal pilih 1 peran yang valid' }, { status: 400 })
    }

    if (!validatedRoles.includes(activeRole)) {
      return NextResponse.json({ error: 'Peran aktif tidak terdapat dalam daftar peran' }, { status: 400 })
    }

    // Gunakan admin service client untuk update tabel profiles dengan bypass RLS
    const adminSupabase = createAdminSupabaseClient()

    // Lakukan update dan wajib select untuk memastikan ada baris yang berubah
    const { data, error: dbError } = await adminSupabase
      .from('profiles')
      .update({ roles: validatedRoles, role: activeRole })
      .eq('id', user.id)
      .select('id, role, roles')

    if (dbError || !data || data.length === 0) {
      return NextResponse.json(
        { error: 'Gagal menyimpan perubahan role, coba lagi' },
        { status: 500 }
      )
    }

    // Update metadata user supaya sinkron dengan middleware
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
      console.warn('[SELF-SERVICE ROLE UPDATE AUTH METADATA ERROR]', authError.message)
    }

    // Audit logs (opsional jika lib/audit.ts ada, tapi dari prompt cukup jika didukung, di sini saya skip atau log saja)
    console.log(`[AUDIT] User ${user.id} self-assigned roles: ${validatedRoles.join(',')}, active: ${activeRole}`);

    return NextResponse.json({
      success: true,
      role: activeRole,
      roles: validatedRoles,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

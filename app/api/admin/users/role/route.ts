import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    // Cek apakah requester adalah admin
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    const requesterMetaRole = user.user_metadata?.role
    const requesterMetaRoles = user.user_metadata?.roles ?? []

    const isRequesterAdmin =
      requesterProfile?.role === 'admin' ||
      (Array.isArray(requesterProfile?.roles) && requesterProfile.roles.includes('admin')) ||
      requesterMetaRole === 'admin' ||
      requesterMetaRoles.includes('admin')

    if (!isRequesterAdmin) {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya admin yang dapat mengubah role user.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { targetUserId, newRole, newRoles } = body

    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { error: 'Parameter targetUserId dan newRole wajib diisi.' },
        { status: 400 }
      )
    }

    const validRoles = ['petani', 'pembeli', 'penyedia_alat', 'admin']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 })
    }

    const updatedRoles = Array.isArray(newRoles) && newRoles.length > 0
      ? newRoles
      : [newRole]

    // Hanya admin yang boleh assign role admin ke user lain
    const assigningAdmin =
      newRole === 'admin' || updatedRoles.includes('admin')

    if (assigningAdmin && !isRequesterAdmin) {
      return NextResponse.json(
        { error: 'Hanya administrator yang dapat memberikan role admin.' },
        { status: 403 }
      )
    }

    // Non-admin tidak boleh menghapus role admin dari user (edge case)
    if (!isRequesterAdmin && updatedRoles.includes('admin')) {
      return NextResponse.json(
        { error: 'Role admin hanya dapat dikelola oleh administrator.' },
        { status: 403 }
      )
    }

    // Gunakan admin service client untuk bypass RLS & update auth metadata
    const adminSupabase = createAdminSupabaseClient()

    // 1. Update DB profiles table
    const { error: dbError } = await adminSupabase
      .from('profiles')
      .update({
        role: newRole,
        roles: updatedRoles,
      })
      .eq('id', targetUserId)

    if (dbError) {
      return NextResponse.json(
        { error: `Gagal memperbarui profil: ${dbError.message}` },
        { status: 500 }
      )
    }

    // 2. Update auth user metadata
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      targetUserId,
      {
        user_metadata: {
          role: newRole,
          roles: updatedRoles,
        },
      }
    )

    if (authError) {
      console.warn('[ADMIN UPDATE AUTH USER METADATA ERROR]', authError.message)
    }

    return NextResponse.json({
      success: true,
      message: `Role user berhasil diubah menjadi ${newRole}`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

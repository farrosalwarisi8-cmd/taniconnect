import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/setup-profile
 * Setup profil awal setelah registrasi (bypass RLS).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const body = await request.json()
    const {
      full_name,
      phone,
      province,
      city,
      district,
      address,
    } = body

    const adminSupabase = createAdminSupabaseClient()

    const profileData = {
      id: user.id,
      full_name: full_name?.trim() || user.user_metadata?.full_name || 'User',
      phone: phone || null,
      province: province || null,
      city: city || null,
      district: district || null,
      address: address || null,
      role: 'pembeli',
      roles: ['pembeli'],
    }

    const { error } = await adminSupabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (error) {
      return NextResponse.json(
        { error: `Gagal setup profil: ${error.message}` },
        { status: 500 }
      )
    }

    await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        role: 'pembeli',
        roles: ['pembeli'],
        full_name: profileData.full_name,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

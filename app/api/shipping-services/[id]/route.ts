import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { shippingServiceUpdateSchema } from '@/lib/validations'
import { clearCacheKey } from '@/lib/cache'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/shipping-services/:id
 * Detail satu layanan pengiriman.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('shipping_services')
      .select('*, owner:profiles!shipping_services_owner_id_fkey(id, full_name, city)')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PATCH /api/shipping-services/:id
 * Update layanan pengiriman. Hanya owner.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    // Verifikasi ownership
    const { data: existing } = await supabase
      .from('shipping_services')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan' }, { status: 404 })
    }

    const existingAny = existing as { owner_id: string }
    if (existingAny.owner_id !== user.id) {
      return NextResponse.json({ error: 'Anda bukan pemilik layanan ini' }, { status: 403 })
    }

    // Parse & validasi body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
    }

    const parsed = shippingServiceUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Validasi gagal'
      return NextResponse.json({ error: firstError, details: parsed.error.issues }, { status: 400 })
    }

    // Build update payload — only include fields that are present
    const updateData: Record<string, unknown> = {}
    if (parsed.data.service_name !== undefined) updateData.service_name = parsed.data.service_name
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null
    if (parsed.data.price_per_km !== undefined) updateData.price_per_km = parsed.data.price_per_km
    if (parsed.data.minimum_cost !== undefined) updateData.minimum_cost = parsed.data.minimum_cost
    if (parsed.data.estimated_delivery !== undefined) updateData.estimated_delivery = parsed.data.estimated_delivery
    if (parsed.data.is_active !== undefined) updateData.is_active = parsed.data.is_active
    if (parsed.data.max_coverage_km !== undefined) updateData.max_coverage_km = parsed.data.max_coverage_km

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })
    }

    const { data: updated, error: dbError } = await supabase
      .from('shipping_services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      console.error('[API /api/shipping-services PATCH] DB Error:', dbError)
      return NextResponse.json({ error: `Gagal memperbarui: ${dbError.message}` }, { status: 500 })
    }

    clearCacheKey('shipping_services')

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * DELETE /api/shipping-services/:id
 * Hapus layanan pengiriman. Hanya owner.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    // Verifikasi ownership
    const { data: existing } = await supabase
      .from('shipping_services')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan' }, { status: 404 })
    }

    const existingAny = existing as { owner_id: string }
    if (existingAny.owner_id !== user.id) {
      return NextResponse.json({ error: 'Anda bukan pemilik layanan ini' }, { status: 403 })
    }

    const { error: dbError } = await supabase
      .from('shipping_services')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('[API /api/shipping-services DELETE] DB Error:', dbError)
      return NextResponse.json({ error: `Gagal menghapus: ${dbError.message}` }, { status: 500 })
    }

    clearCacheKey('shipping_services')

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

/**
 * GET /api/shipping-services/owner/:ownerId
 * Daftar layanan pengiriman milik penjual tertentu.
 * Digunakan di halaman detail produk untuk menampilkan opsi pengiriman.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { ownerId } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('shipping_services')
      .select('id, service_name, description, price_per_km, minimum_cost, estimated_delivery, is_active, owner_role')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API /api/shipping-services/owner] DB Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { shipmentTrackingSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/transactions/:id/tracking
 * Mengambil riwayat tracking pengiriman untuk transaksi tertentu.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const admin = createAdminSupabaseClient()

    // Verifikasi bahwa user adalah pembeli, penjual, atau admin transaksi ini
    const { data: tx } = await admin
      .from('transactions')
      .select('id, buyer_id, seller_id, status, shipping_method')
      .eq('id', id)
      .maybeSingle()

    if (!tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    const isAuthorized =
      tx.buyer_id === user.id ||
      tx.seller_id === user.id ||
      user.user_metadata?.role === 'admin'

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { data: logs, error: logsError } = await admin
      .from('shipment_tracking')
      .select('*, updater:profiles!shipment_tracking_updated_by_fkey(full_name)')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true })

    if (logsError) {
      console.error('[API Tracking GET] DB Error:', logsError)
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    return NextResponse.json({ data: logs ?? [], transaction: tx })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/transactions/:id/tracking
 * Penjual memperbarui status & lokasi pengiriman real-time.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    const admin = createAdminSupabaseClient()

    // Verifikasi bahwa user adalah penjual transaksi ini (atau admin)
    const { data: tx } = await admin
      .from('transactions')
      .select('id, seller_id, status')
      .eq('id', id)
      .maybeSingle()

    if (!tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    if (tx.seller_id !== user.id && user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya penjual yang dapat memperbarui tracking pengiriman' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
    }

    const parsed = shipmentTrackingSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Validasi gagal'
      return NextResponse.json({ error: firstError, details: parsed.error.issues }, { status: 400 })
    }

    // Insert tracking update
    const { data: created, error: insertError } = await admin
      .from('shipment_tracking')
      .insert({
        transaction_id: id,
        status: parsed.data.status,
        location_notes: parsed.data.location_notes.trim(),
        updated_by: user.id,
      })
      .select('*, updater:profiles!shipment_tracking_updated_by_fkey(full_name)')
      .single()

    if (insertError) {
      console.error('[API Tracking POST] DB Error:', insertError)
      return NextResponse.json({ error: `Gagal memperbarui tracking: ${insertError.message}` }, { status: 500 })
    }

    // Sinkronkan status transaksi jika terkirim/dalam perjalanan
    const txStatusMap: Record<string, string> = {
      diproses: 'processed',
      diambil: 'shipped',
      dalam_perjalanan: 'shipped',
      terkirim: 'delivered',
    }

    if (txStatusMap[parsed.data.status]) {
      await admin
        .from('transactions')
        .update({ status: txStatusMap[parsed.data.status] })
        .eq('id', id)
    }

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

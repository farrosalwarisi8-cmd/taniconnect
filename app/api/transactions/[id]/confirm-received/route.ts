import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

/**
 * Konfirmasi barang diterima oleh pembeli.
 *
 * CRITICAL: Escrow release HANYA di server dengan Admin client.
 * Client tidak boleh mengubah escrow_status langsung (dilindungi RLS).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: transactionId } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()

  // Ambil transaksi & validasi
  const { data: tx, error } = await admin
    .from('transactions')
    .select('id, buyer_id, seller_id, status, escrow_status, total_amount')
    .eq('id', transactionId)
    .single()

  if (error || !tx) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Bukan transaksimu' }, { status: 403 })
  }

  // Boleh konfirmasi jika status: paid, processed, shipped, delivered
  const allowedStatuses = ['paid', 'processed', 'shipped', 'delivered']
  if (!allowedStatuses.includes(tx.status)) {
    return NextResponse.json(
      { error: `Tidak bisa konfirmasi pada status "${tx.status}"` },
      { status: 400 }
    )
  }

  if (tx.escrow_status !== 'held') {
    return NextResponse.json(
      { error: 'Escrow sudah tidak dalam status held' },
      { status: 400 }
    )
  }

  // Update: complete + release escrow
  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from('transactions')
    .update({
      status:             'completed',
      escrow_status:      'released',
      escrow_released_at: now,
      confirmed_at:       now,
    })
    .eq('id', transactionId)

  if (updateError) {
    return NextResponse.json({ error: 'Gagal update status' }, { status: 500 })
  }

  // Auto-create financial record untuk penjual (income)
  // Ini yang membuat dashboard keuangan petani auto-sync dengan penjualan
  const { data: product } = await admin
    .from('transactions')
    .select('quantity, price_per_unit, product:products!transactions_product_id_fkey(name, unit)')
    .eq('id', transactionId)
    .single()

  if (product) {
    const prodData = Array.isArray(product.product) ? product.product[0] : product.product
    await admin.from('financial_records').insert({
      farmer_id:      tx.seller_id,
      season_label:   `Musim ${new Date().getFullYear()}`,
      season_year:    new Date().getFullYear(),
      record_type:    'income',
      category:       'penjualan',
      item_name:      prodData?.name ?? 'Penjualan',
      quantity:       product.quantity,
      unit:           prodData?.unit ?? 'kg',
      price_per_unit: product.price_per_unit,
      transaction_id: transactionId,
      recorded_at:    now.split('T')[0],
      notes:          'Otomatis dari marketplace',
    })
  }

  // Audit log
  await logAudit({
    actor_id:      user.id,
    actor_role:    'pembeli',
    action:        'escrow.released',
    resource_type: 'transaction',
    resource_id:   transactionId,
    old_value:     { status: tx.status, escrow_status: 'held' },
    new_value:     { status: 'completed', escrow_status: 'released' },
    notes:         `Dana ${tx.total_amount} diteruskan ke seller ${tx.seller_id}`,
  })

  return NextResponse.json({ status: 'ok' })
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/client'

type TransactionWithProduct = {
  quantity: number
  price_per_unit: number
  product: {
    name: string
    unit: string
  } | Array<{ name: string; unit: string }> | null
}

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

  const { data: txData, error } = await admin
    .from('transactions')
    .select('id, buyer_id, seller_id, status, escrow_status, total_amount')
    .eq('id', transactionId)
    .single()

  const tx = txData as Pick<Tables<'transactions'>,
    'id' | 'buyer_id' | 'seller_id' | 'status' | 'escrow_status' | 'total_amount'
  > | null

  if (error || !tx) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Bukan transaksimu' }, { status: 403 })
  }

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

  const now = new Date().toISOString()

  const updatePayload: TablesUpdate<'transactions'> = {
    status:             'completed',
    escrow_status:      'released',
    escrow_released_at: now,
    confirmed_at:       now,
  }

  const { error: updateError } = await admin
    .from('transactions')
    .update(updatePayload)
    .eq('id', transactionId)

  if (updateError) {
    return NextResponse.json({ error: 'Gagal update status' }, { status: 500 })
  }

  // Auto-create financial_record untuk penjual
  const { data: prodQueryData } = await admin
    .from('transactions')
    .select('quantity, price_per_unit, product:products!transactions_product_id_fkey(name, unit)')
    .eq('id', transactionId)
    .single()

  const prodQuery = prodQueryData as unknown as TransactionWithProduct | null

  if (prodQuery) {
    const prodData = Array.isArray(prodQuery.product) ? prodQuery.product[0] : prodQuery.product

    const financialInsert: TablesInsert<'financial_records'> = {
      farmer_id:      tx.seller_id,
      season_label:   `Musim ${new Date().getFullYear()}`,
      season_year:    new Date().getFullYear(),
      record_type:    'income',
      category:       'penjualan',
      item_name:      prodData?.name ?? 'Penjualan',
      quantity:       prodQuery.quantity,
      unit:           prodData?.unit ?? 'kg',
      price_per_unit: prodQuery.price_per_unit,
      transaction_id: transactionId,
      recorded_at:    now.split('T')[0],
      notes:          'Otomatis dari marketplace',
    }

    await admin.from('financial_records').insert(financialInsert)
  }

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
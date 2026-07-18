import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { verifyMidtransSignature, mapMidtransStatus } from '@/lib/midtrans'
import { logAudit } from '@/lib/audit'
import type { Tables, TablesUpdate } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── 1. VERIFY SIGNATURE ──────────────────────────────────
    const isValid = verifyMidtransSignature({
      order_id:      body.order_id,
      status_code:   body.status_code,
      gross_amount:  body.gross_amount,
      signature_key: body.signature_key,
    })

    if (!isValid) {
      console.error('[MIDTRANS WEBHOOK] Invalid signature', { order_id: body.order_id })
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    const admin = createAdminSupabaseClient()

    // ─── 2. AMBIL PAYMENT ─────────────────────────────────────
    const { data: paymentData, error: paymentError } = await admin
      .from('payments')
      .select('id, transaction_id, status, webhook_processed_at')
      .eq('midtrans_order_id', body.order_id)
      .single()

    const payment = paymentData as Pick<Tables<'payments'>,
      'id' | 'transaction_id' | 'status' | 'webhook_processed_at'
    > | null

    if (paymentError || !payment) {
      console.error('[MIDTRANS WEBHOOK] Payment not found', body.order_id)
      return NextResponse.json({ status: 'not_found' }, { status: 200 })
    }

    // ─── 3. IDEMPOTENCY CHECK ─────────────────────────────────
    const newPaymentStatus = mapMidtransStatus(
      body.transaction_status,
      body.fraud_status
    )

    if (payment.status === newPaymentStatus && payment.webhook_processed_at) {
      return NextResponse.json({ status: 'already_processed' })
    }

    // ─── 4. UPDATE PAYMENT ────────────────────────────────────
    const paymentUpdate: TablesUpdate<'payments'> = {
      status:                  newPaymentStatus,
      midtrans_transaction_id: body.transaction_id,
      payment_type:            body.payment_type,
      paid_at:                 newPaymentStatus === 'settlement' ? new Date().toISOString() : null,
      raw_response:            body,
      webhook_processed_at:    new Date().toISOString(),
    }

    await admin
      .from('payments')
      .update(paymentUpdate)
      .eq('id', payment.id)

    // ─── 5. UPDATE TRANSACTION ────────────────────────────────
    let newTxStatus: 'paid' | 'cancelled' | null = null
    if (newPaymentStatus === 'settlement') {
      newTxStatus = 'paid'
    } else if (['cancel', 'expire'].includes(newPaymentStatus)) {
      newTxStatus = 'cancelled'
    }

    if (newTxStatus) {
      const { data: oldTxData } = await admin
        .from('transactions')
        .select('status, product_id, quantity')
        .eq('id', payment.transaction_id)
        .single()

      const oldTx = oldTxData as Pick<Tables<'transactions'>,
        'status' | 'product_id' | 'quantity'
      > | null

      const txUpdate: TablesUpdate<'transactions'> = { status: newTxStatus }
      await admin
        .from('transactions')
        .update(txUpdate)
        .eq('id', payment.transaction_id)

      // Kurangi stok produk jika payment settlement
      if (newTxStatus === 'paid' && oldTx) {
        const { data: prodData } = await admin
          .from('products')
          .select('stock_quantity')
          .eq('id', oldTx.product_id)
          .single()

        const product = prodData as Pick<Tables<'products'>, 'stock_quantity'> | null

        if (product) {
          const newStock = Math.max(0, product.stock_quantity - oldTx.quantity)
          const prodUpdate: TablesUpdate<'products'> = {
            stock_quantity: newStock,
            status:         newStock === 0 ? 'sold' : 'active',
          }
          await admin
            .from('products')
            .update(prodUpdate)
            .eq('id', oldTx.product_id)
        }
      }

      await logAudit({
        action:        'payment.webhook_processed',
        resource_type: 'transaction',
        resource_id:   payment.transaction_id,
        old_value:     { status: oldTx?.status, payment_status: payment.status },
        new_value:     { status: newTxStatus,   payment_status: newPaymentStatus },
        notes:         `Midtrans: ${body.transaction_status} / ${body.fraud_status ?? '-'}`,
      })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('[MIDTRANS WEBHOOK ERROR]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
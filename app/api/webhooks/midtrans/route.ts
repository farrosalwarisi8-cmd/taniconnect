import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { verifyMidtransSignature, mapMidtransStatus } from '@/lib/midtrans'
import { logAudit } from '@/lib/audit'

/**
 * Webhook Midtrans — dipanggil oleh server Midtrans setiap ada perubahan status.
 *
 * CRITICAL SECURITY:
 * 1. WAJIB verifikasi signature — mencegah callback palsu
 * 2. Idempotent — webhook bisa dipanggil berkali-kali untuk order yang sama
 * 3. Response cepat (< 30 detik) — Midtrans akan retry jika timeout
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── 1. VERIFY SIGNATURE (WAJIB!) ──────────────────────────
    const isValid = verifyMidtransSignature({
      order_id:      body.order_id,
      status_code:   body.status_code,
      gross_amount:  body.gross_amount,
      signature_key: body.signature_key,
    })

    if (!isValid) {
      console.error('[MIDTRANS WEBHOOK] Invalid signature', { order_id: body.order_id })
      // Tetap return 200 agar Midtrans tidak retry — tapi tidak proses apa-apa
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    const admin = createAdminSupabaseClient()

    // ─── 2. AMBIL PAYMENT RECORD ──────────────────────────────
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('id, transaction_id, status, webhook_processed_at')
      .eq('midtrans_order_id', body.order_id)
      .single()

    if (paymentError || !payment) {
      console.error('[MIDTRANS WEBHOOK] Payment not found', body.order_id)
      return NextResponse.json({ status: 'not_found' }, { status: 200 })
    }

    // ─── 3. IDEMPOTENCY CHECK ─────────────────────────────────
    // Jika sudah diproses & status sama, skip
    const newPaymentStatus = mapMidtransStatus(
      body.transaction_status,
      body.fraud_status
    )

    if (payment.status === newPaymentStatus && payment.webhook_processed_at) {
      return NextResponse.json({ status: 'already_processed' })
    }

    // ─── 4. UPDATE PAYMENT ────────────────────────────────────
    await admin
      .from('payments')
      .update({
        status:                  newPaymentStatus,
        midtrans_transaction_id: body.transaction_id,
        payment_type:            body.payment_type,
        paid_at:                 newPaymentStatus === 'settlement' ? new Date().toISOString() : null,
        raw_response:            body,
        webhook_processed_at:    new Date().toISOString(),
      })
      .eq('id', payment.id)

    // ─── 5. UPDATE TRANSACTION STATUS ─────────────────────────
    let newTxStatus: string | null = null
    if (newPaymentStatus === 'settlement') {
      newTxStatus = 'paid'
    } else if (['cancel', 'expire'].includes(newPaymentStatus)) {
      newTxStatus = 'cancelled'
    }

    if (newTxStatus) {
      // Ambil data transaksi lama untuk audit
      const { data: oldTx } = await admin
        .from('transactions')
        .select('status, product_id, quantity')
        .eq('id', payment.transaction_id)
        .single()

      await admin
        .from('transactions')
        .update({ status: newTxStatus as any })
        .eq('id', payment.transaction_id)

      // Jika payment settlement (paid), kurangi stok produk
      if (newTxStatus === 'paid' && oldTx) {
        const { data: product } = await admin
          .from('products')
          .select('stock_quantity')
          .eq('id', oldTx.product_id)
          .single()

        if (product) {
          const newStock = Math.max(0, product.stock_quantity - oldTx.quantity)
          await admin
            .from('products')
            .update({
              stock_quantity: newStock,
              status:         newStock === 0 ? 'sold' : 'active',
            })
            .eq('id', oldTx.product_id)
        }
      }

      // Audit log
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
    // Return 500 supaya Midtrans retry
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { midtransSnap } from '@/lib/midtrans'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const bodySchema = z.object({
  product_id:      z.string().uuid(),
  quantity:        z.number().positive(),
  shipping_method: z.enum(['jne', 'sicepat', 'ambil_sendiri']),
  shipping_cost:   z.number().nonnegative(),
})

export async function POST(req: NextRequest) {
  try {
    // ─── 1. AUTH CHECK ────────────────────────────────────────
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. RATE LIMIT (per user, max 10 req/menit) ───────────
    const rate = checkRateLimit({
      key:         `create-tx:${user.id}`,
      maxRequests: 10,
      windowMs:    60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Tunggu sebentar.' },
        { status: 429 }
      )
    }

    // ─── 3. IDEMPOTENCY CHECK ──────────────────────────────────
    const idempotencyKey = req.headers.get('x-idempotency-key')
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const { data: existing } = await admin
      .from('transactions')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      // Ambil snap token dari payment yang sudah ada
      const { data: payment } = await admin
        .from('payments')
        .select('snap_token')
        .eq('transaction_id', existing.id)
        .maybeSingle()

      if (payment?.snap_token) {
        return NextResponse.json({
          transaction_id: existing.id,
          snap_token:     payment.snap_token,
          idempotent:     true,
        })
      }
    }

    // ─── 4. VALIDATE BODY ──────────────────────────────────────
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.errors },
        { status: 400 }
      )
    }

    // ─── 5. AMBIL DATA PRODUK & VALIDASI ──────────────────────
    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, name, price_per_unit, unit, stock_quantity, seller_id, status')
      .eq('id', parsed.data.product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    if (product.status !== 'active') {
      return NextResponse.json({ error: 'Produk tidak tersedia' }, { status: 400 })
    }

    if (product.seller_id === user.id) {
      return NextResponse.json({ error: 'Tidak bisa membeli produk sendiri' }, { status: 400 })
    }

    if (product.stock_quantity < parsed.data.quantity) {
      return NextResponse.json(
        { error: `Stok tidak cukup. Tersisa ${product.stock_quantity} ${product.unit}` },
        { status: 400 }
      )
    }

    // ─── 6. HITUNG HARGA (server-side!) ───────────────────────
    const subtotal = product.price_per_unit * parsed.data.quantity
    const totalAmount = subtotal + parsed.data.shipping_cost

    // ─── 7. INSERT TRANSACTION ────────────────────────────────
    const { data: transaction, error: txError } = await admin
      .from('transactions')
      .insert({
        buyer_id:         user.id,
        seller_id:        product.seller_id,
        product_id:       product.id,
        quantity:         parsed.data.quantity,
        price_per_unit:   product.price_per_unit,
        subtotal,
        shipping_cost:    parsed.data.shipping_cost,
        total_amount:     totalAmount,
        shipping_method:  parsed.data.shipping_method,
        status:           'pending',
        escrow_status:    'held',
        idempotency_key:  idempotencyKey,
      })
      .select()
      .single()

    if (txError || !transaction) {
      console.error('[TX INSERT ERROR]', txError)
      return NextResponse.json(
        { error: 'Gagal membuat transaksi' },
        { status: 500 }
      )
    }

    // ─── 8. BUAT SNAP TOKEN MIDTRANS ──────────────────────────
    const orderId = `ORDER-${transaction.id}`

    const snapPayload = {
      transaction_details: {
        order_id:     orderId,
        gross_amount: totalAmount,
      },
      item_details: [
        {
          id:       product.id,
          name:     product.name.slice(0, 50),
          price:    product.price_per_unit,
          quantity: parsed.data.quantity,
        },
        ...(parsed.data.shipping_cost > 0 ? [{
          id:       'shipping',
          name:     'Ongkos Kirim',
          price:    parsed.data.shipping_cost,
          quantity: 1,
        }] : []),
      ],
      customer_details: {
        first_name: user.user_metadata?.full_name ?? 'Pembeli',
        email:      user.email,
        phone:      user.user_metadata?.phone,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/pembeli/pesanan`,
      },
    }

    const snapResponse = await midtransSnap.createTransaction(snapPayload)

    // ─── 9. INSERT PAYMENT RECORD ─────────────────────────────
    const { error: paymentError } = await admin.from('payments').insert({
      transaction_id:    transaction.id,
      midtrans_order_id: orderId,
      amount:            totalAmount,
      status:            'pending',
      snap_token:        snapResponse.token,
    })

    if (paymentError) {
      console.error('[PAYMENT INSERT ERROR]', paymentError)
    }

    // ─── 10. AUDIT LOG ────────────────────────────────────────
    await logAudit({
      actor_id:      user.id,
      actor_role:    (user.user_metadata?.role as any) ?? null,
      action:        'transaction.created',
      resource_type: 'transaction',
      resource_id:   transaction.id,
      new_value: {
        product_id:   product.id,
        quantity:     parsed.data.quantity,
        total_amount: totalAmount,
      },
    })

    return NextResponse.json({
      transaction_id: transaction.id,
      snap_token:     snapResponse.token,
      order_id:       orderId,
    })
  } catch (err: any) {
    console.error('[CREATE TX ERROR]', err)
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}
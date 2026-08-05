import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { midtransSnap } from '@/lib/midtrans'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import type { Tables, TablesInsert } from '@/lib/supabase/client'

const bodySchema = z.object({
  product_id:          z.string().uuid(),
  quantity:            z.number().positive(),
  shipping_service_id: z.string().uuid().optional().nullable(),
  shipping_method:     z.string().optional().nullable(),
  shipping_cost:       z.number().nonnegative(),
  distance_km:         z.number().positive().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    // ─── 1. AUTH CHECK ────────────────────────────────────────
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. RATE LIMIT ────────────────────────────────────────
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

    // ─── 3. IDEMPOTENCY CHECK ─────────────────────────────────
    const idempotencyKey = req.headers.get('x-idempotency-key')
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    const { data: existingData } = await admin
      .from('transactions')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    const existing = existingData as Pick<Tables<'transactions'>, 'id'> | null

    if (existing) {
      const { data: paymentData } = await admin
        .from('payments')
        .select('snap_token')
        .eq('transaction_id', existing.id)
        .maybeSingle()

      const payment = paymentData as Pick<Tables<'payments'>, 'snap_token'> | null

      if (payment?.snap_token) {
        return NextResponse.json({
          transaction_id: existing.id,
          snap_token:     payment.snap_token,
          idempotent:     true,
        })
      }
    }

    // ─── 4. VALIDATE BODY ─────────────────────────────────────
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // ─── 5. AMBIL DATA PRODUK ─────────────────────────────────
    const { data: productData, error: productError } = await admin
      .from('products')
      .select('id, name, price_per_unit, unit, stock_quantity, seller_id, status')
      .eq('id', parsed.data.product_id)
      .maybeSingle()

    const product = productData as Pick<Tables<'products'>,
      'id' | 'name' | 'price_per_unit' | 'unit' | 'stock_quantity' | 'seller_id' | 'status'
    > | null

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

    // ─── 6. HITUNG ONGKIR & TOTAL (server-side validation) ────
    let validatedShippingCost = parsed.data.shipping_cost
    let shippingMethodName = parsed.data.shipping_method ?? 'Pengiriman Penjual'

    if (parsed.data.shipping_service_id) {
      const { data: serviceData } = await admin
        .from('shipping_services')
        .select('id, service_name, price_per_km, minimum_cost')
        .eq('id', parsed.data.shipping_service_id)
        .maybeSingle()

      if (serviceData) {
        const service = serviceData as { id: string; service_name: string; price_per_km: number; minimum_cost: number }
        shippingMethodName = service.service_name
        const distance = parsed.data.distance_km ?? 0
        if (distance > 0) {
          validatedShippingCost = Math.max(distance * Number(service.price_per_km), Number(service.minimum_cost))
        } else {
          validatedShippingCost = Number(service.minimum_cost)
        }
      }
    }

    const subtotal = product.price_per_unit * parsed.data.quantity
    const totalAmount = subtotal + validatedShippingCost

    const hasMidtransConfig = Boolean(
      process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY
    )

    if (!hasMidtransConfig) {
      return NextResponse.json(
        { error: 'Pembayaran belum tersedia karena konfigurasi Midtrans belum lengkap.' },
        { status: 503 }
      )
    }

    // ─── 7. INSERT TRANSACTION ────────────────────────────────
    const txInsert: TablesInsert<'transactions'> = {
      buyer_id:         user.id,
      seller_id:        product.seller_id,
      product_id:       product.id,
      quantity:         parsed.data.quantity,
      price_per_unit:   product.price_per_unit,
      subtotal,
      shipping_cost:    validatedShippingCost,
      total_amount:     totalAmount,
      shipping_method:  shippingMethodName,
      status:           'pending',
      escrow_status:    'held',
      idempotency_key:  idempotencyKey,
    }

    const { data: txData, error: txError } = await admin
      .from('transactions')
      .insert(txInsert)
      .select()
      .maybeSingle()

    const transaction = txData as Tables<'transactions'> | null

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
          name:     (product.name ?? 'Produk').slice(0, 50),
          price:    product.price_per_unit,
          quantity: parsed.data.quantity,
        },
        ...(validatedShippingCost > 0 ? [{
          id:       'shipping',
          name:     'Ongkos Kirim',
          price:    validatedShippingCost,
          quantity: 1,
        }] : []),
      ],
      customer_details: {
        first_name: (user.user_metadata?.full_name as string | undefined)?.trim() || 'Pembeli',
        email:      user.email ?? 'pembeli@taniconnect.id',
        phone:      (user.user_metadata?.phone as string | undefined)?.trim() || null,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pembeli/pesanan`,
      },
    }

    let snapToken = ''

    try {
      const snapResponse = await midtransSnap.createTransaction(snapPayload)
      snapToken = snapResponse?.token ?? ''
    } catch (midtransError: any) {
      console.error('[MIDTRANS CREATE ERROR]', midtransError)
    }

    // ─── 9. INSERT PAYMENT ────────────────────────────────────
    const paymentInsert: TablesInsert<'payments'> = {
      transaction_id:    transaction.id,
      midtrans_order_id: orderId,
      amount:            totalAmount,
      status:            'pending',
      snap_token:        snapToken,
    }

    const { error: paymentError } = await admin.from('payments').insert(paymentInsert)

    if (paymentError) {
      console.error('[PAYMENT INSERT ERROR]', paymentError)
    }

    if (!snapToken) {
      return NextResponse.json({
        transaction_id: transaction.id,
        snap_token: null,
        order_id: orderId,
        message: 'Transaksi dibuat, tetapi pembayaran belum tersedia saat ini.',
      })
    }

    // ─── 10. AUDIT LOG ────────────────────────────────────────
    await logAudit({
      actor_id:      user.id,
      actor_role:    (user.user_metadata?.role as 'petani' | 'pembeli' | 'penyedia_alat' | 'admin') ?? null,
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
      snap_token:     snapToken,
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
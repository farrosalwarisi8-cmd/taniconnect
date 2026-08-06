// app/api/cart/route.ts
//
// CRUD endpoint untuk cart items.
// - GET    /api/cart          → list semua item di cart user (dengan info produk)
// - POST   /api/cart          → add/upsert item (kalau sudah ada, tambah qty)
// - PATCH  /api/cart          → update qty item tertentu
// - DELETE /api/cart?id=xxx   → hapus item tertentu (atau ?buyer_id_seller=yyy untuk hapus per grup)
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const addSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int().positive().default(1),
})

const patchSchema = z.object({
  id:       z.string().uuid(),
  quantity: z.number().int().positive(),
})

// ─── GET: list cart items ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Join dengan products + seller profile untuk info lengkap
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      created_at,
      product:products!cart_items_product_id_fkey (
        id,
        name,
        price_per_unit,
        unit,
        stock_quantity,
        image_paths,
        status,
        seller_id,
        seller:profiles!products_seller_id_fkey (
          id,
          full_name,
          city
        )
      )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[CART GET ERROR]', error)
    return NextResponse.json(
      { error: 'Gagal memuat keranjang', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ items: data ?? [] })
}

// ─── POST: add/upsert item ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input tidak valid', details: parsed.error.issues },
      { status: 400 }
    )
  }

  // Verify produk exist, aktif, dan bukan produk sendiri
  const { data: productData } = await supabase
    .from('products')
    .select('id, seller_id, stock_quantity, status')
    .eq('id', parsed.data.product_id)
    .maybeSingle()

  const product = productData as {
    id: string
    seller_id: string
    stock_quantity: number
    status: string
  } | null

  if (!product) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  }
  if (product.status !== 'active') {
    return NextResponse.json({ error: 'Produk tidak tersedia' }, { status: 400 })
  }
  if (product.seller_id === user.id) {
    return NextResponse.json({ error: 'Tidak bisa menambah produk sendiri ke keranjang' }, { status: 400 })
  }

  // Cek qty existing di cart supaya total qty tidak lebih dari stock
  const { data: existingData } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('buyer_id', user.id)
    .eq('product_id', parsed.data.product_id)
    .maybeSingle()

  const existing = existingData as { quantity: number } | null
  const currentQty = existing?.quantity ?? 0
  const newQty = currentQty + parsed.data.quantity

  if (newQty > product.stock_quantity) {
    return NextResponse.json(
      {
        error: `Stok tidak cukup. Tersedia ${product.stock_quantity}, di keranjang sudah ada ${currentQty}.`,
      },
      { status: 400 }
    )
  }

  // Upsert — aman karena UNIQUE(buyer_id, product_id) jelas.
  // Beda dari kasus bug profiles: di sini payload lengkap & constraint jelas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upserted, error: upsertError } = await (supabase.from('cart_items') as any)
    .upsert(
      {
        buyer_id:   user.id,
        product_id: parsed.data.product_id,
        quantity:   newQty,
      },
      { onConflict: 'buyer_id,product_id' }
    )
    .select('id, quantity')
    .maybeSingle()

  if (upsertError) {
    console.error('[CART POST ERROR]', upsertError)
    return NextResponse.json(
      { error: 'Gagal menambah ke keranjang', details: upsertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, item: upserted })
}

// ─── PATCH: update quantity ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input tidak valid', details: parsed.error.issues },
      { status: 400 }
    )
  }

  // Verify item milik user & cek stok
  const { data: itemData } = await supabase
    .from('cart_items')
    .select('id, buyer_id, product_id, product:products!cart_items_product_id_fkey(stock_quantity, status)')
    .eq('id', parsed.data.id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = itemData as any
  if (!item || item.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
  }

  const stockQty = Array.isArray(item.product) ? item.product[0]?.stock_quantity : item.product?.stock_quantity
  if (parsed.data.quantity > stockQty) {
    return NextResponse.json(
      { error: `Stok maksimum ${stockQty}` },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('cart_items') as any)
    .update({ quantity: parsed.data.quantity })
    .eq('id', parsed.data.id)
    .eq('buyer_id', user.id) // defense in depth

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ─── DELETE: hapus item(s) ────────────────────────────────────────────────────
// Query params:
//   ?id=xxx           → hapus 1 item
//   ?seller_id=xxx    → hapus semua item dari seller tertentu (untuk clear-after-checkout)
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const itemId = url.searchParams.get('id')
  const sellerId = url.searchParams.get('seller_id')

  if (itemId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('buyer_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (sellerId) {
    // Hapus semua cart item milik user yang product-nya dari seller_id tsb.
    // Karena tabel cart_items tidak simpan seller_id langsung, kita perlu subquery.
    // Cara aman: fetch dulu product_id yang matching, lalu delete.
    const { data: productsData } = await supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productIds = ((productsData as any[]) ?? []).map(p => p.id)
    if (productIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const { error, count } = await supabase
      .from('cart_items')
      .delete({ count: 'exact' })
      .eq('buyer_id', user.id)
      .in('product_id', productIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, deleted: count ?? 0 })
  }

  return NextResponse.json({ error: 'Missing id or seller_id' }, { status: 400 })
}
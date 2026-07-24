import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params
  const { amount } = await req.json()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()

  // 1. Cek produk & waktu lelang
  const { data: product } = await admin
    .from('products')
    .select('is_auction, auction_end_time, current_bid, price_per_unit, min_bid_increment')
    .eq('id', productId)
    .single()

  if (!product?.is_auction) return NextResponse.json({ error: 'Bukan produk lelang' }, { status: 400 })
  if (new Date(product.auction_end_time!) < new Date()) return NextResponse.json({ error: 'Lelang sudah berakhir' }, { status: 400 })

  const minBid = (product.current_bid || product.price_per_unit) + (product.min_bid_increment || 1000)
  if (amount < minBid) return NextResponse.json({ error: `Tawaran minimal ${minBid}` }, { status: 400 })

  // 2. Update Bid
  const { error } = await admin
    .from('products')
    .update({ current_bid: amount } as any)
    .eq('id', productId)

  if (error) return NextResponse.json({ error: 'Gagal mengajukan tawaran' }, { status: 500 })

  await logAudit({
    actor_id: user.id,
    action: 'product.bid_placed',
    resource_type: 'product',
    resource_id: productId,
    new_value: { amount }
  })

  return NextResponse.json({ status: 'ok' })
}
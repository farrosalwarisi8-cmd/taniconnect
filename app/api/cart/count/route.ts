// app/api/cart/count/route.ts
//
// Endpoint ringan khusus untuk badge navbar.
// Return { count: number } — tidak fetch data produk, hanya count baris.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  const { count, error } = await supabase
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('buyer_id', user.id)

  if (error) {
    console.error('[CART COUNT ERROR]', error)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
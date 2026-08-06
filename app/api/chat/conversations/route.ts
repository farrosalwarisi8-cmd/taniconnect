// app/api/chat/conversations/route.ts
//
// - POST /api/chat/conversations
//     body: { seller_id: uuid, product_id?: uuid }
//     Find-or-create conversation antara current user (as buyer) dan seller.
//     Return: { conversation_id }
//
// - GET /api/chat/conversations
//     List semua conversations milik current user (baik sebagai buyer/seller).
//     Return: { conversations: [...] }
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  seller_id:  z.string().uuid(),
  product_id: z.string().uuid().optional().nullable(),
})

// ─── POST: find-or-create conversation ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input tidak valid', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { seller_id, product_id } = parsed.data

  if (seller_id === user.id) {
    return NextResponse.json(
      { error: 'Tidak bisa memulai chat dengan diri sendiri' },
      { status: 400 }
    )
  }

  // Verify seller exists
  const { data: sellerData } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', seller_id)
    .maybeSingle()

  if (!sellerData) {
    return NextResponse.json({ error: 'Penjual tidak ditemukan' }, { status: 404 })
  }

  // Find existing conversation
  // Karena UNIQUE(buyer_id, seller_id, product_id), triplet ini unik.
  // Note: kalau product_id NULL, matching-nya juga harus dengan IS NULL,
  // bukan = NULL (karena SQL NULL semantics)
  let existingQuery = supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('seller_id', seller_id)

  if (product_id) {
    existingQuery = existingQuery.eq('product_id', product_id)
  } else {
    existingQuery = existingQuery.is('product_id', null)
  }

  const { data: existingData } = await existingQuery.maybeSingle()

  if (existingData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ conversation_id: (existingData as any).id, created: false })
  }

  // Create new conversation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newData, error: insertError } = await (supabase.from('conversations') as any)
    .insert({
      buyer_id:   user.id,
      seller_id,
      product_id: product_id ?? null,
    })
    .select('id')
    .maybeSingle()

  if (insertError) {
    console.error('[CONVERSATIONS POST ERROR]', insertError)
    return NextResponse.json(
      { error: 'Gagal membuat conversation', details: insertError.message },
      { status: 500 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ conversation_id: (newData as any).id, created: true })
}

// ─── GET: list conversations user ─────────────────────────────────────────────
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch conversations dimana user adalah buyer ATAU seller
  // Join dengan profiles untuk info lawan bicara + products untuk context
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      buyer_id,
      seller_id,
      product_id,
      last_message,
      last_message_at,
      created_at,
      updated_at,
      buyer:profiles!conversations_buyer_id_fkey (id, full_name, avatar_storage_path),
      seller:profiles!conversations_seller_id_fkey (id, full_name, avatar_storage_path),
      product:products!conversations_product_id_fkey (id, name, image_paths)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[CONVERSATIONS GET ERROR]', error)
    return NextResponse.json(
      { error: 'Gagal memuat percakapan', details: error.message },
      { status: 500 }
    )
  }

  // Hitung unread count per conversation untuk current user
  // (pesan dari lawan bicara yang belum dibaca)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationIds = ((data as any[]) ?? []).map(c => c.id)

  let unreadMap: Map<string, number> = new Map()
  if (conversationIds.length > 0) {
    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id) // pesan dari lawan bicara

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((unreadData as any[]) ?? []).forEach(m => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1)
    })
  }

  // Normalize: tag "otherParty" (lawan bicara) untuk memudahkan UI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversations = ((data as any[]) ?? []).map(c => {
    const buyer = Array.isArray(c.buyer) ? c.buyer[0] : c.buyer
    const seller = Array.isArray(c.seller) ? c.seller[0] : c.seller
    const product = Array.isArray(c.product) ? c.product[0] : c.product

    const isCurrentUserBuyer = c.buyer_id === user.id
    const otherParty = isCurrentUserBuyer ? seller : buyer

    return {
      id:              c.id,
      buyer_id:        c.buyer_id,
      seller_id:       c.seller_id,
      product_id:      c.product_id,
      last_message:    c.last_message,
      last_message_at: c.last_message_at,
      created_at:      c.created_at,
      role_in_convo:   isCurrentUserBuyer ? 'buyer' : 'seller',
      other_party: {
        id:        otherParty?.id ?? null,
        full_name: otherParty?.full_name ?? 'Pengguna',
      },
      product: product ? {
        id:          product.id,
        name:        product.name,
        image_path:  (product.image_paths ?? [])[0] ?? null,
      } : null,
      unread_count: unreadMap.get(c.id) ?? 0,
    }
  })

  return NextResponse.json({ conversations })
}
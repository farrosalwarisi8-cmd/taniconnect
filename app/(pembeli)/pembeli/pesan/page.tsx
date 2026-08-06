// app/(pembeli)/pembeli/pesan/page.tsx
//
// Inbox — daftar semua percakapan untuk role pembeli
// Fetch pakai API /api/chat/conversations
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { InboxClient, type ConversationView } from './_components/InboxClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pesan Saya',
}

export default async function PesanPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/pembeli/pesan')

  // Fetch conversations langsung (bukan via API — biar 1 round trip)
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
      seller:profiles!conversations_seller_id_fkey (id, full_name),
      buyer:profiles!conversations_buyer_id_fkey (id, full_name),
      product:products!conversations_product_id_fkey (id, name)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[PESAN PAGE ERROR]', error)
  }

  // Unread count per convo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convos = ((data as any[]) ?? [])
  const convoIds = convos.map(c => c.id)

  let unreadMap = new Map<string, number>()
  if (convoIds.length > 0) {
    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convoIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((unreadData as any[]) ?? []).forEach(m => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1)
    })
  }

  const conversations: ConversationView[] = convos.map(c => {
    const buyer = Array.isArray(c.buyer) ? c.buyer[0] : c.buyer
    const seller = Array.isArray(c.seller) ? c.seller[0] : c.seller
    const product = Array.isArray(c.product) ? c.product[0] : c.product

    const isMeBuyer = c.buyer_id === user.id
    const other = isMeBuyer ? seller : buyer

    return {
      id:              c.id,
      other_name:      other?.full_name ?? 'Pengguna',
      other_initial:   (other?.full_name?.[0] ?? '?').toUpperCase(),
      role_label:      isMeBuyer ? 'Penjual' : 'Pembeli',
      last_message:    c.last_message ?? null,
      last_message_at: c.last_message_at ?? c.created_at,
      product_name:    product?.name ?? null,
      unread_count:    unreadMap.get(c.id) ?? 0,
    }
  })

  return <InboxClient conversations={conversations} />
}
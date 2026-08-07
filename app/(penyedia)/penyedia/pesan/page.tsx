// app/(penyedia)/penyedia/pesan/page.tsx
//
// Halaman inbox pesan untuk role penyedia_alat.
// Menampilkan semua conversation dimana penyedia terlibat
// (sebagai seller — pembeli menghubungi alat/produk mereka).
//
// Reuse InboxClient dari pembeli — komponen sudah generic,
// hanya butuh data `ConversationView[]` yang sama bentuknya.

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { InboxClient, type ConversationView } from '@/app/(pembeli)/pembeli/pesan/_components/InboxClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pesan Saya — Penyedia' }

export default async function PenyediaPesanPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/penyedia/pesan')

  // Verifikasi role — jaga-jaga kalau ada akses langsung via URL
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'penyedia_alat') {
    redirect('/')
  }

  // Query conversations dimana penyedia ini terlibat.
  // Pola: sama persis dengan petani — keduanya bisa jadi seller
  // maupun buyer di sistem ini, jadi kita tampilkan keduanya.
  const { data } = await supabase
    .from('conversations')
    .select(`
      id, buyer_id, seller_id, product_id, last_message, last_message_at, created_at,
      seller:profiles!conversations_seller_id_fkey (id, full_name),
      buyer:profiles!conversations_buyer_id_fkey (id, full_name),
      product:products!conversations_product_id_fkey (id, name)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convos = ((data as any[]) ?? [])
  const convoIds = convos.map(c => c.id)

  // Hitung unread per conversation
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

  // Transform ke format ConversationView yang dipakai InboxClient
  const conversations: ConversationView[] = convos.map(c => {
    const buyer   = Array.isArray(c.buyer)   ? c.buyer[0]   : c.buyer
    const seller  = Array.isArray(c.seller)  ? c.seller[0]  : c.seller
    const product = Array.isArray(c.product) ? c.product[0] : c.product

    // "other" = lawan bicara kita
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header — meniru pola halaman lain di dashboard penyedia */}
      <div className="mb-6">
        <h1
          className="text-fg-dark leading-tight mb-1"
          style={{
            fontFamily: "'Bricolage Grotesque', ui-sans-serif",
            fontSize: 'clamp(22px, 4vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          💬 Pesan Saya
        </h1>
        <p className="text-fg/60 text-sm">
          Semua percakapan dengan pembeli yang menghubungi produk Anda
        </p>
      </div>

      <InboxClient conversations={conversations} />
    </div>
  )
}
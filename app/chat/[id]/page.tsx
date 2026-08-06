// app/chat/[id]/page.tsx
//
// Halaman percakapan (unified untuk buyer + seller).
// URL: /chat/{conversation_id}
//
// Server Component untuk:
// - Fetch conversation info + verify user adalah participant
// - Fetch initial messages (server-rendered)
// - Redirect kalau user bukan participant
//
// Realtime + input pesan di-handle oleh ChatClient (client component).
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ChatClient, type MessageView } from './_components/ChatClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: Props) {
  const { id: conversationId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=/chat/${conversationId}`)
  }

  // Fetch conversation + verify participant
  const { data: convoData, error: convoError } = await supabase
    .from('conversations')
    .select(`
      id,
      buyer_id,
      seller_id,
      product_id,
      created_at,
      buyer:profiles!conversations_buyer_id_fkey (id, full_name),
      seller:profiles!conversations_seller_id_fkey (id, full_name),
      product:products!conversations_product_id_fkey (id, name, image_paths, price_per_unit, unit)
    `)
    .eq('id', conversationId)
    .maybeSingle()

  if (convoError || !convoData) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo = convoData as any

  // Participant check (defense-in-depth — RLS juga sudah cek ini)
  const isBuyer = convo.buyer_id === user.id
  const isSeller = convo.seller_id === user.id
  if (!isBuyer && !isSeller) {
    redirect('/unauthorized')
  }

  const buyer = Array.isArray(convo.buyer) ? convo.buyer[0] : convo.buyer
  const seller = Array.isArray(convo.seller) ? convo.seller[0] : convo.seller
  const product = Array.isArray(convo.product) ? convo.product[0] : convo.product

  const otherParty = isBuyer ? seller : buyer

  // Fetch initial messages
  const { data: messagesData } = await supabase
    .from('messages')
    .select('id, created_at, conversation_id, sender_id, text, image_url, is_read')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialMessages: MessageView[] = ((messagesData as any[]) ?? []).map(m => ({
    id:              m.id,
    created_at:      m.created_at,
    conversation_id: m.conversation_id,
    sender_id:       m.sender_id,
    text:            m.text,
    image_url:       m.image_url,
    is_read:         m.is_read,
  }))

  // Determine "back" URL berdasarkan role
  const backHref = isBuyer ? '/pembeli/pesan' : '/dashboard-pesan'
  const productImage = product?.image_paths?.[0] ?? null
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const productImageUrl = productImage
    ? (productImage.startsWith('http')
      ? productImage
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${productImage}`)
    : null

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="text-gray-500 hover:text-primary-dark text-lg min-h-0 touch-target-exempt"
            aria-label="Kembali"
          >
            ←
          </Link>

          {/* Avatar lawan bicara */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(otherParty?.full_name?.[0] ?? '?').toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">
              {otherParty?.full_name ?? 'Pengguna'}
            </p>
            <p className="text-[11px] text-gray-500">
              {isBuyer ? 'Penjual' : 'Pembeli'}
            </p>
          </div>
        </div>

        {/* Product context (kalau chat tentang produk tertentu) */}
        {product && (
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <Link
              href={`/pembeli/produk/${product.id}`}
              className="flex items-center gap-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors min-h-0"
            >
              {productImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productImageUrl}
                  alt={product.name}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Chat tentang produk:</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {product.name}
                </p>
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </Link>
          </div>
        )}
      </header>

      {/* Messages */}
      <ChatClient
        conversationId={conversationId}
        currentUserId={user.id}
        initialMessages={initialMessages}
      />
    </main>
  )
}
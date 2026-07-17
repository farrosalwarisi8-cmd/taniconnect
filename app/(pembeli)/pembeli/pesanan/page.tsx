import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID, TRANSACTION_STATUS_LABELS } from '@/lib/utils'
import { ConfirmReceivedButton } from './_components/ConfirmReceivedButton'

export default async function PesananPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/pembeli/pesanan')

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, created_at, status, escrow_status, quantity, total_amount,
      product:products!transactions_product_id_fkey(id, name, image_paths, unit),
      seller:profiles!transactions_seller_id_fkey(full_name)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  const list = transactions ?? []

  return (
    <main className="min-h-screen bg-surface-light pb-24">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center min-h-0"
            aria-label="Kembali"
          >
            ←
          </Link>
          <h1 className="text-h2 text-fg-dark">Pesanan Saya</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {list.length === 0 && (
          <div className="bg-white rounded-DEFAULT border border-border p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-h2 text-fg-dark mb-2">Belum ada pesanan</h2>
            <p className="text-body text-fg/60 mb-6">Yuk mulai jelajah marketplace!</p>
            <Link
              href="/pembeli/marketplace"
              className="inline-block bg-primary text-white font-medium rounded-sm px-6 py-3 min-h-[48px]"
            >
              Ke Marketplace
            </Link>
          </div>
        )}

        {list.map(tx => {
          const product = Array.isArray(tx.product) ? tx.product[0] : tx.product
          const seller  = Array.isArray(tx.seller) ? tx.seller[0] : tx.seller
          const statusInfo = TRANSACTION_STATUS_LABELS[tx.status] ?? { label: tx.status, variant: 'neutral' as const }
          const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

          const firstImage = product?.image_paths?.[0]
          const imageUrl = firstImage
            ? (firstImage.startsWith('http')
                ? firstImage
                : `${SUPABASE_URL}/storage/v1/object/public/product-images/${firstImage}`)
            : null

          return (
            <div key={tx.id} className="bg-white rounded-DEFAULT border border-border p-4 sm:p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between text-caption text-fg/60">
                <span>ID: {tx.id.slice(0, 8).toUpperCase()}</span>
                <span>{formatDateID(tx.created_at)}</span>
              </div>

              {/* Produk */}
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-sm bg-surface-light shrink-0 overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-h4 text-fg-dark line-clamp-2">{product?.name}</h3>
                  <p className="text-caption text-fg/60">
                    {tx.quantity} {product?.unit} · dari {seller?.full_name}
                  </p>
                  <p className="text-h4 text-primary-dark font-bold mt-1">{formatRupiah(tx.total_amount)}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <Badge variant={statusInfo.variant} size="md">{statusInfo.label}</Badge>

                {/* Aksi konfirmasi penerimaan (hanya jika status delivered) */}
                {tx.status === 'delivered' && tx.escrow_status === 'held' && (
                  <ConfirmReceivedButton transactionId={tx.id} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
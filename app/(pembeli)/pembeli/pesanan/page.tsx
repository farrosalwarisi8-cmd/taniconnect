import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID, TRANSACTION_STATUS_LABELS } from '@/lib/utils'
import { ConfirmReceivedButton } from './_components/ConfirmReceivedButton'

type TransactionWithRelations = {
  id: string
  created_at: string
  status: string
  escrow_status: string
  quantity: number
  price_per_unit: number
  total_amount: number
  product: {
    id: string
    name: string
    image_paths: string[]
    unit: string
  } | Array<{
    id: string
    name: string
    image_paths: string[]
    unit: string
  }> | null
  seller: {
    id: string
    full_name: string
  } | Array<{ id: string; full_name: string }> | null
}

const STATUS_TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'paid', label: 'Dibayar' },
  { key: 'shipped', label: 'Dikirim' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
]

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PesananPage({ searchParams }: Props) {
  const params = await searchParams
  const activeStatus = params.status ?? 'semua'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/pembeli/pesanan')

  let query = supabase
    .from('transactions')
    .select(`
      id, created_at, status, escrow_status, quantity, price_per_unit, total_amount,
      product:products!transactions_product_id_fkey(id, name, image_paths, unit),
      seller:profiles!transactions_seller_id_fkey(id, full_name)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (activeStatus !== 'semua') {
    query = (query as any).eq('status', activeStatus)
  }

  const { data } = await query

  const list = (data ?? []) as unknown as TransactionWithRelations[]

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

  function getImageUrl(path: string): string {
    if (path.startsWith('http')) return path
    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9] pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/pembeli/marketplace"
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-semibold transition-colors min-h-0 touch-target-exempt"
              aria-label="Kembali"
            >
              ←
            </Link>
            <div>
              <h1 className="text-[20px] font-bold text-gray-900">Pesanan Saya</h1>
              <p className="text-[12px] text-gray-500">Lacak semua transaksi kamu</p>
            </div>
            <Link
              href="/pembeli/profil"
              className="ml-auto w-10 h-10 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold transition-colors min-h-0 touch-target-exempt"
              aria-label="Profil saya"
            >
              👤
            </Link>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            {STATUS_TABS.map(tab => (
              <Link
                key={tab.key}
                href={tab.key === 'semua' ? '/pembeli/pesanan' : `/pembeli/pesanan?status=${tab.key}`}
                className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold rounded-t-xl transition-all min-h-0 touch-target-exempt border-b-2 ${
                  activeStatus === tab.key
                    ? 'text-green-700 border-green-600 bg-green-50/50'
                    : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-3">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="font-bold text-gray-900 text-[18px] mb-2">Tidak ada pesanan</h3>
            <p className="text-gray-500 text-[14px] mb-6">
              {activeStatus === 'semua'
                ? 'Kamu belum pernah melakukan pembelian.'
                : `Tidak ada pesanan dengan status "${STATUS_TABS.find(t => t.key === activeStatus)?.label}".`}
            </p>
            <Link
              href="/pembeli/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-[14px] rounded-xl transition-colors shadow-sm min-h-0 touch-target-exempt"
            >
              🛒 Mulai Belanja
            </Link>
          </div>
        ) : (
          list.map(tx => {
            const product = Array.isArray(tx.product) ? tx.product[0] : tx.product
            const seller = Array.isArray(tx.seller) ? tx.seller[0] : tx.seller
            const statusInfo = TRANSACTION_STATUS_LABELS[tx.status] ?? { label: tx.status, variant: 'neutral' as const }
            const firstImage = product?.image_paths?.[0]
            const imageUrl = firstImage ? getImageUrl(firstImage) : null

            return (
              <div key={tx.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Order header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                  <div>
                    <p className="font-semibold text-gray-900 text-[13px]">
                      #{tx.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatDateID(tx.created_at, 'long')}
                    </p>
                  </div>
                  <Badge variant={statusInfo.variant} size="sm">
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Product info */}
                <div className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product?.name ?? 'Produk'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-[14px] line-clamp-1">
                      {product?.name ?? 'Produk'}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {tx.quantity} {product?.unit ?? 'unit'} × {formatRupiah(tx.price_per_unit)}
                    </p>
                    {seller && (
                      <Link
                        href={`/pembeli/penjual/${seller.id}`}
                        className="text-[12px] text-green-600 font-medium hover:underline min-h-0 touch-target-exempt"
                      >
                        🌿 {seller.full_name}
                      </Link>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-[15px]">{formatRupiah(tx.total_amount)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Total</p>
                  </div>
                </div>

                {/* Action buttons */}
                {tx.status === 'delivered' && tx.escrow_status === 'held' && (
                  <div className="px-4 pb-4">
                    <ConfirmReceivedButton transactionId={tx.id} />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CheckoutClient } from './_components/CheckoutClient'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, CATEGORY_LABELS, getDisplayName, getInitials, getFirstName } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

// Type manual untuk hasil query dengan join
type SellerData = {
  id: string
  full_name: string
  city: string | null
  rating_avg: number | null
  rating_count: number | null
  is_verified: boolean
}

type ProductWithSeller = {
  id: string
  name: string
  category: 'sayuran' | 'buah' | 'beras_padi' | 'rempah' | 'lainnya'
  description: string | null
  price_per_unit: number
  unit: string
  stock_quantity: number
  image_paths: string[]
  province: string | null
  city: string | null
  is_auction: boolean
  current_bid: number | null
  auction_end_time: string | null
  harvest_date: string | null
  seller_id: string
  seller: SellerData | SellerData[] | null
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, category, description, price_per_unit, unit, stock_quantity,
      image_paths, province, city, is_auction, current_bid, auction_end_time,
      harvest_date, seller_id,
      seller:profiles!products_seller_id_fkey(
        id, full_name, city, rating_avg, rating_count, is_verified
      )
    `)
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  const product = data as ProductWithSeller | null
  if (error || !product) notFound()

  const seller = Array.isArray(product.seller) ? product.seller[0] : product.seller

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const images = (product.image_paths || []).map((p: string) =>
    p.startsWith('http')
      ? p
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${p}`
  )

  return (
    <main className="min-h-screen bg-white pb-32 sm:pb-8">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-nav border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/pembeli/marketplace"
            className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-surface-light min-h-0"
            aria-label="Kembali ke marketplace"
          >
            ←
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-surface-light min-h-0"
              aria-label="Bagikan"
            >
              🔗
            </button>
            <button
              type="button"
              className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-surface-light min-h-0"
              aria-label="Simpan ke wishlist"
            >
              ♡
            </button>
          </div>
        </div>
      </header>

      <div className="relative aspect-square sm:aspect-video bg-surface-light">
        {images[0] ? (
          <img src={images[0]} alt={getDisplayName(product.name, 'Produk')} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🌾</div>
        )}

        {seller?.is_verified && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="verified" size="md">✓ Penjual Terverifikasi</Badge>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="neutral" size="sm">
              {CATEGORY_LABELS[product.category] ?? product.category}
            </Badge>
            {product.stock_quantity > 0 && (
              <Badge variant="success" size="sm">
                Stok: {product.stock_quantity} {product.unit}
              </Badge>
            )}
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-fg-dark leading-tight mb-3">
            {getDisplayName(product.name, 'Produk')}
          </h1>
          <div className="flex items-baseline gap-2">
            <span className="text-[36px] sm:text-[44px] font-extrabold text-primary-dark leading-none" style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}>
              {formatRupiah(product.price_per_unit)}
            </span>
            <span className="text-body text-fg/60">/ {product.unit}</span>
          </div>
          {product.city && (
            <p className="text-body text-fg/70 mt-2">📍 {product.city}, {product.province}</p>
          )}
        </div>

        {seller && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            {/* Seller card header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3 border-b border-gray-100">
              <p className="text-[12px] font-semibold text-green-800 uppercase tracking-wide">Dijual oleh</p>
            </div>
            <div className="p-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 text-green-800 flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
                {getInitials(seller.full_name, 'P')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 text-[15px] truncate">{getDisplayName(seller.full_name, 'Penjual')}</p>
                  {seller.is_verified && (
                    <span className="bg-green-100 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      ✓ Terverifikasi
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`text-[14px] ${i <= Math.round(seller.rating_avg ?? 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-[13px] text-gray-600 font-medium">
                    {seller.rating_avg?.toFixed(1) ?? '—'}
                  </span>
                  <span className="text-[12px] text-gray-400">
                    ({seller.rating_count ?? 0} ulasan)
                  </span>
                </div>

                {seller.city && (
                  <p className="text-[12px] text-gray-500 mt-0.5">📍 {seller.city}</p>
                )}
              </div>

              {/* CTA */}
              <Link
                href={`/pembeli/penjual/${seller.id}`}
                className="shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-[12px] rounded-xl transition-colors shadow-sm min-h-0 touch-target-exempt"
              >
                Lihat Profil →
              </Link>
            </div>
          </div>
        )}

        {product.description && (
          <div>
            <h2 className="text-h2 text-fg-dark mb-2">Tentang Produk</h2>
            <p className="text-body text-fg whitespace-pre-line">{product.description}</p>
          </div>
        )}

        <CheckoutClient
          productId={product.id}
          productName={product.name}
          pricePerUnit={product.price_per_unit}
          unit={product.unit}
          maxQuantity={product.stock_quantity}
          isAuction={product.is_auction}
          currentBid={product.current_bid}
        />
      </div>
    </main>
  )
}
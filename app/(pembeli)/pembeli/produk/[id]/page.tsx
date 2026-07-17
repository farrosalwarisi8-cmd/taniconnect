import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CheckoutClient } from './_components/CheckoutClient'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: product, error } = await supabase
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
    .single()

  if (error || !product) notFound()

  const seller = Array.isArray(product.seller) ? product.seller[0] : product.seller

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const images = (product.image_paths || []).map(p =>
    p.startsWith('http')
      ? p
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${p}`
  )

  return (
    <main className="min-h-screen bg-white pb-32 sm:pb-8">
      {/* Header dengan back button */}
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

      {/* Gambar hero */}
      <div className="relative aspect-square sm:aspect-video bg-surface-light">
        {images[0] ? (
          <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🌾</div>
        )}

        {seller?.is_verified && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="verified" size="md">✓ Penjual Terverifikasi</Badge>
          </div>
        )}
      </div>

      {/* Info produk */}
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
            {product.name}
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

        {/* Info penjual */}
        {seller && (
          <div className="bg-surface-light rounded-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-light text-primary-dark flex items-center justify-center font-semibold shrink-0">
              {seller.full_name?.[0]?.toUpperCase() ?? 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-fg-dark truncate">{seller.full_name}</p>
              <p className="text-caption text-fg/60">
                {seller.is_verified && '✓ Terverifikasi · '}
                ⭐ {seller.rating_avg?.toFixed(1) ?? '—'} ({seller.rating_count ?? 0} ulasan)
              </p>
            </div>
          </div>
        )}

        {/* Deskripsi */}
        {product.description && (
          <div>
            <h2 className="text-h2 text-fg-dark mb-2">Tentang Produk</h2>
            <p className="text-body text-fg whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Client Component: form pembelian + Midtrans Snap */}
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
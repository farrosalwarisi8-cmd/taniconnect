import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProductImageGallery } from './_components/ProductImageGallery'
import { CheckoutClient } from './_components/CheckoutClient'
import { formatRupiah, CATEGORY_LABELS, getDisplayName, getInitials } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

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

  const ratingAvg = seller?.rating_avg ?? 0
  const ratingCount = seller?.rating_count ?? 0
  const inStock = product.stock_quantity > 0

  return (
    <main className="min-h-screen bg-[#f5f5f5] pb-24 lg:pb-8">
      {/* Breadcrumb / Header — ala Shopee */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="text-gray-500 hover:text-[#ee4d2d] text-sm flex items-center gap-1 min-h-0"
          >
            ← Marketplace
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 truncate">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* Main card — 2 kolom ala Shopee */}
        <div className="bg-white rounded-sm shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[420px_1fr] gap-0">
            {/* Kiri: Galeri foto */}
            <div className="p-4 lg:p-6 lg:border-r border-gray-100">
              <ProductImageGallery
                images={images}
                productName={getDisplayName(product.name, 'Produk')}
              />
            </div>

            {/* Kanan: Info produk */}
            <div className="p-4 lg:p-6 flex flex-col">
              {/* Nama produk */}
              <h1 className="text-xl lg:text-2xl font-medium text-gray-900 leading-snug mb-3">
                {getDisplayName(product.name, 'Produk')}
              </h1>

              {/* Rating & lokasi */}
              <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-1">
                  <span className="text-[#ee4d2d] font-semibold text-sm border-b border-[#ee4d2d]">
                    {ratingAvg.toFixed(1)}
                  </span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span
                        key={i}
                        className={`text-sm ${i <= Math.round(ratingAvg) ? 'text-[#ee4d2d]' : 'text-gray-200'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm ml-1">
                    | {ratingCount} Penilaian
                  </span>
                </div>
                {product.city && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">
                      📍 {product.city}{product.province ? `, ${product.province}` : ''}
                    </span>
                  </>
                )}
              </div>

              {/* Harga — orange Shopee style */}
              <div className="bg-[#fafafa] px-4 py-3 mb-4 flex items-baseline gap-2">
                <span className="text-sm text-gray-500">Harga</span>
                <span className="text-3xl font-medium text-[#ee4d2d]">
                  {formatRupiah(product.price_per_unit)}
                </span>
                <span className="text-gray-500 text-sm">/ {product.unit}</span>
              </div>

              {/* Info stok & kategori */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-4">
                  <span className="text-sm text-gray-500 w-24 shrink-0 pt-0.5">Kategori</span>
                  <span className="text-sm text-gray-800">
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-sm text-gray-500 w-24 shrink-0 pt-0.5">Stok</span>
                  <span className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                    {inStock ? `${product.stock_quantity} ${product.unit} tersedia` : 'Stok habis'}
                  </span>
                </div>
                {product.harvest_date && (
                  <div className="flex items-start gap-4">
                    <span className="text-sm text-gray-500 w-24 shrink-0 pt-0.5">Panen</span>
                    <span className="text-sm text-gray-800">{product.harvest_date}</span>
                  </div>
                )}
              </div>

              {/* Pengiriman — Shopee style */}
              <div className="flex items-start gap-4 mb-6">
                <span className="text-sm text-gray-500 w-24 shrink-0 pt-1">Pengiriman</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600 text-lg">🚚</span>
                    <span className="text-sm text-gray-800">Dikirim dari <b>{product.city || 'Lokasi Petani'}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-6 text-center">Ongkir</span>
                    <span className="text-sm text-gray-800">Mulai dari Rp10.000 (Reguler)</span>
                  </div>
                </div>
              </div>

              {/* Checkout (quantity, shipping, buy) */}
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
          </div>
        </div>

        {/* Seller shop card — ala Shopee */}
        {seller && (
          <div className="bg-white rounded-sm shadow-sm mt-4 p-4 lg:p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center font-bold text-lg shrink-0 border-2 border-white shadow">
                {getInitials(seller.full_name, 'P')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">
                    {getDisplayName(seller.full_name, 'Penjual')}
                  </p>
                  {seller.is_verified && (
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-100">
                      ✓ Terverifikasi
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    ⭐ {ratingAvg.toFixed(1)} · {ratingCount} ulasan
                  </span>
                  {seller.city && (
                    <span className="text-xs text-gray-400">· 📍 {seller.city}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/pembeli/chat/${seller.id}`}
                  className="px-4 py-2 border border-[#ee4d2d] text-[#ee4d2d] text-sm font-medium rounded-sm hover:bg-orange-50 transition-colors min-h-0"
                >
                  💬 Chat
                </Link>
                <Link
                  href={`/pembeli/penjual/${seller.id}`}
                  className="px-4 py-2 bg-[#ee4d2d] text-white text-sm font-medium rounded-sm hover:bg-[#d73211] transition-colors min-h-0"
                >
                  Kunjungi Toko
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Detail produk */}
        <div className="bg-white rounded-sm shadow-sm mt-4 p-4 lg:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-3 border-b border-gray-100 uppercase tracking-wide">
            Detail Produk
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <div className="flex gap-4 py-2">
              <span className="text-sm text-gray-400 w-32 shrink-0">Kategori</span>
              <span className="text-sm text-gray-800">{CATEGORY_LABELS[product.category] ?? product.category}</span>
            </div>
            <div className="flex gap-4 py-2">
              <span className="text-sm text-gray-400 w-32 shrink-0">Satuan</span>
              <span className="text-sm text-gray-800">{product.unit}</span>
            </div>
            <div className="flex gap-4 py-2">
              <span className="text-sm text-gray-400 w-32 shrink-0">Stok</span>
              <span className="text-sm text-gray-800">{product.stock_quantity} {product.unit}</span>
            </div>
            {product.city && (
              <div className="flex gap-4 py-2">
                <span className="text-sm text-gray-400 w-32 shrink-0">Asal</span>
                <span className="text-sm text-gray-800">{product.city}, {product.province}</span>
              </div>
            )}
          </div>

          {product.description && (
            <>
              <h3 className="text-base font-medium text-gray-900 mb-3">Deskripsi Produk</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

// app/(pembeli)/pembeli/penjual/[id]/page.tsx
//
// Halaman "Kunjungi Toko" — menampilkan profil penjual + semua produknya.
// Bisa untuk role petani (jual hasil panen) atau penyedia_alat (jual alat).
//
// Struktur design: mirror gaya Shopee shop page:
//   - Header toko: avatar + nama + rating + badge + tombol Chat/Kunjungi
//   - Info bar: total produk, pengikut (kalau ada), lokasi, join date
//   - Grid produk aktif dari penjual ini

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatRupiah, formatDateID, CATEGORY_LABELS, getDisplayName, getInitials } from '@/lib/utils'
import { ChatWithSellerButton } from '@/app/(pembeli)/pembeli/produk/[id]/_components/ChatWithSellerButton'

interface Props {
  params: Promise<{ id: string }>
}

type SellerProfile = {
  id: string
  full_name: string | null
  role: string
  city: string | null
  province: string | null
  rating_avg: number | null
  rating_count: number | null
  is_verified: boolean
  created_at: string
  bio?: string | null
}

type ProductRow = {
  id: string
  name: string
  category: string
  price_per_unit: number
  unit: string
  stock_quantity: number
  image_paths: string[] | null
  city: string | null
  is_auction: boolean
}

export default async function PenjualPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch profil penjual
  const { data: sellerData, error: sellerError } = await supabase
    .from('profiles')
    .select('id, full_name, role, city, province, rating_avg, rating_count, is_verified, created_at, bio')
    .eq('id', id)
    .maybeSingle()

  if (sellerError || !sellerData) notFound()

  const seller = sellerData as SellerProfile

  // Fetch produk aktif dari penjual ini
  const { data: productsData, count: totalProducts } = await supabase
    .from('products')
    .select('id, name, category, price_per_unit, unit, stock_quantity, image_paths, city, is_auction', { count: 'exact' })
    .eq('seller_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const products = (productsData ?? []) as ProductRow[]

  // Helper thumbnail URL
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const getFirstImageUrl = (imagePaths: string[] | null): string | null => {
    if (!imagePaths || imagePaths.length === 0) return null
    const p = imagePaths[0]
    return p.startsWith('http')
      ? p
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${p}`
  }

  const sellerName = getDisplayName(seller.full_name, 'Penjual')
  const ratingAvg = seller.rating_avg ?? 0
  const ratingCount = seller.rating_count ?? 0
  const joinDate = new Date(seller.created_at)
  const joinedYear = joinDate.getFullYear()
  const joinedMonth = joinDate.toLocaleDateString('id-ID', { month: 'long' })

  // Role label
  const roleLabel = seller.role === 'petani'
    ? '🌾 Petani'
    : seller.role === 'penyedia_alat'
    ? '🚜 Penyedia Alat'
    : '👤 Penjual'

  const roleGradient = seller.role === 'petani'
    ? 'from-green-500 to-emerald-600'
    : seller.role === 'penyedia_alat'
    ? 'from-blue-500 to-cyan-600'
    : 'from-gray-500 to-gray-600'

  return (
    <main className="min-h-screen bg-[#f5f5f5] pb-24 lg:pb-8">
      {/* Breadcrumb / Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="text-gray-500 hover:text-[#ee4d2d] text-sm flex items-center gap-1 min-h-0"
          >
            ← Marketplace
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 truncate">Toko {sellerName}</span>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-4">
        {/* ─── Shop Header Card ────────────────────────────────────────── */}
        <div className="bg-white rounded-sm shadow-sm overflow-hidden">
          {/* Banner gradient */}
          <div className={`h-24 sm:h-32 bg-gradient-to-r ${roleGradient} relative`}>
            <div className="absolute top-4 right-8 text-6xl opacity-10 select-none">
              {seller.role === 'petani' ? '🌾' : seller.role === 'penyedia_alat' ? '🚜' : '🏪'}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 lg:p-6 flex flex-col sm:flex-row gap-4 -mt-12 sm:-mt-16 relative">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center font-bold text-3xl shrink-0 border-4 border-white shadow-lg">
              {getInitials(seller.full_name, 'P')}
            </div>

            <div className="flex-1 min-w-0 sm:pt-14">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      {sellerName}
                    </h1>
                    {seller.is_verified && (
                      <span className="bg-blue-50 text-blue-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-blue-100">
                        ✓ Terverifikasi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                      {roleLabel}
                    </span>
                    {(seller.city || seller.province) && (
                      <span className="text-xs text-gray-500">
                        📍 {[seller.city, seller.province].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chat button */}
                <div className="shrink-0">
                  <ChatWithSellerButton
                    sellerId={seller.id}
                    productId=""
                  />
                </div>
              </div>

              {seller.bio && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {seller.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="border-t border-gray-100 px-4 lg:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/50">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Produk</p>
              <p className="text-lg font-bold text-gray-900">{totalProducts ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Rating</p>
              <p className="text-lg font-bold text-[#ee4d2d]">
                {ratingAvg > 0 ? ratingAvg.toFixed(1) : '-'}
                <span className="text-xs text-gray-400 font-normal ml-1">
                  ({ratingCount})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Bergabung</p>
              <p className="text-sm font-semibold text-gray-800">
                {joinedMonth} {joinedYear}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <p className="text-sm font-semibold text-green-600">🟢 Aktif</p>
            </div>
          </div>
        </div>

        {/* ─── Produk Grid ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-sm shadow-sm p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 uppercase tracking-wide">
              Produk Toko ({totalProducts ?? 0})
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-gray-500 font-medium">
                Belum ada produk aktif di toko ini
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Cek kembali nanti atau hubungi penjual via Chat
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => {
                const thumbUrl = getFirstImageUrl(product.image_paths)
                const inStock = product.stock_quantity > 0

                return (
                  <Link
                    key={product.id}
                    href={`/pembeli/produk/${product.id}`}
                    className="group border border-gray-100 rounded-sm overflow-hidden hover:shadow-md hover:border-[#ee4d2d]/30 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-gray-100 overflow-hidden relative">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {seller.role === 'petani' ? '🌾' : '🚜'}
                        </div>
                      )}
                      {product.is_auction && (
                        <span className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          🔨 Lelang
                        </span>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded">
                            Stok Habis
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm text-gray-800 line-clamp-2 min-h-[2.5rem] mb-1">
                        {getDisplayName(product.name, 'Produk')}
                      </p>
                      <p className="text-[#ee4d2d] font-bold text-base">
                        {formatRupiah(product.price_per_unit)}
                        <span className="text-gray-400 text-xs font-normal">
                          {' '}/ {product.unit}
                        </span>
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-gray-500 truncate">
                          {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] ?? product.category}
                        </span>
                        {product.city && (
                          <span className="text-[11px] text-gray-400 truncate ml-2">
                            📍 {product.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
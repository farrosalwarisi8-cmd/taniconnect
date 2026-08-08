// app/(pembeli)/pembeli/penjual/[id]/page.tsx
//
// Halaman "Kunjungi Toko" — gaya Shopee shop page.
// Menampilkan profil penjual + semua produk aktif yang dijual.
//
// Validasi seller:
//   Halaman ini bisa diakses untuk user manapun yang PUNYA produk aktif
//   di tabel products, terlepas dari role formal di tabel profiles.
//   Alasan: sistem TaniConnect support multi-role (satu user bisa jadi
//   petani, pembeli, dan penyedia_alat sekaligus — role di profiles hanya
//   role default/aktif saat ini, bukan role permanen).
//
//   Jadi validasi yang benar: cek apakah user punya minimal 1 produk aktif.
//   Kalau tidak punya, artinya bukan seller → notFound().
//
// URL: /pembeli/penjual/{seller_id}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  formatRupiah,
  CATEGORY_LABELS,
  getDisplayName,
  getInitials,
} from '@/lib/utils'
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
  is_verified: boolean | null
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rating_avg?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rating_count?: any
  bio?: string | null
  avatar_storage_path?: string | null
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
  is_auction: boolean | null
  current_bid: number | null
  created_at: string
}

export default async function PenjualPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // ─── Fetch profil penjual ──────────────────────────────────────────
  const { data: sellerData, error: sellerError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (sellerError || !sellerData) notFound()

  const seller = sellerData as SellerProfile

  // ─── Fetch semua produk aktif dari penjual ini ─────────────────────
  const { data: productsData, count: totalProducts } = await supabase
    .from('products')
    .select(
      'id, name, category, price_per_unit, unit, stock_quantity, image_paths, city, is_auction, current_bid, created_at',
      { count: 'exact' }
    )
    .eq('seller_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const products = (productsData ?? []) as ProductRow[]

  // ─── Validasi seller ──────────────────────────────────────────────
  // Sistem TaniConnect support multi-role — user dengan role formal 'pembeli'
  // di tabel profiles TETAP bisa jadi seller kalau dia punya produk aktif.
  // Jadi validasi yang benar: cek keberadaan produk, bukan role.
  //
  // Kalau user tidak punya produk aktif sama sekali, dia bukan seller →
  // tidak boleh punya halaman toko → notFound.
  if (products.length === 0) {
    notFound()
  }

  // ─── Deteksi role efektif berdasarkan kategori produk yang dijual ──
  // Karena role formal tidak reliable, deteksi role "efektif" dari data:
  //   - Kalau ada produk kategori pertanian (sayuran/buah/beras_padi/rempah)
  //     → tampilkan sebagai Petani
  //   - Kalau semua produk kategori alat/bahan
  //     → tampilkan sebagai Penyedia Alat
  //   - Kalau role formal-nya sudah spesifik (petani/penyedia_alat), pakai itu
  const FARMER_CATEGORIES = ['sayuran', 'buah', 'beras_padi', 'rempah']
  const hasFarmerProducts = products.some((p) =>
    FARMER_CATEGORIES.includes(p.category)
  )

  // Prioritaskan role formal kalau spesifik, fallback ke deteksi kategori
  const effectiveRole: 'petani' | 'penyedia_alat' =
    seller.role === 'penyedia_alat'
      ? 'penyedia_alat'
      : seller.role === 'petani'
      ? 'petani'
      : hasFarmerProducts
      ? 'petani'
      : 'penyedia_alat'

  // ─── Helper: thumbnail URL ────────────────────────────────────────
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const getFirstImageUrl = (imagePaths: string[] | null): string | null => {
    if (!imagePaths || imagePaths.length === 0) return null
    const p = imagePaths[0]
    return p.startsWith('http')
      ? p
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${p}`
  }

  // ─── Info penjual siap pakai ──────────────────────────────────────
  const sellerName = getDisplayName(seller.full_name, 'Penjual')
  const ratingAvg = Number(seller.rating_avg ?? 0)
  const ratingCount = Number(seller.rating_count ?? 0)
  const hasRating = ratingCount > 0

  const joinDate = new Date(seller.created_at)
  const joinedYear = joinDate.getFullYear()
  const joinedMonth = joinDate.toLocaleDateString('id-ID', { month: 'long' })
  const activeProductsCount = products.length

  // ─── Role-specific styling ─────────────────────────────────────────
  const isFarmer = effectiveRole === 'petani'
  const roleLabel = isFarmer ? '🌾 Petani' : '🚜 Penyedia Alat'
  const roleBg = isFarmer ? 'bg-green-50' : 'bg-blue-50'
  const roleText = isFarmer ? 'text-green-700' : 'text-blue-700'
  const roleBorder = isFarmer ? 'border-green-100' : 'border-blue-100'
  const roleGradient = isFarmer
    ? 'from-green-500 to-emerald-600'
    : 'from-blue-500 to-cyan-600'
  const roleEmoji = isFarmer ? '🌾' : '🚜'
  const roleAccent = isFarmer ? 'text-green-600' : 'text-blue-600'

  return (
    <main className="min-h-screen bg-[#f5f5f5] pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <header className="sticky top-[52px] z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="text-gray-500 hover:text-[#ee4d2d] text-sm flex items-center gap-1 min-h-0"
          >
            ← Marketplace
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 truncate">
            Toko {sellerName}
          </span>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-4">
        {/* Shop Header Card */}
        <div className="bg-white rounded-sm shadow-sm overflow-hidden">
          {/* Banner gradient */}
          <div
            className={`h-24 sm:h-32 bg-gradient-to-r ${roleGradient} relative overflow-hidden`}
          >
            <div className="absolute top-2 right-4 text-7xl opacity-10 select-none">
              {roleEmoji}
            </div>
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white/10 translate-y-1/2 translate-x-1/4" />
          </div>

          {/* Info penjual */}
          <div className="p-4 lg:p-6 flex flex-col sm:flex-row gap-4 -mt-12 sm:-mt-16 relative">
            {/* Avatar */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${
                isFarmer
                  ? 'from-green-400 to-green-600'
                  : 'from-blue-400 to-blue-600'
              } text-white flex items-center justify-center font-bold text-3xl shrink-0 border-4 border-white shadow-lg`}
            >
              {getInitials(seller.full_name, 'P')}
            </div>

            <div className="flex-1 min-w-0 sm:pt-14">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  {/* Nama + badge verified */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      {sellerName}
                    </h1>
                    {seller.is_verified && (
                      <span className="bg-blue-50 text-blue-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-blue-100 shrink-0">
                        ✓ Terverifikasi
                      </span>
                    )}
                  </div>

                  {/* Role badge + lokasi */}
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <span
                      className={`inline-flex items-center gap-1 ${roleBg} ${roleText} text-xs font-semibold px-2 py-1 rounded border ${roleBorder}`}
                    >
                      {roleLabel}
                    </span>
                    {(seller.city || seller.province) && (
                      <span className="text-xs text-gray-500">
                        📍{' '}
                        {[seller.city, seller.province]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {seller.bio && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {seller.bio}
                    </p>
                  )}
                </div>

                {/* Chat button */}
                <div className="flex gap-2 shrink-0">
                  <ChatWithSellerButton sellerId={seller.id} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="border-t border-gray-100 px-4 lg:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/50">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Produk</p>
              <p className={`text-lg font-bold ${roleAccent}`}>
                {totalProducts ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Rating</p>
              <p className="text-lg font-bold text-[#ee4d2d]">
                {hasRating ? ratingAvg.toFixed(1) : '-'}
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

        {/* Section: Produk Toko */}
        <div className="bg-white rounded-sm shadow-sm p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-gray-900 uppercase tracking-wide">
                {isFarmer ? 'Hasil Panen' : 'Alat & Bahan Tersedia'}
              </h2>
              <span
                className={`${roleBg} ${roleText} text-xs font-bold px-2 py-1 rounded`}
              >
                {activeProductsCount} produk
              </span>
            </div>
          </div>

          {/* Products grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => {
              const thumbUrl = getFirstImageUrl(product.image_paths)
              const inStock = product.stock_quantity > 0
              const displayPrice = product.is_auction
                ? product.current_bid ?? product.price_per_unit
                : product.price_per_unit

              return (
                <Link
                  key={product.id}
                  href={`/pembeli/produk/${product.id}`}
                  className="group border border-gray-100 rounded-sm overflow-hidden hover:shadow-lg hover:border-[#ee4d2d]/40 transition-all bg-white"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden relative">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-50">
                        {roleEmoji}
                      </div>
                    )}

                    {product.is_auction && (
                      <span className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        🔨 Lelang
                      </span>
                    )}

                    {!inStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded shadow">
                          Stok Habis
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="text-sm text-gray-800 line-clamp-2 min-h-[2.5rem] mb-1 leading-snug">
                      {getDisplayName(product.name, 'Produk')}
                    </p>
                    <p className="text-[#ee4d2d] font-bold text-base leading-tight">
                      {formatRupiah(displayPrice)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      / {product.unit}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span
                        className={`text-[10px] font-semibold ${roleText} truncate`}
                      >
                        {CATEGORY_LABELS[
                          product.category as keyof typeof CATEGORY_LABELS
                        ] ?? product.category}
                      </span>
                      {product.city && (
                        <span className="text-[10px] text-gray-400 truncate ml-1">
                          📍 {product.city}
                        </span>
                      )}
                    </div>

                    {inStock && (
                      <p className="text-[10px] text-green-600 mt-1 font-medium">
                        Stok: {product.stock_quantity} {product.unit}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-white rounded-sm shadow-sm p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-lg shrink-0">
              🛡️
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm mb-1">
                Belanja Aman di TaniConnect
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Dana pembayaran ditahan hingga barang diterima. Setiap transaksi
                dilindungi sistem escrow — uang baru diteruskan ke{' '}
                {isFarmer ? 'petani' : 'penyedia'} setelah kamu konfirmasi
                barang sampai dengan baik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
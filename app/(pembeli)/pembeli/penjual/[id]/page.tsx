import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID, CATEGORY_LABELS, getDisplayName, getInitials, getFirstName } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, city')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    title: data ? `${getDisplayName(data.full_name, 'Penjual')} — Profil Penjual` : 'Profil Penjual',
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function getImageUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
}

export default async function SellerProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: seller, error: sellerError } = await supabase
    .from('profiles')
    .select('id, full_name, city, province, bio, is_verified, rating_avg, rating_count, created_at, avatar_storage_path')
    .eq('id', id)
    .eq('role', 'petani')
    .maybeSingle()

  if (sellerError || !seller) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, price_per_unit, unit, stock_quantity, image_paths, city, is_auction, current_bid')
    .eq('seller_id', id)
    .eq('status', 'active')
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .limit(20)

  const initials = getInitials(seller.full_name, 'P')

  const memberSince = seller.created_at
    ? formatDateID(seller.created_at, 'long')
    : '—'

  const rating = seller.rating_avg ? Number(seller.rating_avg).toFixed(1) : null
  const activeProductCount = (products ?? []).length

  return (
    <main className="min-h-screen bg-[#FAFAF9] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-semibold transition-colors min-h-0 touch-target-exempt text-lg"
            aria-label="Kembali ke marketplace"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-[15px] truncate">{getDisplayName(seller.full_name, 'Penjual')}</p>
            <p className="text-[12px] text-gray-500">Profil Penjual</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Seller Hero Card */}
        <div className="relative bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 rounded-3xl overflow-hidden p-6 sm:p-8">
          <div className="blob-bg w-48 h-48 bg-white top-[-30px] right-[-20px]" />
          <div className="blob-bg w-32 h-32 bg-green-300 bottom-[-15px] left-[10px]" />

          <div className="relative flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-white font-bold text-3xl border-2 border-white/30 shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white font-bold text-xl sm:text-2xl leading-tight">
                  {getDisplayName(seller.full_name, 'Penjual')}
                </h1>
                {seller.is_verified && (
                  <span className="bg-white/25 text-white text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    ✓ Terverifikasi
                  </span>
                )}
              </div>

              {(seller.city || seller.province) && (
                <p className="text-white/80 text-[14px] mt-1.5">
                  📍 {[seller.city, seller.province].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-white/60 text-[12px] mt-1">Bergabung {memberSince}</p>

              {seller.bio && (
                <p className="text-white/80 text-[13px] mt-3 leading-relaxed italic">
                  &ldquo;{seller.bio}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/20">
            <div className="text-center">
              <p className="text-white font-bold text-2xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {activeProductCount}
              </p>
              <p className="text-white/70 text-[12px] mt-0.5">Produk Aktif</p>
            </div>
            <div className="text-center border-x border-white/20">
              <p className="text-white font-bold text-2xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {rating ?? '—'}
              </p>
              <p className="text-white/70 text-[12px] mt-0.5">Rating ⭐</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-2xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {seller.rating_count ?? 0}
              </p>
              <p className="text-white/70 text-[12px] mt-0.5">Ulasan</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-gray-900">
              Produk dari {getFirstName(seller.full_name, 'Penjual')}
            </h2>
            <span className="text-[13px] text-gray-500">{activeProductCount} produk</span>
          </div>

          {(products ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="font-bold text-gray-900 text-[16px] mb-2">Belum ada produk aktif</h3>
              <p className="text-gray-500 text-[14px]">Penjual ini belum memiliki produk yang tersedia saat ini.</p>
              <Link
                href="/pembeli/marketplace"
                className="inline-block mt-4 px-5 py-2.5 bg-green-600 text-white font-semibold text-[14px] rounded-xl hover:bg-green-700 transition-colors min-h-0 touch-target-exempt"
              >
                Lihat Produk Lain →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(products ?? []).map((product: any) => {
                const displayPrice = product.is_auction && product.current_bid
                  ? product.current_bid
                  : product.price_per_unit
                const firstImage = product.image_paths?.[0]

                return (
                  <Link
                    key={product.id}
                    href={`/pembeli/produk/${product.id}`}
                    className="group min-h-0"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover-lift h-full flex flex-col">
                      {/* Image */}
                      <div className="relative aspect-[4/3] bg-gray-50">
                        {firstImage ? (
                          <img
                            src={getImageUrl(firstImage)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🌾
                          </div>
                        )}
                        {product.is_auction && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="warning" size="sm">🔨 Lelang</Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex flex-col gap-1 flex-1">
                        <p className="font-semibold text-gray-900 text-[13px] line-clamp-2 leading-snug">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {CATEGORY_LABELS[product.category] ?? product.category}
                        </p>
                        <div className="mt-auto pt-2">
                          <p className="font-bold text-green-700 text-[15px]">
                            {formatRupiah(displayPrice)}
                          </p>
                          <p className="text-[11px] text-gray-400">per {product.unit}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Back CTA */}
        <div className="text-center py-4">
          <Link
            href="/pembeli/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-green-200 text-green-700 font-semibold text-[14px] rounded-2xl hover:bg-green-50 transition-colors shadow-sm min-h-0 touch-target-exempt"
          >
            ← Kembali ke Marketplace
          </Link>
        </div>
      </div>
    </main>
  )
}

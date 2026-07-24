import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, CATEGORY_LABELS } from '@/lib/utils'

interface Product {
  id:             string
  name:           string
  category:       string
  price_per_unit: number
  unit:           string
  stock_quantity: number
  image_paths:    string[]
  province:       string | null
  city:           string | null
  is_auction:     boolean
  current_bid:    number | null
  seller_id?:     string
}

interface ProductGridProps {
  products: Product[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function getImageUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm max-w-lg mx-auto my-8">
        <div className="text-6xl mb-4 animate-float">🧺</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Hasil tidak ditemukan</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Coba ubah kata kunci pencarian atau pilih kategori panen lainnya.
        </p>
        <Link
          href="/pembeli/marketplace"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl px-6 py-3 transition-colors shadow-sm min-h-[48px]"
        >
          Reset Filter Pencarian
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map(product => {
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
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover-lift h-full flex flex-col transition-all duration-300">
              {/* Product Image Container */}
              <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                {firstImage ? (
                  <img
                    src={getImageUrl(firstImage)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-green-50 to-emerald-50 text-green-700">
                    🌾
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {product.is_auction && (
                    <Badge variant="warning" size="sm">🔨 Lelang</Badge>
                  )}
                  {product.stock_quantity < 10 && (
                    <Badge variant="error" size="sm">Stok Sisa {product.stock_quantity}</Badge>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-green-700">
                  {CATEGORY_LABELS[product.category] ?? product.category}
                </span>

                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors leading-snug">
                  {product.name}
                </h3>

                {product.city && (
                  <p className="text-[12px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <span>📍</span> <span className="truncate">{product.city}</span>
                  </p>
                )}

                {/* Price Display */}
                <div className="mt-auto pt-2 border-t border-gray-50 flex items-baseline justify-between">
                  <div>
                    <p className="text-base font-extrabold text-green-700 leading-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                      {formatRupiah(displayPrice)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">per {product.unit}</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
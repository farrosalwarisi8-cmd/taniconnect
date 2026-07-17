import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/utils'

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
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🧺</div>
        <h3 className="text-h2 text-fg-dark mb-2">Belum ada hasil ditemukan</h3>
        <p className="text-body text-fg/60 mb-6 max-w-sm mx-auto">
          Coba ubah kata kunci atau reset filter untuk melihat produk lain.
        </p>
        <Link
          href="/pembeli/marketplace"
          className="inline-block bg-primary text-white font-medium rounded-sm px-6 py-3 min-h-[48px]"
        >
          Reset Filter
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
            <Card variant="standard" padding="none" hover className="overflow-hidden h-full flex flex-col">
              {/* Gambar */}
              <div className="relative aspect-[4/3] bg-surface-light">
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

                {/* Badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.is_auction && (
                    <Badge variant="warning" size="sm">🔨 Lelang</Badge>
                  )}
                  {product.stock_quantity < 10 && (
                    <Badge variant="error" size="sm">Stok Terbatas</Badge>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <h3 className="text-h3 text-fg-dark line-clamp-2">{product.name}</h3>
                {product.city && (
                  <p className="text-caption text-fg/60">📍 {product.city}</p>
                )}
                <div className="mt-2">
                  <p className="text-h4 text-primary-dark font-bold">
                    {formatRupiah(displayPrice)}
                  </p>
                  <p className="text-caption text-fg/60">per {product.unit}</p>
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
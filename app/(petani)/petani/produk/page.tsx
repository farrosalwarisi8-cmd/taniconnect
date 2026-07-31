import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID } from '@/lib/utils'
import { ProdukSayaActions } from './_components/ProdukSayaActions'
import type { Tables } from '@/lib/supabase/client'

export const metadata = {
  title: 'Produk Saya',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function getImageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
}

const CATEGORY_LABELS: Record<string, string> = {
  sayuran: '🥬 Sayuran',
  buah: '🍎 Buah',
  beras_padi: '🌾 Beras & Padi',
  rempah: '🌶️ Rempah',
  lainnya: '📦 Lainnya',
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'neutral' | 'error' }
> = {
  active: { label: 'Aktif', variant: 'success' },
  draft: { label: 'Nonaktif', variant: 'neutral' },
  sold: { label: 'Terjual', variant: 'warning' },
}

export default async function ProdukSayaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/petani/produk')

  const { data: productsData } = await supabase
    .from('products')
    .select(
      'id, name, category, price_per_unit, unit, stock_quantity, status, image_paths, is_auction, current_bid, auction_end_time, created_at, city, province, views_count'
    )
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  const products = (productsData ?? []) as Array<
    Pick<
      Tables<'products'>,
      | 'id'
      | 'name'
      | 'category'
      | 'price_per_unit'
      | 'unit'
      | 'stock_quantity'
      | 'status'
      | 'image_paths'
      | 'is_auction'
      | 'current_bid'
      | 'auction_end_time'
      | 'created_at'
      | 'city'
      | 'province'
      | 'views_count'
    >
  >

  const activeCount = products.filter((p) => p.status === 'active').length
  const draftCount = products.filter((p) => p.status === 'draft').length
  const totalStockValue = products
    .filter((p) => p.status === 'active')
    .reduce(
      (sum, p) => sum + Number(p.price_per_unit) * Number(p.stock_quantity),
      0
    )

  return (
    <main className="min-h-screen bg-surface pb-24">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/petani/dashboard"
            className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center min-h-0"
            aria-label="Kembali"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1
              className="text-fg-dark leading-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', ui-sans-serif",
                fontSize: 'clamp(24px, 5vw, 40px)',
                fontWeight: 800,
              }}
            >
              Produk Saya
            </h1>
            <p className="text-caption text-fg/60">
              Kelola semua listing hasil panen kamu
            </p>
          </div>
          <Link href="/petani/produk/baru">
            <Button size="md">
              <span className="hidden sm:inline">+ Jual Produk</span>
              <span className="sm:hidden">+ Baru</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card variant="standard" padding="md" className="border-l-4 !border-l-primary">
            <p className="text-caption text-fg/60">Total Produk</p>
            <p
              className="text-fg-dark font-extrabold"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
            >
              {products.length}
            </p>
          </Card>
          <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
            <p className="text-caption text-fg/60">Aktif</p>
            <p
              className="text-success font-extrabold"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
            >
              {activeCount}
            </p>
          </Card>
          <Card variant="standard" padding="md" className="border-l-4 !border-l-fg/30">
            <p className="text-caption text-fg/60">Nonaktif</p>
            <p
              className="text-fg font-extrabold"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
            >
              {draftCount}
            </p>
          </Card>
          <Card variant="standard" padding="md" className="border-l-4 !border-l-amber">
            <p className="text-caption text-fg/60">Nilai Stok Aktif</p>
            <p
              className="text-primary-dark font-extrabold text-xl leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
            >
              {formatRupiah(totalStockValue)}
            </p>
          </Card>
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <Card variant="standard" padding="lg" className="text-center">
            <div className="text-6xl mb-3">🌾</div>
            <h2 className="text-h4 text-fg-dark font-bold mb-2">
              Belum ada produk
            </h2>
            <p className="text-body text-fg/60 mb-6 max-w-md mx-auto">
              Mulai jual hasil panenmu di marketplace TaniConnect.
              Jangkau ribuan pembeli tanpa perantara!
            </p>
            <Link href="/petani/produk/baru">
              <Button size="lg">🌾 Buat Listing Pertama</Button>
            </Link>
          </Card>
        )}

        {/* Product List */}
        {products.length > 0 && (
          <div className="space-y-3">
            {products.map((product) => {
              const firstImage = product.image_paths?.[0]
              const imageUrl = firstImage ? getImageUrl(firstImage) : null
              const statusInfo = STATUS_LABELS[product.status ?? 'active']

              return (
                <Card
                  key={product.id}
                  variant="standard"
                  padding="none"
                  className="overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {/* Image */}
                    <div className="w-full sm:w-32 h-32 rounded-btn bg-surface overflow-hidden shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-primary/5">
                          🌾
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-fg-dark text-lg leading-tight">
                            {product.name}
                          </h3>
                          <p className="text-caption text-fg/60 mt-1">
                            {CATEGORY_LABELS[product.category] ?? product.category}
                            {' · '}
                            📍 {product.city ?? '-'}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                          {product.is_auction && (
                            <Badge variant="warning" size="sm">🔨 Lelang</Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-sm">
                        <div>
                          <p className="text-caption text-fg/60">Harga</p>
                          <p className="font-bold text-primary-dark">
                            {formatRupiah(product.price_per_unit)}
                          </p>
                          <p className="text-caption text-fg/60">/ {product.unit}</p>
                        </div>
                        <div>
                          <p className="text-caption text-fg/60">Stok</p>
                          <p className="font-bold text-fg-dark">
                            {product.stock_quantity} {product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-caption text-fg/60">Dibuat</p>
                          <p className="text-sm text-fg">
                            {formatDateID(product.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-caption text-fg/60">Dilihat</p>
                          <p className="text-sm text-fg">
                            {product.views_count ?? 0} kali
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <ProdukSayaActions
                        productId={product.id}
                        productName={product.name}
                        currentStatus={product.status ?? 'active'}
                      />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
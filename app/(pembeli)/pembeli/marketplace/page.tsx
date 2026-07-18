import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MarketplaceHeader } from './_components/MarketplaceHeader'
import { ProductGrid } from './_components/ProductGrid'
import { ProductGridSkeleton } from './_components/ProductGridSkeleton'

interface SearchParams {
  q?:         string
  category?:  string
  province?:  string
  sort?:      'newest' | 'cheapest' | 'expensive'
}

interface MarketplacePageProps {
  searchParams: Promise<SearchParams>
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-surface-light pb-24">
      <MarketplaceHeader
        query={params.q ?? ''}
        activeCategory={params.category ?? 'semua'}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGridWrapper searchParams={params} />
        </Suspense>
      </div>
    </main>
  )
}

async function ProductGridWrapper({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('products')
    .select('id, name, category, price_per_unit, unit, stock_quantity, image_paths, province, city, is_auction, current_bid, auction_end_time, seller_id')
    .eq('status', 'active')
    .gt('stock_quantity', 0)

  if (searchParams.q) {
    query = query.ilike('name', `%${searchParams.q}%`)
  }
  if (searchParams.category && searchParams.category !== 'semua') {
    query = query.eq('category', searchParams.category as 'sayuran' | 'buah' | 'beras_padi' | 'rempah' | 'lainnya')
  }
  if (searchParams.province) {
    query = query.eq('province', searchParams.province)
  }

  switch (searchParams.sort) {
    case 'cheapest':
      query = query.order('price_per_unit', { ascending: true })
      break
    case 'expensive':
      query = query.order('price_per_unit', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data: products, error } = await query.limit(48)

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-error rounded-sm p-4 text-red-700">
        <strong>Koneksi terputus.</strong> Coba refresh halaman.
      </div>
    )
  }

  return <ProductGrid products={(products as any) ?? []} />
}
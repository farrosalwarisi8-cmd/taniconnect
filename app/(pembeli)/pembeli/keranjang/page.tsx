// app/(pembeli)/pembeli/keranjang/page.tsx
//
// Halaman Keranjang Belanja.
// Server Component — fetch data awal dari server, lalu render CartClient.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CartClient, type CartItemView } from './_components/CartClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Keranjang Belanja',
}

export default async function KeranjangPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/pembeli/keranjang')
  }

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      created_at,
      product:products!cart_items_product_id_fkey (
        id,
        name,
        price_per_unit,
        unit,
        stock_quantity,
        image_paths,
        status,
        seller_id,
        seller:profiles!products_seller_id_fkey (
          id,
          full_name,
          city
        )
      )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[KERANJANG PAGE ERROR]', error)
  }

  // Normalisasi data: supabase kadang return seller sebagai array (1-to-1 FK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems = (data as any[]) ?? []

  const items: CartItemView[] = rawItems
    .filter(row => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product
      // Skip item yang produknya sudah dihapus/tidak aktif
      return product && product.status === 'active'
    })
    .map(row => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product
      const seller = Array.isArray(product.seller) ? product.seller[0] : product.seller
      return {
        id:          row.id,
        quantity:    row.quantity,
        productId:   product.id,
        productName: product.name ?? 'Produk',
        pricePerUnit: Number(product.price_per_unit),
        unit:        product.unit ?? '',
        stockQuantity: Number(product.stock_quantity),
        imagePath:   (product.image_paths ?? [])[0] ?? null,
        sellerId:    seller?.id ?? product.seller_id,
        sellerName:  seller?.full_name ?? 'Penjual',
        sellerCity:  seller?.city ?? null,
      }
    })

  return (
    <main className="min-h-screen bg-gray-50 pb-32 lg:pb-8">
      {/* Header */}
      <header className="sticky top-[52px] z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="text-gray-500 hover:text-primary-dark text-sm flex items-center gap-1 min-h-0"
          >
            ← Marketplace
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-base font-semibold text-gray-900">
            Keranjang Belanja
          </h1>
          <span className="ml-auto text-xs text-gray-500">
            {items.length} item
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <CartClient initialItems={items} />
      </div>
    </main>
  )
}
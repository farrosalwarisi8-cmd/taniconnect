// app/(pembeli)/pembeli/keranjang/_components/CartClient.tsx
//
// Client component untuk interaksi keranjang:
// - Stepper quantity per item (+/- dengan bounds check)
// - Hapus item
// - Grup per seller (checkout dilakukan per grup)
// - Loop checkout per item → panggil /api/transactions/create untuk setiap item
//   dari grup terpilih, lalu redirect ke halaman pesanan setelah semua sukses.
//
// Alasan checkout per grup (bukan bulk multi-seller):
// - Escrow di transactions/create adalah per-transaksi-per-seller
// - Modifikasi backend untuk multi-item multi-seller = rombak sensitif
// - Loop di client tetap kasih UX "satu klik checkout per seller"
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatRupiah, generateIdempotencyKey } from '@/lib/utils'

export interface CartItemView {
  id:            string
  quantity:      number
  productId:     string
  productName:   string
  pricePerUnit:  number
  unit:          string
  stockQuantity: number
  imagePath:     string | null
  sellerId:      string
  sellerName:    string
  sellerCity:    string | null
}

interface CartClientProps {
  initialItems: CartItemView[]
}

interface GroupedCart {
  sellerId:   string
  sellerName: string
  sellerCity: string | null
  items:      CartItemView[]
  subtotal:   number
}

function CartContent({ initialItems }: CartClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [items, setItems] = useState<CartItemView[]>(initialItems)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [checkoutingSellerId, setCheckoutingSellerId] = useState<string | null>(null)

  // Group items per seller
  const groups: GroupedCart[] = useMemo(() => {
    const map = new Map<string, GroupedCart>()
    items.forEach(item => {
      if (!map.has(item.sellerId)) {
        map.set(item.sellerId, {
          sellerId:   item.sellerId,
          sellerName: item.sellerName,
          sellerCity: item.sellerCity,
          items:      [],
          subtotal:   0,
        })
      }
      const group = map.get(item.sellerId)!
      group.items.push(item)
      group.subtotal += item.pricePerUnit * item.quantity
    })
    return Array.from(map.values())
  }, [items])

  const grandTotal = items.reduce((sum, i) => sum + i.pricePerUnit * i.quantity, 0)

  const setItemUpdating = (id: string, updating: boolean) => {
    setUpdatingIds(prev => {
      const next = new Set(prev)
      if (updating) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const emitCartUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated'))
    }
  }

  // ─── Update quantity ────────────────────────────────────────────────────────
  const handleUpdateQty = async (item: CartItemView, newQty: number) => {
    if (newQty < 1) return
    if (newQty > item.stockQuantity) {
      toast(`Stok maksimum ${item.stockQuantity}`, 'warning')
      return
    }

    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    setItemUpdating(item.id, true)

    try {
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, quantity: newQty }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Rollback
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i))
        toast(err.error ?? 'Gagal update jumlah', 'error')
        return
      }

      emitCartUpdated()
    } catch {
      // Rollback
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i))
      toast('Koneksi terputus, coba lagi', 'error')
    } finally {
      setItemUpdating(item.id, false)
    }
  }

  // ─── Hapus item ─────────────────────────────────────────────────────────────
  const handleRemove = async (item: CartItemView) => {
    if (!window.confirm(`Hapus "${item.productName}" dari keranjang?`)) return

    // Optimistic remove
    const prevItems = items
    setItems(prev => prev.filter(i => i.id !== item.id))

    try {
      const res = await fetch(`/api/cart?id=${item.id}`, { method: 'DELETE' })

      if (!res.ok) {
        setItems(prevItems)
        toast('Gagal menghapus item', 'error')
        return
      }

      emitCartUpdated()
      toast('Item dihapus dari keranjang', 'success', 2000)
    } catch {
      setItems(prevItems)
      toast('Koneksi terputus, coba lagi', 'error')
    }
  }

  // ─── Checkout per grup seller ───────────────────────────────────────────────
  // Loop panggil /api/transactions/create untuk setiap item di grup.
  // Ini menghasilkan N transaksi per grup, tapi tidak perlu rombak backend.
  const handleCheckoutGroup = async (group: GroupedCart) => {
    if (!window.confirm(
      `Checkout ${group.items.length} item dari ${group.sellerName}?\n\n` +
      `Total: ${formatRupiah(group.subtotal)}\n\n` +
      `Catatan: ongkos kirim akan dihitung saat checkout per item.`
    )) return

    setCheckoutingSellerId(group.sellerId)

    let successCount = 0
    let failedItems: string[] = []

    for (const item of group.items) {
      try {
        const idempotencyKey = generateIdempotencyKey()
        const res = await fetch('/api/transactions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            product_id:    item.productId,
            quantity:      item.quantity,
            shipping_cost: 0, // TODO: nanti bisa integrate dengan shipping picker
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          failedItems.push(`${item.productName}: ${err.error ?? 'gagal'}`)
          continue
        }

        successCount++
      } catch {
        failedItems.push(`${item.productName}: koneksi error`)
      }
    }

    // Kalau semua sukses, hapus grup dari cart
    if (successCount === group.items.length) {
      try {
        await fetch(`/api/cart?seller_id=${group.sellerId}`, { method: 'DELETE' })
        setItems(prev => prev.filter(i => i.sellerId !== group.sellerId))
        emitCartUpdated()
        toast(`${successCount} transaksi berhasil dibuat!`, 'success', 3000)
        setTimeout(() => router.push('/pembeli/pesanan'), 1200)
      } catch {
        toast('Transaksi berhasil, tapi gagal bersihkan cart', 'warning')
      }
    } else if (successCount > 0) {
      toast(
        `${successCount} berhasil, ${failedItems.length} gagal: ${failedItems.join('; ')}`,
        'warning',
        8000
      )
    } else {
      toast(
        `Semua checkout gagal: ${failedItems.join('; ')}`,
        'error',
        8000
      )
    }

    setCheckoutingSellerId(null)
  }

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Keranjang kosong</h2>
        <p className="text-sm text-gray-500 mb-6">
          Belum ada produk yang kamu tambahkan ke keranjang.
        </p>
        <Link
          href="/pembeli/marketplace"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors min-h-[48px]"
        >
          🛒 Belanja Sekarang
        </Link>
      </div>
    )
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const resolveImageUrl = (path: string | null): string | null => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.sellerId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Group header (per seller) */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-lg">🏪</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {group.sellerName}
              </p>
              {group.sellerCity && (
                <p className="text-[11px] text-gray-500">📍 {group.sellerCity}</p>
              )}
            </div>
            <Link
              href={`/pembeli/penjual/${group.sellerId}`}
              className="text-xs text-primary-dark hover:underline font-medium shrink-0 min-h-0"
            >
              Kunjungi toko
            </Link>
          </div>

          {/* Items in this group */}
          <div className="divide-y divide-gray-100">
            {group.items.map(item => {
              const imageUrl = resolveImageUrl(item.imagePath)
              const isUpdating = updatingIds.has(item.id)
              const itemSubtotal = item.pricePerUnit * item.quantity

              return (
                <div key={item.id} className="flex gap-3 p-4">
                  {/* Image */}
                  <Link
                    href={`/pembeli/produk/${item.productId}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 min-h-0"
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/pembeli/produk/${item.productId}`}
                        className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-primary-dark min-h-0"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatRupiah(item.pricePerUnit)} / {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      {/* Qty stepper */}
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item, item.quantity - 1)}
                          disabled={isUpdating || item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 min-h-0"
                          aria-label="Kurangi"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-medium border-x border-gray-300 py-1">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item, item.quantity + 1)}
                          disabled={isUpdating || item.quantity >= item.stockQuantity}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 min-h-0"
                          aria-label="Tambah"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-[#ee4d2d]">
                          {formatRupiah(itemSubtotal)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          className="text-gray-400 hover:text-red-500 text-lg min-h-0 touch-target-exempt"
                          aria-label="Hapus item"
                          title="Hapus dari keranjang"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Group footer: subtotal + checkout button */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">
                Subtotal ({group.items.length} item)
              </p>
              <p className="text-lg font-bold text-[#ee4d2d]">
                {formatRupiah(group.subtotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCheckoutGroup(group)}
              disabled={checkoutingSellerId !== null}
              className="px-6 py-2.5 bg-[#ee4d2d] hover:bg-[#d73211] text-white font-semibold text-sm rounded-md disabled:opacity-50 transition-colors min-h-0"
            >
              {checkoutingSellerId === group.sellerId
                ? 'Memproses...'
                : `Checkout dari ${group.sellerName.split(' ')[0]}`}
            </button>
          </div>
        </div>
      ))}

      {/* Grand total (sticky bottom on mobile, static on desktop) */}
      <div className="fixed lg:sticky bottom-16 lg:bottom-4 left-0 right-0 lg:left-auto lg:right-auto bg-white border-t lg:border border-gray-200 lg:rounded-2xl px-4 py-3 shadow-lg lg:shadow-sm z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Total keseluruhan</p>
            <p className="text-xl font-extrabold text-[#ee4d2d]">
              {formatRupiah(grandTotal)}
            </p>
          </div>
          <p className="text-[11px] text-gray-500 text-right max-w-[180px]">
            Checkout dilakukan <b>per toko</b> — klik tombol di atas per grup penjual.
          </p>
        </div>
      </div>
    </div>
  )
}

export function CartClient(props: CartClientProps) {
  return (
    <ToastProvider>
      <CartContent {...props} />
    </ToastProvider>
  )
}
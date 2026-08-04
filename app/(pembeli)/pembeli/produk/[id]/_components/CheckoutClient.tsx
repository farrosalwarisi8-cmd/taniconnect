'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatRupiah, generateIdempotencyKey, getDisplayName } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    snap: {
      pay: (token: string, callbacks: {
        onSuccess?: (result: unknown) => void
        onPending?: (result: unknown) => void
        onError?:   (result: unknown) => void
        onClose?:   () => void
      }) => void
    }
  }
}

interface Props {
  productId:    string
  productName:  string
  pricePerUnit: number
  unit:         string
  maxQuantity:  number
  isAuction:    boolean
  currentBid:   number | null
}

type ShippingMethod = 'jne' | 'sicepat' | 'ambil_sendiri'

const SHIPPING_OPTIONS: Array<{ value: ShippingMethod; label: string; cost: number; desc: string }> = [
  { value: 'jne',           label: 'JNE Reguler',   cost: 15000, desc: '2-4 hari kerja' },
  { value: 'sicepat',       label: 'SiCepat REG',   cost: 12000, desc: '2-3 hari kerja' },
  { value: 'ambil_sendiri', label: 'Ambil Sendiri', cost: 0,     desc: 'Gratis ongkir' },
]

function CheckoutFlow(props: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [quantity, setQuantity] = useState(1)
  const [shipping, setShipping] = useState<ShippingMethod>('jne')
  const [loading, setLoading] = useState(false)
  const [snapReady, setSnapReady] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ? { id: data.user.id } : null)
    }
    loadUser()

    const scriptId = 'midtrans-snap-script'
    if (typeof window !== 'undefined' && window.snap) {
      setSnapReady(true)
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '')
      script.onload = () => setSnapReady(Boolean(window.snap))
      script.onerror = () => {
        setSnapReady(false)
        toast('Sistem pembayaran tidak bisa dimuat saat ini', 'warning')
      }
      document.body.appendChild(script)
    }
  }, [supabase, toast])

  const shippingCost = SHIPPING_OPTIONS.find(o => o.value === shipping)?.cost ?? 0
  const subtotal = props.pricePerUnit * quantity
  const total    = subtotal + shippingCost
  const outOfStock = props.maxQuantity < 1

  const handleCheckout = async () => {
    if (!user) {
      toast('Silakan login untuk melanjutkan checkout', 'warning')
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    if (quantity > props.maxQuantity) {
      toast(`Stok maksimal ${props.maxQuantity} ${props.unit}`, 'warning')
      return
    }

    if (!snapReady || typeof window.snap === 'undefined') {
      toast('Sistem pembayaran belum siap, silakan coba lagi sebentar', 'warning')
      return
    }

    setLoading(true)
    try {
      const idempotencyKey = generateIdempotencyKey()

      const res = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          product_id:      props.productId,
          quantity,
          shipping_method: shipping,
          shipping_cost:   shippingCost,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal membuat transaksi')
      }

      const { snap_token } = await res.json().catch(() => ({ snap_token: null }))
      if (!snap_token) {
        throw new Error('Token pembayaran tidak tersedia')
      }

      window.snap.pay(snap_token, {
        onSuccess: () => {
          toast('Pembayaran berhasil!', 'success')
          setTimeout(() => router.push('/pembeli/pesanan'), 1000)
        },
        onPending: () => {
          toast('Menunggu pembayaran diselesaikan', 'info')
          setTimeout(() => router.push('/pembeli/pesanan'), 1000)
        },
        onError: () => {
          toast('Pembayaran gagal, silakan coba lagi', 'error')
        },
        onClose: () => {
          toast('Kamu menutup jendela pembayaran', 'warning')
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal proses checkout'
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Jumlah — ala Shopee row layout */}
      <div className="flex items-center gap-4 mb-5">
        <span className="text-sm text-gray-500 w-24 shrink-0">Jumlah</span>
        <div className="flex items-center border border-gray-300 rounded-sm">
          <button
            type="button"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={outOfStock}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 min-h-0"
            aria-label="Kurangi"
          >
            −
          </button>
          <span className="w-12 text-center text-sm font-medium border-x border-gray-300 py-1">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(q => Math.min(props.maxQuantity, q + 1))}
            disabled={outOfStock}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 min-h-0"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {props.maxQuantity} {props.unit} tersedia
        </span>
      </div>

      {/* Pengiriman */}
      <div className="flex items-start gap-4 mb-5">
        <span className="text-sm text-gray-500 w-24 shrink-0 pt-1">Pengiriman</span>
        <div className="flex-1 space-y-2">
          {SHIPPING_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center justify-between p-3 rounded-sm border cursor-pointer transition-all min-h-0 ${
                shipping === opt.value
                  ? 'border-[#ee4d2d] bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="shipping"
                  value={opt.value}
                  checked={shipping === opt.value}
                  onChange={e => setShipping(e.target.value as ShippingMethod)}
                  className="accent-[#ee4d2d] min-h-0"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-400">{opt.desc}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-[#ee4d2d]">
                {opt.cost === 0 ? 'Gratis' : formatRupiah(opt.cost)}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Ringkasan harga */}
      <div className="border-t border-gray-100 pt-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({quantity} {props.unit})</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Ongkos Kirim</span>
          <span>{shippingCost === 0 ? 'Gratis' : formatRupiah(shippingCost)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
          <span className="text-base text-gray-800">Total Pembayaran</span>
          <span className="text-2xl font-medium text-[#ee4d2d]">{formatRupiah(total)}</span>
        </div>
      </div>

      {/* Escrow info */}
      <div className="bg-green-50 border border-green-100 rounded-sm p-3 mb-5">
        <p className="text-xs text-green-700">
          🔒 Dana aman — uang ditahan TaniConnect dan diteruskan ke petani setelah kamu konfirmasi barang diterima.
        </p>
      </div>

      {/* Desktop buttons — ala Shopee */}
      <div className="hidden lg:flex gap-3 mt-auto">
        <button
          type="button"
          disabled={outOfStock || loading}
          onClick={handleCheckout}
          className="flex-1 py-3 border border-[#ee4d2d] text-[#ee4d2d] font-medium rounded-sm hover:bg-orange-50 disabled:opacity-50 transition-colors"
        >
          {outOfStock ? 'Stok Habis' : 'Masukkan Keranjang'}
        </button>
        <button
          type="button"
          disabled={outOfStock || loading}
          onClick={handleCheckout}
          className="flex-1 py-3 bg-[#ee4d2d] hover:bg-[#d73211] text-white font-medium rounded-sm disabled:opacity-50 transition-colors"
        >
          {loading ? 'Memproses...' : outOfStock ? 'Stok Habis' : 'Beli Sekarang'}
        </button>
      </div>

      {/* Mobile sticky bottom bar — ala Shopee */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center px-3 py-2 gap-2">
          <Link
            href="/pembeli/marketplace"
            className="flex flex-col items-center justify-center w-12 text-[10px] text-gray-500 min-h-0"
          >
            <span className="text-lg">🏠</span>
            Beranda
          </Link>
          <div className="flex-1 flex gap-2">
            <button
              type="button"
              disabled={outOfStock || loading}
              onClick={handleCheckout}
              className="flex-1 py-2.5 border border-[#ee4d2d] text-[#ee4d2d] text-sm font-medium rounded-sm disabled:opacity-50"
            >
              Keranjang
            </button>
            <button
              type="button"
              disabled={outOfStock || loading}
              onClick={handleCheckout}
              className="flex-[2] py-2.5 bg-[#ee4d2d] text-white text-sm font-medium rounded-sm disabled:opacity-50"
            >
              {loading ? '...' : outOfStock ? 'Habis' : `Beli · ${formatRupiah(total)}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <a
      href={href}
      className={className}
      onClick={e => { e.preventDefault(); router.push(href) }}
    >
      {children}
    </a>
  )
}

export function CheckoutClient(props: Props) {
  return (
    <ToastProvider>
      <CheckoutFlow {...props} />
    </ToastProvider>
  )
}

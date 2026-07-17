'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatRupiah, generateIdempotencyKey } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// Type deklarasi untuk Midtrans Snap yang di-inject via <script>
declare global {
  interface Window {
    snap: {
      pay: (token: string, callbacks: {
        onSuccess?: (result: any) => void
        onPending?: (result: any) => void
        onError?:   (result: any) => void
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
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id } : null))

    // Load Midtrans Snap script
    const scriptId = 'midtrans-snap-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '')
      document.body.appendChild(script)
    }
  }, [supabase])

  const shippingCost = SHIPPING_OPTIONS.find(o => o.value === shipping)?.cost ?? 0
  const subtotal = props.pricePerUnit * quantity
  const total    = subtotal + shippingCost

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

    setLoading(true)
    try {
      const idempotencyKey = generateIdempotencyKey()

      const res = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          product_id:      props.productId,
          quantity,
          shipping_method: shipping,
          shipping_cost:   shippingCost,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal membuat transaksi')
      }

      const { snap_token, transaction_id } = await res.json()

      // Buka Midtrans Snap popup
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
    } catch (err: any) {
      toast(err.message ?? 'Gagal proses checkout', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 border-t border-border pt-6">
      {/* Jumlah */}
      <div>
        <label className="text-sm font-semibold text-fg mb-3 block">Jumlah</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-12 h-12 rounded-sm border border-border bg-white text-2xl font-semibold hover:bg-surface-light min-h-0"
            aria-label="Kurangi"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <div className="text-h2 text-fg-dark">{quantity}</div>
            <div className="text-caption text-fg/60">{props.unit}</div>
          </div>
          <button
            type="button"
            onClick={() => setQuantity(q => Math.min(props.maxQuantity, q + 1))}
            className="w-12 h-12 rounded-sm border border-border bg-white text-2xl font-semibold hover:bg-surface-light min-h-0"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
        <p className="text-caption text-fg/60 mt-2 text-center">
          Maksimal {props.maxQuantity} {props.unit}
        </p>
      </div>

      {/* Pengiriman */}
      <div>
        <label className="text-sm font-semibold text-fg mb-3 block">Metode Pengiriman</label>
        <div className="space-y-2">
          {SHIPPING_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center justify-between p-4 rounded-sm border-2 cursor-pointer transition-all min-h-0 ${
                shipping === opt.value
                  ? 'border-primary bg-green-50'
                  : 'border-border hover:border-primary-light'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shipping"
                  value={opt.value}
                  checked={shipping === opt.value}
                  onChange={e => setShipping(e.target.value as ShippingMethod)}
                  className="w-5 h-5 accent-primary min-h-0"
                />
                <div>
                  <div className="font-semibold text-fg-dark">{opt.label}</div>
                  <div className="text-caption text-fg/60">{opt.desc}</div>
                </div>
              </div>
              <div className="font-semibold text-primary-dark">
                {opt.cost === 0 ? 'Gratis' : formatRupiah(opt.cost)}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Ringkasan */}
      <div className="bg-surface-light rounded-sm p-4 space-y-2">
        <div className="flex justify-between text-body">
          <span className="text-fg/70">Subtotal ({quantity} {props.unit})</span>
          <span className="font-semibold">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-fg/70">Ongkir</span>
          <span className="font-semibold">{shippingCost === 0 ? 'Gratis' : formatRupiah(shippingCost)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between items-baseline">
          <span className="text-h4 text-fg-dark">Total</span>
          <span className="text-h2 text-primary-dark font-bold">{formatRupiah(total)}</span>
        </div>
      </div>

      {/* Info escrow */}
      <div className="bg-green-50 border border-primary-light rounded-sm p-4">
        <p className="text-sm text-primary-dark">
          🔒 <strong>Dana aman.</strong> Uangmu ditahan oleh TaniConnect dan baru diteruskan ke petani setelah kamu konfirmasi barang diterima.
        </p>
      </div>

      {/* CTA */}
      <Button
        onClick={handleCheckout}
        fullWidth
        size="lg"
        loading={loading}
        disabled={props.maxQuantity < 1}
      >
        {props.maxQuantity < 1 ? 'Stok Habis' : `Bayar Sekarang · ${formatRupiah(total)}`}
      </Button>
    </div>
  )
}

export function CheckoutClient(props: Props) {
  return (
    <ToastProvider>
      <CheckoutFlow {...props} />
    </ToastProvider>
  )
}
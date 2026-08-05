'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatRupiah, generateIdempotencyKey, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { estimateDistanceBetweenCities } from '@/lib/geo-distance'

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

interface ShippingService {
  id: string
  service_name: string
  price_per_km: number
  minimum_cost: number
  estimated_delivery: string
  max_coverage_km?: number
}

interface Props {
  productId:    string
  productName:  string
  pricePerUnit: number
  unit:         string
  maxQuantity:  number
  isAuction:    boolean
  currentBid:   number | null
  sellerName?:  string
  sellerCity?:  string
  shippingServices: ShippingService[]
}

function CheckoutFlow(props: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [quantity, setQuantity] = useState(1)
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    props.shippingServices[0]?.id ?? ''
  )
  const [distanceKm, setDistanceKm] = useState<string>('')
  const [buyerCityInput, setBuyerCityInput] = useState<string>('')
  const [calculatingGeo, setCalculatingGeo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [snapReady, setSnapReady] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser({ id: data.user.id })
        // Fetch buyer city from profile if available
        const { data: profile } = await supabase
          .from('profiles')
          .select('city')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profile?.city) {
          setBuyerCityInput(profile.city)
          if (props.sellerCity) {
            const estimated = estimateDistanceBetweenCities(props.sellerCity, profile.city)
            if (estimated !== null) {
              setDistanceKm(String(estimated))
            }
          }
        }
      }
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
  }, [supabase, toast, props.sellerCity])

  const handleAutoEstimateDistance = () => {
    if (!props.sellerCity) {
      toast('Lokasi penjual belum dikonfigurasi', 'info')
      return
    }
    if (!buyerCityInput.trim()) {
      toast('Masukkan nama kota Anda terlebih dahulu', 'warning')
      return
    }

    setCalculatingGeo(true)
    const estimated = estimateDistanceBetweenCities(props.sellerCity, buyerCityInput)
    setCalculatingGeo(false)

    if (estimated !== null) {
      setDistanceKm(String(estimated))
      toast(`Estimasi jarak dari ${props.sellerCity} ke ${buyerCityInput}: ${estimated} KM`, 'info')
    } else {
      toast(`Tidak dapat memperkirakan jarak ${props.sellerCity} - ${buyerCityInput}. Silakan masukkan jarak manual.`, 'warning')
    }
  }

  // Calculate shipping cost & coverage check
  const selectedService = props.shippingServices.find(s => s.id === selectedServiceId)
  const distance = Number(distanceKm) || 0
  const maxCoverage = selectedService?.max_coverage_km ?? 50
  const isOverCoverage = distance > maxCoverage

  const calculatedShipping = selectedService
    ? Math.max(distance * selectedService.price_per_km, selectedService.minimum_cost)
    : 0
  const shippingCost = distance > 0 && !isOverCoverage ? calculatedShipping : 0

  const subtotal = props.pricePerUnit * quantity
  const total    = subtotal + shippingCost
  const outOfStock = props.maxQuantity < 1
  const hasShipping = props.shippingServices.length > 0

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

    if (hasShipping && !selectedServiceId) {
      toast('Pilih layanan pengiriman terlebih dahulu', 'warning')
      return
    }

    if (hasShipping && distance <= 0) {
      toast('Masukkan estimasi jarak pengiriman (KM)', 'warning')
      return
    }

    if (hasShipping && isOverCoverage) {
      toast(`Jarak pengiriman (${distance} KM) melebihi jangkauan maksimum penjual (${maxCoverage} KM)`, 'error')
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
          product_id:          props.productId,
          quantity,
          shipping_service_id: selectedServiceId || undefined,
          shipping_cost:       shippingCost,
          distance_km:         distance || undefined,
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

      {/* Pengiriman — Seller's shipping services */}
      {hasShipping ? (
        <div className="flex items-start gap-4 mb-5">
          <span className="text-sm text-gray-500 w-24 shrink-0 pt-1">Pengiriman</span>
          <div className="flex-1 space-y-3">
            {/* Shipping service selection */}
            <div className="space-y-2">
              {props.shippingServices.map(svc => (
                <label
                  key={svc.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all min-h-0',
                    selectedServiceId === svc.id
                      ? 'border-green-500 bg-green-50/60 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shipping_service"
                      value={svc.id}
                      checked={selectedServiceId === svc.id}
                      onChange={() => setSelectedServiceId(svc.id)}
                      className="accent-green-600 min-h-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">🚚 {svc.service_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                        <span>Rp {formatRupiah(svc.price_per_km, false)}/KM</span>
                        <span>•</span>
                        <span>Min. {formatRupiah(svc.minimum_cost)}</span>
                        <span>•</span>
                        <span>⏱️ {svc.estimated_delivery}</span>
                        <span>•</span>
                        <span className="font-semibold text-blue-600">🗺️ Maks {svc.max_coverage_km ?? 50} KM</span>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Distance input with auto-calculator */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600">
                  📍 Estimasi Jarak dari Penjual (KM)
                </label>
                {props.sellerCity && (
                  <span className="text-[11px] text-gray-400">
                    Asal: <b>{props.sellerCity}</b>
                  </span>
                )}
              </div>

              {/* City auto-calculator input row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={buyerCityInput}
                  onChange={(e) => setBuyerCityInput(e.target.value)}
                  placeholder="Kota tujuan Anda (misal: Bogor, Bandung)"
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500/20"
                />
                <button
                  type="button"
                  onClick={handleAutoEstimateDistance}
                  disabled={calculatingGeo}
                  className="px-2.5 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-semibold rounded-md transition-colors shrink-0"
                >
                  ⚡ hitung Jarak
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="Atau masukkan KM manual"
                  min="0.1"
                  step="0.1"
                  className={cn(
                    'flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20',
                    isOverCoverage ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 focus:border-green-400',
                  )}
                />
                <span className="text-sm text-gray-400 font-medium">KM</span>
              </div>

              {/* Coverage warning */}
              {isOverCoverage && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2 flex items-center gap-2">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-xs text-red-600 font-medium">
                    Jarak pengiriman ({distance} KM) melebihi jangkauan maksimum penjual ({maxCoverage} KM).
                  </p>
                </div>
              )}

              {/* Ongkir calculation preview */}
              {distance > 0 && !isOverCoverage && selectedService && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {distance} KM × {formatRupiah(selectedService.price_per_km)} = {formatRupiah(distance * selectedService.price_per_km)}
                    </span>
                  </div>
                  {distance * selectedService.price_per_km < selectedService.minimum_cost && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      ⚠️ Di bawah biaya minimum → dibulatkan ke {formatRupiah(selectedService.minimum_cost)}
                    </p>
                  )}
                  <p className="text-sm font-bold text-green-700 mt-1">
                    Ongkir: {formatRupiah(shippingCost)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 mb-5">
          <span className="text-sm text-gray-500 w-24 shrink-0 pt-1">Pengiriman</span>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
            <p className="text-sm text-gray-500">
              🚚 Hubungi penjual untuk mengatur pengiriman
            </p>
          </div>
        </div>
      )}

      {/* Ringkasan harga */}
      <div className="border-t border-gray-100 pt-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({quantity} {props.unit})</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Ongkos Kirim</span>
          <span>{shippingCost === 0 ? (hasShipping ? 'Masukkan jarak' : 'Gratis') : formatRupiah(shippingCost)}</span>
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
          <MobileLink
            href="/pembeli/marketplace"
            className="flex flex-col items-center justify-center w-12 text-[10px] text-gray-500 min-h-0"
          >
            <span className="text-lg">🏠</span>
            Beranda
          </MobileLink>
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

function MobileLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
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

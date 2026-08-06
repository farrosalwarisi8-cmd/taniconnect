// components/ui/CartButton.tsx
//
// Ikon keranjang dengan badge jumlah item.
// Self-contained: fetch count sendiri via /api/cart/count (endpoint ringan).
// Auto-hide kalau user belum login (biar tidak berkedip kosong).
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CartButtonProps {
  /** Variant tampilan — 'compact' untuk navbar, 'full' untuk sidebar */
  variant?: 'compact' | 'full'
  className?: string
}

export function CartButton({ variant = 'compact', className }: CartButtonProps) {
  const [count, setCount] = useState<number>(0)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const fetchCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return

        if (!user) {
          setIsLoggedIn(false)
          setCount(0)
          setLoading(false)
          return
        }

        setIsLoggedIn(true)

        const res = await fetch('/api/cart/count', { cache: 'no-store' })
        if (!res.ok) {
          setCount(0)
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setCount(typeof data.count === 'number' ? data.count : 0)
        }
      } catch {
        // Ignore — badge cuma UI nice-to-have, jangan crash navbar
        if (!cancelled) setCount(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCount()

    // Refresh count saat auth state berubah (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCount()
    })

    // Listen ke custom event 'cart:updated' — dipicu setelah add-to-cart
    // supaya badge langsung update tanpa refresh halaman
    const handleCartUpdate = () => fetchCount()
    window.addEventListener('cart:updated', handleCartUpdate)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.removeEventListener('cart:updated', handleCartUpdate)
    }
  }, [])

  // Kalau belum login & belum selesai load, render placeholder tipis
  // (biar navbar layout tidak jumping)
  if (loading || !isLoggedIn) {
    return (
      <div
        className={cn(
          variant === 'compact' ? 'w-9 h-9' : 'w-full h-10',
          className,
        )}
        aria-hidden="true"
      />
    )
  }

  return (
    <Link
      href="/pembeli/keranjang"
      className={cn(
        'relative inline-flex items-center justify-center transition-colors min-h-0 touch-target-exempt',
        variant === 'compact'
          ? 'w-9 h-9 rounded-full hover:bg-surface'
          : 'w-full gap-2 px-3 py-2 rounded-xl hover:bg-surface text-sm text-fg/70',
        className,
      )}
      aria-label={count > 0 ? `Keranjang (${count} item)` : 'Keranjang kosong'}
      title="Keranjang belanja"
    >
      <span className="text-xl leading-none">🛒</span>

      {variant === 'full' && (
        <span className="font-medium">Keranjang</span>
      )}

      {count > 0 && (
        <span
          className={cn(
            'absolute bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center',
            variant === 'compact'
              ? '-top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1'
              : 'top-1 right-2 min-w-[20px] h-[20px] px-1.5',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ProfileAvatar } from '@/components/ui/ProfileAvatar'

const CATEGORIES = [
  { value: 'semua',      label: 'Semua',       icon: '🌿' },
  { value: 'sayuran',    label: 'Sayuran',     icon: '🥬' },
  { value: 'buah',       label: 'Buah',        icon: '🍎' },
  { value: 'beras_padi', label: 'Beras & Padi',icon: '🌾' },
  { value: 'rempah',     label: 'Rempah',      icon: '🌶️' },
]

interface MarketplaceHeaderProps {
  query:          string
  activeCategory: string
}

export function MarketplaceHeader({ query, activeCategory }: MarketplaceHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(query)

  useEffect(() => {
    setSearchValue(query)
  }, [query])

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '' || value === 'semua') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/pembeli/marketplace?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('q', searchValue.trim() || null)
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 space-y-3.5">
        {/* Top bar: Brand + Title + Profile Avatar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/pembeli/marketplace" className="flex items-center gap-2 min-h-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-white text-xl shadow-md">
                🌿
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-gray-900 text-lg tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  TaniConnect
                </span>
                <span className="text-[10px] text-green-700 font-semibold block -mt-1">Marketplace Panen</span>
              </div>
            </Link>
          </div>

          {/* Quick Action buttons + Profile */}
          <div className="flex items-center gap-2">
            <Link
              href="/prediksi-harga"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 font-semibold text-xs rounded-full transition-colors min-h-0 touch-target-exempt border border-green-200"
              title="Prediksi harga komoditas"
            >
              <span>🔮</span>
              <span className="hidden sm:inline">Prediksi Harga</span>
            </Link>

            <Link
              href="/tanya-ai"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-xs rounded-full transition-all shadow-sm hover:shadow min-h-0 touch-target-exempt"
              title="Chat AI Pak Tani"
            >
              <span>🤖</span>
              <span className="hidden sm:inline">Tanya AI</span>
            </Link>

            {/* ⭐ Profile Avatar Component with Role Dashboard link */}
            <ProfileAvatar />
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-green-200 rounded-2xl px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">💹</span>
            <p className="text-xs text-gray-700 truncate">
              <span className="font-bold text-green-800">Harga Pangan Real-time</span>
              <span className="hidden sm:inline text-gray-500"> — Data Bapanas & PIHPS BI</span>
            </p>
          </div>
          <Link
            href="/harga-pangan"
            className="text-xs font-bold text-green-700 hover:text-green-800 hover:underline shrink-0 min-h-0"
          >
            Cek Harga →
          </Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" aria-hidden="true">
              🔍
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Cari komoditas, buah, sayuran segar, lokasi..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 text-sm min-h-[46px] focus:bg-white focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all font-sans"
            />
          </div>
        </form>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => updateParam('category', cat.value)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all min-h-0 touch-target-exempt',
                  isActive
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-800',
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
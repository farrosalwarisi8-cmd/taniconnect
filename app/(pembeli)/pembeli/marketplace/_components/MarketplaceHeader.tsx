'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

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

  // Sync state dengan URL param
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
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Judul */}
        <div>
          <h1 className="text-h2 text-fg-dark">Cari hasil panen segar 🌿</h1>
          <p className="text-caption text-fg/60">Langsung dari petani, tanpa perantara</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-light" aria-hidden="true">
              🔍
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Cari produk, lokasi, petani..."
              className="w-full bg-surface-light border border-border rounded-full pl-12 pr-4 text-base min-h-[52px] focus:outline-none focus:border-primary focus:shadow-focus"
            />
          </div>
        </form>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => updateParam('category', cat.value)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-0',
                  isActive
                    ? 'bg-primary text-white shadow-btn-primary'
                    : 'bg-surface-light text-fg/70 hover:bg-primary/10 hover:text-primary-dark',
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
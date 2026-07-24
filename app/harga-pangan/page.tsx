'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatRupiah, formatDateID } from '@/lib/utils'
import { HargaPanganChart } from './_components/HargaPanganChart'
import { cn } from '@/lib/utils'

interface PriceItem {
  commodity: string
  commodity_key: string
  unit: string
  region: string
  price: number
  previous_price: number
  change_percent: number
  trend: 'up' | 'down' | 'stable'
  volatility: number
  seasonality: string
  last_updated: string
}

interface HistoricalRegion {
  region: string
  data: { date: string; price: number }[]
}

interface ApiResponse {
  results: PriceItem[]
  historical: HistoricalRegion[] | null
  total: number
  last_updated: string
  sources: string[]
}

const COMMODITIES = [
  { key: 'cabai merah',   label: 'Cabai Merah',    emoji: '🌶️' },
  { key: 'cabai rawit',   label: 'Cabai Rawit',    emoji: '🌶️' },
  { key: 'bawang merah',  label: 'Bawang Merah',   emoji: '🧅' },
  { key: 'bawang putih',  label: 'Bawang Putih',   emoji: '🧄' },
  { key: 'beras premium', label: 'Beras Premium',  emoji: '🍚' },
  { key: 'tomat',         label: 'Tomat',          emoji: '🍅' },
  { key: 'jagung',        label: 'Jagung',         emoji: '🌽' },
  { key: 'kopi arabika',  label: 'Kopi Arabika',   emoji: '☕' },
  { key: 'telur ayam',    label: 'Telur Ayam',     emoji: '🥚' },
  { key: 'daging sapi',   label: 'Daging Sapi',    emoji: '🥩' },
]

const REGIONS = [
  '', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Bali', 'Sumatera Utara', 'Sulawesi Selatan',
]

export default function HargaPanganPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCommodity, setFilterCommodity] = useState('cabai merah')
  const [filterRegion, setFilterRegion] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filterCommodity) params.set('commodity', filterCommodity)
        if (filterRegion) params.set('region', filterRegion)

        const res = await fetch(`/api/harga-pangan/list?${params}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [filterCommodity, filterRegion])

  const sortedResults = useMemo(() => {
    if (!data?.results) return []
    return [...data.results].sort((a, b) => a.price - b.price)
  }, [data])

  const priceRange = useMemo(() => {
    if (sortedResults.length === 0) return null
    return {
      min: sortedResults[0],
      max: sortedResults[sortedResults.length - 1],
      avg: Math.round(sortedResults.reduce((s, r) => s + r.price, 0) / sortedResults.length),
    }
  }, [sortedResults])

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') return `📈 +${change.toFixed(1)}%`
    if (trend === 'down') return `📉 ${change.toFixed(1)}%`
    return `➡️ ${change.toFixed(1)}%`
  }

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-error'
    if (trend === 'down') return 'text-success'
    return 'text-fg/60'
  }

  return (
    <main className="min-h-screen bg-surface-light pb-16">
      <div className="gradient-dashboard px-4 sm:px-6 pt-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="text-white font-semibold text-lg inline-flex items-center min-h-0"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
            >
              🌿 TaniConnect
            </Link>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="text-white/90 hover:text-white text-sm font-medium min-h-0 px-3 py-1"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="bg-white text-primary-dark px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-50 min-h-0"
              >
                Daftar
              </Link>
            </div>
          </nav>

          <div className="text-center mb-6">
            <div className="text-6xl mb-4">💹</div>
            <h1
              className="text-white mb-3"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(28px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.1 }}
            >
              Harga Pangan Hari Ini
            </h1>
            <p className="text-white/90 text-body max-w-2xl mx-auto">
              Data harga real dari pasar & platform TaniConnect, diperbarui setiap hari.
              Akses gratis untuk masyarakat umum.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Badge variant="verified" size="sm">✓ PIHPS Bank Indonesia</Badge>
              <Badge variant="verified" size="sm">✓ Panel Harga Bapanas</Badge>
              <Badge variant="verified" size="sm">✓ TaniConnect Marketplace</Badge>
            </div>
            {data && (
              <p className="text-white/70 text-caption mt-3">
                🕐 Terakhir diperbarui: {formatDateID(data.last_updated, 'full')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 space-y-6">
        <Card variant="elevated" padding="lg">
          <div className="space-y-4">
            <div>
              <label className="text-caption text-fg/60 font-semibold mb-2 block">
                🌾 Pilih Komoditas
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMODITIES.map(c => {
                  const isActive = filterCommodity === c.key
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setFilterCommodity(c.key)}
                      className={cn(
                        'px-4 py-2 rounded-full border text-sm transition-all min-h-0',
                        isActive
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-surface-light border-border text-fg hover:border-primary'
                      )}
                    >
                      {c.emoji} {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-caption text-fg/60 font-semibold mb-2 block">
                📍 Filter Wilayah (opsional)
              </label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(r => {
                  const isActive = filterRegion === r
                  const label = r || 'Semua Wilayah'
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFilterRegion(r)}
                      className={cn(
                        'px-3 py-1.5 rounded-full border text-xs transition-all min-h-0',
                        isActive
                          ? 'bg-primary-dark text-white border-primary-dark'
                          : 'bg-surface-light border-border text-fg/70 hover:border-primary-light'
                      )}
                    >
                      {r ? '📍 ' : '🇮🇩 '}{label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>

        {loading && (
          <div className="space-y-4">
            <Skeleton height={200} />
            <Skeleton height={400} />
          </div>
        )}

        {!loading && priceRange && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card variant="standard" padding="md" className="!bg-green-50">
              <p className="text-caption text-fg/60 mb-1">🟢 Termurah</p>
              <p className="text-h4 font-bold text-success">
                {formatRupiah(priceRange.min.price)}
              </p>
              <p className="text-caption text-fg/60 mt-1">
                📍 {priceRange.min.region}
              </p>
            </Card>

            <Card variant="standard" padding="md" className="!bg-white">
              <p className="text-caption text-fg/60 mb-1">⚪ Rata-rata</p>
              <p className="text-h4 font-bold text-primary-dark">
                {formatRupiah(priceRange.avg)}
              </p>
              <p className="text-caption text-fg/60 mt-1">
                per {sortedResults[0]?.unit ?? 'kg'}
              </p>
            </Card>

            <Card variant="standard" padding="md" className="!bg-red-50 col-span-2 sm:col-span-1">
              <p className="text-caption text-fg/60 mb-1">🔴 Termahal</p>
              <p className="text-h4 font-bold text-error">
                {formatRupiah(priceRange.max.price)}
              </p>
              <p className="text-caption text-fg/60 mt-1">
                📍 {priceRange.max.region}
              </p>
            </Card>
          </div>
        )}

        {!loading && data?.historical && data.historical.length > 0 && (
          <Card variant="standard" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-h4 text-fg-dark">📊 Tren Harga 30 Hari</h3>
                <p className="text-caption text-fg/60">
                  Perbandingan {data.historical.length} wilayah teratas
                </p>
              </div>
              <Badge variant="verified" size="sm">Data Historis</Badge>
            </div>
            <HargaPanganChart regions={data.historical} />
          </Card>
        )}

        {!loading && sortedResults.length > 0 && (
          <Card variant="standard" padding="none">
            <div className="p-6 border-b border-border">
              <h3 className="text-h4 text-fg-dark">
                💰 Harga per Wilayah ({sortedResults.length} data)
              </h3>
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-light border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-fg-dark">Komoditas</th>
                    <th className="px-4 py-3 text-left font-semibold text-fg-dark">Wilayah</th>
                    <th className="px-4 py-3 text-right font-semibold text-fg-dark">Harga</th>
                    <th className="px-4 py-3 text-right font-semibold text-fg-dark">Perubahan</th>
                    <th className="px-4 py-3 text-center font-semibold text-fg-dark">Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((item, i) => {
                    const isMin = item.price === priceRange?.min.price
                    const isMax = item.price === priceRange?.max.price
                    return (
                      <tr
                        key={`${item.commodity_key}-${item.region}-${i}`}
                        className={cn(
                          'border-b border-border last:border-b-0 hover:bg-surface-light transition-colors',
                          isMin && 'bg-green-50/50',
                          isMax && 'bg-red-50/50',
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-fg-dark">{item.commodity}</div>
                          <div className="text-caption text-fg/60">per {item.unit}</div>
                        </td>
                        <td className="px-4 py-3 text-fg">
                          📍 {item.region}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-fg-dark">
                            {formatRupiah(item.price)}
                          </div>
                          {isMin && <Badge variant="success" size="sm">Termurah</Badge>}
                          {isMax && <Badge variant="error" size="sm">Termahal</Badge>}
                        </td>
                        <td className={cn('px-4 py-3 text-right text-sm font-semibold', getTrendColor(item.trend))}>
                          {getTrendIcon(item.trend, item.change_percent)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="neutral" size="sm">PIHPS</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {sortedResults.map((item, i) => {
                const isMin = item.price === priceRange?.min.price
                const isMax = item.price === priceRange?.max.price
                return (
                  <div
                    key={`${item.commodity_key}-${item.region}-${i}`}
                    className={cn(
                      'p-4',
                      isMin && 'bg-green-50/50',
                      isMax && 'bg-red-50/50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-fg-dark">{item.commodity}</p>
                        <p className="text-caption text-fg/60">📍 {item.region}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-fg-dark">{formatRupiah(item.price)}</p>
                        <p className={cn('text-caption font-semibold', getTrendColor(item.trend))}>
                          {getTrendIcon(item.trend, item.change_percent)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isMin && <Badge variant="success" size="sm">Termurah</Badge>}
                      {isMax && <Badge variant="error" size="sm">Termahal</Badge>}
                      <Badge variant="neutral" size="sm">PIHPS</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {!loading && sortedResults.length === 0 && (
          <Card variant="subtle" padding="lg" className="text-center border-dashed">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-body text-fg/60">Tidak ada data untuk filter ini.</p>
          </Card>
        )}

        <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-primary to-primary-dark text-white text-center">
          <div className="text-5xl mb-3">🌾</div>
          <h3 className="text-h2 text-white mb-2 font-bold">
            Petani? Jual Hasil Panen di Harga Ini!
          </h3>
          <p className="text-white/90 mb-6">
            Daftar gratis di TaniConnect dan jual langsung ke pembeli tanpa perantara.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-block bg-white text-primary-dark font-semibold rounded-sm px-6 py-3 min-h-[48px] hover:bg-green-50"
            >
              Daftar Sekarang
            </Link>
            <Link
              href="/pembeli/marketplace"
              className="inline-block bg-white/20 border border-white/40 text-white font-medium rounded-sm px-6 py-3 min-h-[48px] hover:bg-white/30"
            >
              Jelajah Marketplace
            </Link>
          </div>
        </Card>

        <div className="text-center text-caption text-fg/60 py-6">
          <p>Data adalah estimasi harga berdasarkan referensi pasar nasional.</p>
          <p>Harga aktual dapat berbeda tergantung lokasi & kualitas komoditas.</p>
        </div>
      </div>
    </main>
  )
}
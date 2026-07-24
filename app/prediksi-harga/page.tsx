'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatRupiah } from '@/lib/utils'
import { PriceChart } from './_components/PriceChart'

interface PredictionResult {
  commodity: string
  region: string
  current_price: number
  historical: { date: string; price: number }[]
  prediction: {
    prediction: 'naik' | 'turun' | 'stabil'
    confidence: number
    predicted_price_range: { min: number; max: number }
    reasoning: string
    recommendation: string
    factors: string[]
  }
  metadata?: {
    data_source: string
    reference_price?: {
      key: string
      nasional_min: number
      nasional_max: number
      nasional_avg: number
      volatility: number
      seasonality: string
    } | null
    stats?: {
      avg: number
      min: number
      max: number
    } | null
  }
}

// Komoditas populer — harga referensi otomatis diambil dari database backend
const COMMON_COMMODITIES = [
  { name: 'Cabai Merah',    emoji: '🌶️' },
  { name: 'Cabai Rawit',    emoji: '🌶️' },
  { name: 'Bawang Merah',   emoji: '🧅' },
  { name: 'Bawang Putih',   emoji: '🧄' },
  { name: 'Beras Premium',  emoji: '🍚' },
  { name: 'Beras Medium',   emoji: '🍚' },
  { name: 'Tomat',          emoji: '🍅' },
  { name: 'Kentang',        emoji: '🥔' },
  { name: 'Jagung',         emoji: '🌽' },
  { name: 'Wortel',         emoji: '🥕' },
  { name: 'Kopi Arabika',   emoji: '☕' },
  { name: 'Kopi Robusta',   emoji: '☕' },
  { name: 'Alpukat',        emoji: '🥑' },
  { name: 'Mangga',         emoji: '🥭' },
  { name: 'Pisang',         emoji: '🍌' },
  { name: 'Telur Ayam',     emoji: '🥚' },
]

const POPULAR_REGIONS = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Bali', 'Sumatera Utara', 'Sulawesi Selatan',
]

function PredictionFlow() {
  const { toast } = useToast()
  const [commodity, setCommodity] = useState('')
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!commodity.trim()) {
      toast('Pilih atau ketik nama komoditas', 'warning')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/ai/price-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: commodity.trim(),
          region: region.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal prediksi')
      }

      const data = await res.json()
      setResult(data)
      toast('Prediksi berhasil dibuat!', 'success')

      // Scroll ke hasil
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 200)
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectCommodity = (item: { name: string }) => {
    setCommodity(item.name)
  }

  const getTrendColor = (trend: string) => {
    if (trend === 'naik') return 'success'
    if (trend === 'turun') return 'error'
    return 'info'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'naik') return '📈'
    if (trend === 'turun') return '📉'
    return '➡️'
  }

  return (
    <main className="min-h-screen bg-surface-light pb-24">
      {/* Header */}
      <div className="gradient-dashboard px-4 sm:px-6 pt-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/petani/dashboard"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 min-h-0"
          >
            ← Kembali
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0">
              🔮
            </div>
            <div>
              <h1
                className="text-white leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800 }}
              >
                Cek Harga Pasar & Prediksi
              </h1>
              <p className="text-white/80 text-caption mt-1">
                Cari tahu harga rata-rata & prediksi tren komoditas
              </p>
              <p className="text-white/60 text-[11px] mt-1">
                📊 Data referensi: PIHPS Bank Indonesia & Bapanas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Form Card */}
        <Card variant="elevated" padding="lg">
          <form onSubmit={handlePredict} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-fg mb-2 block">
                Pilih komoditas:
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_COMMODITIES.map(item => {
                  const isActive = commodity.toLowerCase() === item.name.toLowerCase()
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => selectCommodity(item)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all min-h-0 ${
                        isActive
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-surface-light border-border text-fg hover:border-primary hover:bg-green-50'
                      }`}
                    >
                      <span className="mr-1">{item.emoji}</span>
                      {item.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <Input
              label="Atau ketik nama komoditas lain"
              placeholder="Contoh: Cengkeh, Lada Hitam, Salak"
              value={commodity}
              onChange={e => setCommodity(e.target.value)}
              required
            />

            <div>
              <label className="text-sm font-semibold text-fg mb-2 block">
                Pilih wilayah (opsional):
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {POPULAR_REGIONS.map(r => {
                  const isActive = region === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(isActive ? '' : r)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all min-h-0 ${
                        isActive
                          ? 'bg-primary-dark text-white border-primary-dark'
                          : 'bg-surface-light border-border text-fg/70 hover:border-primary-light'
                      }`}
                    >
                      📍 {r}
                    </button>
                  )
                })}
              </div>
              <Input
                placeholder="Atau ketik wilayah lain (misal: Kabupaten Brebes)"
                value={region}
                onChange={e => setRegion(e.target.value)}
              />
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              🔮 Cek Harga & Prediksi
            </Button>
          </form>
        </Card>

        {/* Result */}
        {result && (
          <div id="result-section" className="space-y-6 animate-slide-in-right">
            {/* Current Price Highlight */}
            <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-green-50 to-white">
              <div className="text-center mb-6">
                <p className="text-caption text-fg/60 mb-1">Harga Rata-rata Pasar</p>
                <h2 className="text-h2 text-fg-dark font-bold mb-2">{result.commodity}</h2>
                <p className="text-caption text-fg/60 mb-3">📍 {result.region}</p>
                <p
                  className="text-primary-dark font-extrabold"
                  style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(36px, 8vw, 56px)', lineHeight: 1 }}
                >
                  {formatRupiah(result.current_price)}
                </p>
                <p className="text-caption text-fg/60 mt-2">per kg</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                <div className="text-center p-3 bg-white rounded-sm border border-border">
                  <div className="text-2xl mb-1">{getTrendIcon(result.prediction.prediction)}</div>
                  <p className="text-caption text-fg/60">Tren 7 Hari</p>
                  <Badge variant={getTrendColor(result.prediction.prediction)} size="sm">
                    {result.prediction.prediction.toUpperCase()}
                  </Badge>
                </div>

                <div className="text-center p-3 bg-white rounded-sm border border-border">
                  <p className="text-caption text-fg/60 mb-1">Prediksi Range</p>
                  <p className="text-xs font-bold text-fg-dark">
                    {formatRupiah(result.prediction.predicted_price_range.min, false)}
                  </p>
                  <p className="text-[10px] text-fg/60">s/d</p>
                  <p className="text-xs font-bold text-fg-dark">
                    {formatRupiah(result.prediction.predicted_price_range.max, false)}
                  </p>
                </div>

                <div className="text-center p-3 bg-white rounded-sm border border-border">
                  <div className="text-2xl mb-1">🎯</div>
                  <p className="text-caption text-fg/60">Confidence</p>
                  <p className="text-h4 font-bold text-primary-dark">{result.prediction.confidence}%</p>
                </div>
              </div>
            </Card>

            {/* Reference Data */}
            {result.metadata?.reference_price && (
              <Card variant="subtle" padding="md">
                <p className="text-caption text-fg/60 mb-3 font-semibold">
                  📊 Rentang Harga Nasional (PIHPS BI & Bapanas)
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-green-50 rounded-sm">
                    <p className="text-caption text-fg/60">Terendah</p>
                    <p className="text-sm font-bold text-success">
                      {formatRupiah(result.metadata.reference_price.nasional_min)}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-sm border border-primary">
                    <p className="text-caption text-fg/60">Rata-rata</p>
                    <p className="text-sm font-bold text-primary-dark">
                      {formatRupiah(result.metadata.reference_price.nasional_avg)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-sm">
                    <p className="text-caption text-fg/60">Tertinggi</p>
                    <p className="text-sm font-bold text-error">
                      {formatRupiah(result.metadata.reference_price.nasional_max)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 justify-center flex-wrap">
                  <Badge variant="info" size="sm">
                    Volatilitas: {Math.round(result.metadata.reference_price.volatility * 100)}%
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    Sensitivitas musim: {result.metadata.reference_price.seasonality}
                  </Badge>
                </div>
              </Card>
            )}

            {/* Chart */}
            <Card variant="standard" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-h4 text-fg-dark">📊 Tren Harga 30 Hari</h3>
                <Badge variant="verified" size="sm">
                  ✓ Data Referensi Pasar
                </Badge>
              </div>
              <PriceChart data={result.historical} />
              {result.metadata?.stats && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-caption text-fg/60">Rata-rata 30 hari</p>
                    <p className="text-sm font-bold text-fg-dark">{formatRupiah(result.metadata.stats.avg)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-fg/60">Terendah</p>
                    <p className="text-sm font-bold text-success">{formatRupiah(result.metadata.stats.min)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-fg/60">Tertinggi</p>
                    <p className="text-sm font-bold text-error">{formatRupiah(result.metadata.stats.max)}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* AI Insight */}
            <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-green-50 to-white border-l-4 !border-l-primary">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h3 className="text-h4 text-fg-dark">Analisis AI</h3>
              </div>
              <p className="text-body text-fg mb-4">{result.prediction.reasoning}</p>

              <div className="bg-white rounded-sm p-4 border-l-4 border-l-primary mb-4">
                <p className="text-caption text-primary-dark font-semibold mb-1">💡 Rekomendasi</p>
                <p className="text-body text-fg">{result.prediction.recommendation}</p>
              </div>

              {result.prediction.factors && result.prediction.factors.length > 0 && (
                <div>
                  <p className="text-caption text-fg/60 mb-2 font-semibold">Faktor yang dipertimbangkan:</p>
                  <ul className="space-y-1">
                    {result.prediction.factors.map((f, i) => (
                      <li key={i} className="text-sm text-fg flex items-start gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Disclaimer */}
            <Card variant="subtle" padding="md" className="border-l-4 !border-l-amber">
              <p className="text-caption text-fg/70">
                ⚠️ <strong>Disclaimer:</strong> Harga & prediksi ini adalah estimasi berdasarkan data referensi PIHPS Bank Indonesia,
                Bapanas, dan analisis AI. Harga aktual di pasar bisa berbeda tergantung kualitas, musim, dan lokasi spesifik.
                Selalu konsultasi dengan penyuluh pertanian atau cek pasar setempat sebelum mengambil keputusan bisnis.
              </p>
            </Card>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null)
                  setCommodity('')
                  setRegion('')
                }}
              >
                🔄 Cek Komoditas Lain
              </Button>
              <Link href="/tanya-ai">
                <Button variant="primary">
                  🤖 Tanya AI Penyuluh
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <Card variant="subtle" padding="lg" className="text-center border-dashed">
            <div className="text-5xl mb-3">📈</div>
            <p className="text-body text-fg-dark font-semibold mb-2">Cek harga pasar komoditas favoritmu</p>
            <p className="text-body text-fg/60">
              Pilih komoditas di atas → kami akan tampilkan harga rata-rata + prediksi tren 7 hari ke depan.
            </p>
          </Card>
        )}
      </div>
    </main>
  )
}

export default function PrediksiHargaPage() {
  return (
    <ToastProvider>
      <PredictionFlow />
    </ToastProvider>
  )
}
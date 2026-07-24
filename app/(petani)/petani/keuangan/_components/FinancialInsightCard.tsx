'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatRupiah } from '@/lib/utils'

interface InsightData {
  empty: boolean
  message?: string
  insight?: string
  stats?: {
    totalIncome: number
    totalExpense: number
    profit: number
    marginPct: number
    recordCount: number
  }
  topExpenses?: Array<{ category: string; amount: number }>
  marketPrices?: Array<{ commodity: string; trend_7d: string; current_price: number }>
  creditScore?: number
  creditScoreLabel?: {
    label: string
    color: 'success' | 'info' | 'warning' | 'error'
    description: string
  }
  generated_at?: string
}

export function FinancialInsightCard() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<InsightData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateInsight = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/financial-insight', {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal generate insight')
      }

      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Format insight text — support **bold** dan bullet
  const formatInsightText = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Skip empty lines
      if (!line.trim()) return <div key={i} className="h-2" />

      // Parse bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      const formatted = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="text-primary-dark">{part.slice(2, -2)}</strong>
        }
        return <span key={j}>{part}</span>
      })

      // Bullet points
      if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
        return (
          <div key={i} className="flex gap-2 pl-2">
            <span className="text-primary shrink-0">•</span>
            <span>{formatted}</span>
          </div>
        )
      }

      return <p key={i} className="text-body text-fg leading-relaxed">{formatted}</p>
    })
  }

  const getTrendColor = (trend: string) => {
    if (trend.startsWith('+')) return 'text-error'
    if (trend.startsWith('-')) return 'text-success'
    return 'text-fg/60'
  }

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return '📈'
    if (trend.startsWith('-')) return '📉'
    return '➡️'
  }

  // ─── Initial State (belum generate) ────────────────────────
  if (!data && !loading && !error) {
    return (
      <Card
        variant="elevated"
        padding="lg"
        className="!bg-gradient-to-br from-primary to-primary-dark text-white text-center"
      >
        <div className="text-5xl mb-3">🤖</div>
        <h3 className="text-h2 text-white font-bold mb-2">
          Butuh Analisis Keuangan?
        </h3>
        <p className="text-white/90 mb-6 max-w-md mx-auto">
          AI TaniConnect akan analisa data keuanganmu & kasih rekomendasi konkret
          berdasarkan tren harga pasar terkini.
        </p>
        <Button
          onClick={generateInsight}
          size="lg"
          className="!bg-white !text-primary-dark hover:!bg-green-50"
        >
          ✨ Generate Insight AI
        </Button>
        <p className="text-white/60 text-caption mt-4">
          🔒 Gratis · Data hanya untuk analisis, tidak dibagikan
        </p>
      </Card>
    )
  }

  // ─── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-green-50 to-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl animate-pulse">🤖</div>
          <div>
            <p className="text-h4 font-bold text-primary-dark">AI sedang menganalisa...</p>
            <p className="text-caption text-fg/60">Membaca data keuangan + harga pasar terkini</p>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton height={20} width="90%" />
          <Skeleton height={20} width="75%" />
          <Skeleton height={20} width="85%" />
          <Skeleton height={80} className="mt-4" />
        </div>
      </Card>
    )
  }

  // ─── Error State ───────────────────────────────────────────
  if (error) {
    return (
      <Card variant="standard" padding="lg" className="border-l-4 !border-l-error">
        <p className="text-body text-error font-semibold mb-2">⚠️ Gagal generate insight</p>
        <p className="text-caption text-fg/70 mb-4">{error}</p>
        <Button variant="secondary" onClick={generateInsight} size="sm">
          🔄 Coba Lagi
        </Button>
      </Card>
    )
  }

  // ─── Empty State (belum ada data keuangan) ─────────────────
  if (data?.empty) {
    return (
      <Card variant="subtle" padding="lg" className="border-dashed border-2 !border-primary-light text-center">
        <div className="text-5xl mb-3">📝</div>
        <p className="text-body text-fg mb-4">{data.message}</p>
        <p className="text-caption text-fg/60">
          💡 Tips: Catat minimal 3-5 transaksi untuk mendapat insight yang bermanfaat.
        </p>
      </Card>
    )
  }

  // ─── Success State ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Insight Card */}
      <Card
        variant="elevated"
        padding="lg"
        className="!bg-gradient-to-br from-green-50 to-white border-l-4 !border-l-primary"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="text-4xl">🤖</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-h4 text-fg-dark font-bold">Insight AI TaniConnect</h3>
              <Badge variant="verified" size="sm">✨ Powered by AI</Badge>
            </div>
            <p className="text-caption text-fg/60">
              Berdasarkan data keuanganmu + harga pasar dari PIHPS BI & Bapanas
            </p>
          </div>
        </div>

        <div className="space-y-3 text-body text-fg leading-relaxed">
          {data?.insight && formatInsightText(data.insight)}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <p className="text-caption text-fg/50">
            🕐 Generated: {new Date(data?.generated_at ?? '').toLocaleTimeString('id-ID')}
          </p>
          <Button variant="secondary" size="sm" onClick={generateInsight}>
            🔄 Refresh Insight
          </Button>
        </div>
      </Card>

      {/* Credit Score Card */}
      {data?.creditScore !== undefined && data.creditScoreLabel && (
        <Card variant="standard" padding="lg">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-h4 text-fg-dark font-bold">🎯 Profil Keuangan Usahamu</h3>
              <p className="text-caption text-fg/60">Untuk pengajuan kredit koperasi/bank</p>
            </div>
            <Badge variant={data.creditScoreLabel.color} size="md">
              {data.creditScoreLabel.label}
            </Badge>
          </div>

          {/* Gauge visual */}
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={
                    data.creditScoreLabel.color === 'success' ? '#16A34A' :
                    data.creditScoreLabel.color === 'info' ? '#3B82F6' :
                    data.creditScoreLabel.color === 'warning' ? '#F59E0B' :
                    '#EF4444'
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.creditScore / 100) * 264} 264`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p
                  className="text-fg-dark font-extrabold leading-none"
                  style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 36 }}
                >
                  {data.creditScore}
                </p>
                <p className="text-caption text-fg/60">/100</p>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-body text-fg-dark mb-3">
                {data.creditScoreLabel.description}
              </p>
              {data.creditScore >= 50 && (
                <Button variant="primary" size="sm">
                  📥 Download Laporan untuk Kredit
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Top Expenses Card */}
      {data?.topExpenses && data.topExpenses.length > 0 && (
        <Card variant="standard" padding="lg">
          <h3 className="text-h4 text-fg-dark font-bold mb-3">💸 Top 3 Pengeluaran</h3>
          <div className="space-y-2">
            {data.topExpenses.map((exp, i) => {
              const totalExp = data.stats?.totalExpense ?? 1
              const percent = (exp.amount / totalExp) * 100
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-fg-dark font-medium">
                      {i + 1}. {exp.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-fg-dark font-bold">
                      {formatRupiah(exp.amount)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-caption text-fg/60">{percent.toFixed(1)}% dari total modal</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Market Prices Card (cross-reference) */}
      {data?.marketPrices && data.marketPrices.length > 0 && (
        <Card variant="standard" padding="lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-h4 text-fg-dark font-bold">📊 Harga Pasar Terkini</h3>
            <Badge variant="verified" size="sm">PIHPS + Bapanas</Badge>
          </div>
          <p className="text-caption text-fg/60 mb-4">
            Referensi untuk keputusan tanam & jual
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.marketPrices.map((m, i) => (
              <div
                key={i}
                className="p-3 bg-surface-light rounded-sm border border-border"
              >
                <p className="text-caption text-fg/60">{m.commodity}</p>
                <p className="text-sm font-bold text-fg-dark">{formatRupiah(m.current_price)}</p>
                <p className={`text-caption font-semibold ${getTrendColor(m.trend_7d)}`}>
                  {getTrendIcon(m.trend_7d)} {m.trend_7d}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
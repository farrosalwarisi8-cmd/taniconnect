import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { groq, GROQ_MODEL, FINANCIAL_INSIGHT_PROMPT } from '@/lib/groq'
import { REAL_BASE_PRICES, getRealPriceFromLatest } from '@/lib/price-data'
import { checkRateLimit } from '@/lib/rate-limit'

interface FinancialRecord {
  record_type: 'expense' | 'income'
  category: string
  item_name: string
  total_amount: number
  recorded_at: string
  quantity: number
  unit: string
}

interface Profile {
  full_name: string
  city: string | null
  province: string | null
}

export async function POST(_req: NextRequest) {
  try {
    // ─── 1. AUTH CHECK ────────────────────────────────────────
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. RATE LIMIT (5 req/menit — insight heavy operation) ─
    const rate = checkRateLimit({
      key:         `ai-insight:${user.id}`,
      maxRequests: 5,
      windowMs:    60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Tunggu 1 menit.' },
        { status: 429 }
      )
    }

    // ─── 3. Fetch profile & financial records ─────────────────
    const currentYear = new Date().getFullYear()

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, city, province')
      .eq('id', user.id)
      .single()

    const profile = profileData as Profile | null

    const { data: recordsData } = await supabase
      .from('financial_records')
      .select('record_type, category, item_name, total_amount, recorded_at, quantity, unit')
      .eq('farmer_id', user.id)
      .eq('season_year', currentYear)
      .order('recorded_at', { ascending: false })

    const records = (recordsData ?? []) as FinancialRecord[]

    if (records.length === 0) {
      return NextResponse.json({
        empty: true,
        message: 'Belum ada catatan keuangan tahun ini. Mulai catat modal & pendapatan untuk mendapatkan insight AI!',
      })
    }

    // ─── 4. Hitung statistik ──────────────────────────────────
    const expenses = records.filter(r => r.record_type === 'expense')
    const incomes = records.filter(r => r.record_type === 'income')

    const totalExpense = expenses.reduce((s, r) => s + Number(r.total_amount), 0)
    const totalIncome = incomes.reduce((s, r) => s + Number(r.total_amount), 0)
    const profit = totalIncome - totalExpense
    const marginPct = totalExpense > 0 ? (profit / totalExpense) * 100 : 0

    // Kategori pengeluaran terbesar
    const expenseByCategory: Record<string, number> = {}
    expenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.total_amount)
    })

    const topExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => ({ category: cat, amount: amt }))

    // ─── 5. Ambil data harga pangan untuk cross-reference ─────
    const topCommodities = ['cabai merah', 'cabai rawit', 'bawang merah', 'jagung', 'tomat', 'kentang']
    const marketPrices = topCommodities.map(key => {
      const priceData = getRealPriceFromLatest(key, profile?.province ?? undefined)
      const refData = REAL_BASE_PRICES[key]
      return {
        commodity: key,
        current_price: priceData?.price ?? refData?.avg ?? 0,
        trend_7d: priceData?.trend_7d ?? '0%',
        trend_30d: priceData?.trend_30d ?? '0%',
        volatility: refData?.volatility ?? 0,
      }
    })

    // ─── 6. Compute credit score informal (0-100) ─────────────
    const creditScore = calculateCreditScore({
      totalIncome,
      totalExpense,
      recordCount: records.length,
      hasIncome: incomes.length > 0,
      marginPct,
    })

    // ─── 7. Prepare prompt untuk LLM ──────────────────────────
    const marketContext = marketPrices
      .map(m => `- ${capitalize(m.commodity)}: ${m.trend_7d} minggu ini (volatilitas ${Math.round(m.volatility * 100)}%)`)
      .join('\n')

    const topExpenseContext = topExpenses
      .map(e => `- ${capitalize(e.category)}: Rp ${e.amount.toLocaleString('id-ID')}`)
      .join('\n')

    const recentActivities = records.slice(0, 5)
      .map(r => `- ${r.record_type === 'income' ? '💰' : '📦'} ${r.item_name}: Rp ${Number(r.total_amount).toLocaleString('id-ID')} (${r.recorded_at})`)
      .join('\n')

    const userPrompt = `Analisis keuangan usaha tani ${profile?.full_name ?? 'Petani'}${profile?.city ? ` di ${profile.city}, ${profile.province}` : ''} untuk musim tahun ${currentYear}.

**RINGKASAN KEUANGAN:**
- Total Modal/Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')} (${expenses.length} catatan)
- Total Pendapatan: Rp ${totalIncome.toLocaleString('id-ID')} (${incomes.length} catatan)
- Keuntungan Bersih: Rp ${profit.toLocaleString('id-ID')}
- Margin: ${marginPct.toFixed(1)}%
- Credit Score Informal: ${creditScore}/100

**TOP 3 PENGELUARAN:**
${topExpenseContext || '(belum ada pengeluaran tercatat)'}

**AKTIVITAS TERBARU:**
${recentActivities}

**KONDISI PASAR (dari PIHPS BI + Bapanas):**
${marketContext}

Berikan analisis dalam format berikut (dalam Bahasa Indonesia yang ramah & sederhana, sapaan "Bapak/Ibu"):

1. **RINGKASAN KINERJA** (1 paragraf pendek):
   - Sebutkan apakah untung/rugi, margin, dan bandingkan dengan rata-rata petani (>30% baik, >50% sangat baik)
   - Gunakan emoji 📈📉💰

2. **INSIGHT UTAMA** (1-2 paragraf):
   - Highlight kategori pengeluaran terbesar
   - Kalau margin < 20%, kasih peringatan
   - Kalau margin > 50%, kasih apresiasi

3. **REKOMENDASI KONKRET** (2-3 poin bullet):
   - Berdasarkan harga pasar terkini, rekomendasi komoditas untuk musim depan
   - Tips hemat modal (misal: pupuk organik vs kimia)
   - Peluang jual (kalau ada komoditas yang harganya lagi naik)

Format: gunakan **bold** untuk highlight, emoji secukupnya, dan hindari istilah teknis rumit.
Jangan pakai tag HTML. Jangan pakai heading markdown (##). Cukup bold dan bullet.`

    // ─── 8. Call Groq LLM ────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: FINANCIAL_INSIGHT_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    })

    const insight = completion.choices[0]?.message?.content ?? 'Belum dapat membuat insight saat ini.'

    // ─── 9. Response ──────────────────────────────────────────
    return NextResponse.json({
      empty: false,
      insight,
      stats: {
        totalIncome,
        totalExpense,
        profit,
        marginPct: Number(marginPct.toFixed(1)),
        recordCount: records.length,
      },
      topExpenses,
      marketPrices: marketPrices.map(m => ({
        commodity: capitalize(m.commodity),
        trend_7d: m.trend_7d,
        current_price: m.current_price,
      })),
      creditScore,
      creditScoreLabel: getCreditScoreLabel(creditScore),
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[FINANCIAL INSIGHT ERROR]', err)
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}

function capitalize(str: string): string {
  return str
    .split(/[\s_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Credit Score Informal (0-100)
 * Berdasarkan:
 * - Konsistensi pencatatan (30 poin)
 * - Rasio pendapatan/pengeluaran (40 poin)
 * - Jumlah aktivitas transaksi (20 poin)
 * - Presence of income (10 poin)
 */
function calculateCreditScore(params: {
  totalIncome: number
  totalExpense: number
  recordCount: number
  hasIncome: boolean
  marginPct: number
}): number {
  let score = 0

  // 1. Konsistensi pencatatan (max 30)
  if (params.recordCount >= 10) score += 30
  else if (params.recordCount >= 5) score += 20
  else if (params.recordCount >= 2) score += 10

  // 2. Margin (max 40)
  if (params.marginPct >= 50) score += 40
  else if (params.marginPct >= 30) score += 30
  else if (params.marginPct >= 15) score += 20
  else if (params.marginPct >= 0) score += 10

  // 3. Aktivitas (max 20)
  if (params.totalIncome > 5000000) score += 20
  else if (params.totalIncome > 1000000) score += 15
  else if (params.totalIncome > 500000) score += 10
  else if (params.totalIncome > 0) score += 5

  // 4. Presence of income (max 10)
  if (params.hasIncome) score += 10

  return Math.min(score, 100)
}

function getCreditScoreLabel(score: number): {
  label: string
  color: 'success' | 'info' | 'warning' | 'error'
  description: string
} {
  if (score >= 75) {
    return {
      label: 'Sangat Baik',
      color: 'success',
      description: 'Profil keuangan Anda kuat & konsisten. Cocok untuk pengajuan kredit koperasi.',
    }
  }
  if (score >= 50) {
    return {
      label: 'Baik',
      color: 'info',
      description: 'Riwayat keuangan cukup baik. Tingkatkan konsistensi pencatatan untuk skor lebih tinggi.',
    }
  }
  if (score >= 25) {
    return {
      label: 'Cukup',
      color: 'warning',
      description: 'Perlu lebih konsisten mencatat modal & pendapatan.',
    }
  }
  return {
    label: 'Perlu Perbaikan',
    color: 'error',
    description: 'Mulai catat modal & pendapatan secara rutin untuk membangun profil keuangan.',
  }
}
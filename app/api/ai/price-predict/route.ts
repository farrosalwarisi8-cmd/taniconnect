import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { groq, GROQ_MODEL, PRICE_PREDICTOR_PROMPT } from '@/lib/groq'
import { findCommodityData, getHistoricalPrices } from '@/lib/price-data'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  commodity: z.string().min(2).max(50),
  region: z.string().min(2).max(50).optional(),
})

/**
 * Regional price multiplier — harga per wilayah biasanya berbeda.
 * Wilayah timur / terpencil biasanya lebih mahal (transport cost).
 */
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  'dki jakarta':          1.15, // ibukota, permintaan tinggi
  'jawa barat':           1.05,
  'jawa tengah':          0.95, // banyak produksi
  'di yogyakarta':        1.00,
  'jawa timur':           0.95, // banyak produksi
  'banten':               1.10,
  'bali':                 1.20, // pariwisata, permintaan tinggi
  'sumatera utara':       1.05,
  'sumatera barat':       1.00,
  'riau':                 1.15,
  'sumatera selatan':     1.00,
  'lampung':              0.95,
  'kalimantan barat':     1.20,
  'kalimantan timur':     1.25,
  'sulawesi selatan':     1.10,
  'sulawesi utara':       1.15,
  'nusa tenggara barat':  1.15,
  'nusa tenggara timur':  1.25,
  'papua':                1.40, // paling mahal karena remote
}

function getRegionalMultiplier(region?: string): number {
  if (!region) return 1.0
  const key = region.toLowerCase().trim()

  // Exact match
  if (REGIONAL_MULTIPLIERS[key]) return REGIONAL_MULTIPLIERS[key]

  // Partial match
  for (const [k, v] of Object.entries(REGIONAL_MULTIPLIERS)) {
    if (key.includes(k) || k.includes(key)) return v
  }

  return 1.0
}

// Helper: tentukan musim Indonesia berdasarkan bulan
function getIndonesianSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 11 || month <= 3) return 'Musim Hujan (Nov-Mar)'
  if (month >= 5 && month <= 9) return 'Musim Kemarau (Mei-Sep)'
  return 'Musim Peralihan'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 })
    }

    const { commodity, region } = parsed.data

    // ─── 1. Cari data referensi komoditas ────────────────────
    const commodityRef = findCommodityData(commodity)

    if (!commodityRef) {
      return NextResponse.json({
        error: `Komoditas "${commodity}" belum ada di database referensi. Coba komoditas populer seperti Cabai, Beras, Bawang, atau Kopi.`
      }, { status: 404 })
    }

    // ─── 2. Hitung harga berdasarkan wilayah ─────────────────
    const regionalMultiplier = getRegionalMultiplier(region)
    const current_price = Math.round(commodityRef.avg * regionalMultiplier / 100) * 100

    const referenceInfo = {
      key: commodityRef.key,
      nasional_min: commodityRef.min,
      nasional_max: commodityRef.max,
      nasional_avg: commodityRef.avg,
      volatility: commodityRef.volatility,
      seasonality: commodityRef.seasonality,
    }

    // ─── 3. Get historical prices ────────────────────────────
    const { data: historical, source } = await getHistoricalPrices(
      commodityRef.key,
      current_price,
      region
    )

    // ─── 4. Prepare context untuk LLM ────────────────────────
    const historicalContext = historical
      .slice(-14)
      .map(h => `${h.date}: Rp ${h.price.toLocaleString('id-ID')}`)
      .join('\n')

    const priceStats = {
      avg: Math.round(historical.reduce((s, h) => s + h.price, 0) / historical.length),
      min: Math.min(...historical.map(h => h.price)),
      max: Math.max(...historical.map(h => h.price)),
    }

    const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' })
    const currentSeason = getIndonesianSeason()

    const userPrompt = `Analisis dan prediksi harga komoditas pertanian Indonesia berikut:

**KOMODITAS:** ${commodity}
**WILAYAH:** ${region || 'Nasional'}
**HARGA SAAT INI (rata-rata pasar):** Rp ${current_price.toLocaleString('id-ID')} per kg
**BULAN:** ${currentMonth}
**MUSIM:** ${currentSeason}
${region ? `**REGIONAL ADJUSTMENT:** ${((regionalMultiplier - 1) * 100).toFixed(0)}% vs nasional` : ''}

**DATA REFERENSI PASAR NASIONAL (PIHPS BI & Bapanas):**
- Rata-rata harga nasional: Rp ${referenceInfo.nasional_avg.toLocaleString('id-ID')}
- Rentang harga: Rp ${referenceInfo.nasional_min.toLocaleString('id-ID')} - Rp ${referenceInfo.nasional_max.toLocaleString('id-ID')}
- Volatilitas: ${Math.round(referenceInfo.volatility * 100)}%
- Sensitivitas musim: ${referenceInfo.seasonality}

**DATA HISTORIS 14 HARI TERAKHIR:**
${historicalContext}

**STATISTIK 30 HARI:**
- Rata-rata: Rp ${priceStats.avg.toLocaleString('id-ID')}
- Terendah: Rp ${priceStats.min.toLocaleString('id-ID')}
- Tertinggi: Rp ${priceStats.max.toLocaleString('id-ID')}

Berikan analisis dan prediksi harga untuk 7-14 hari ke depan dalam format JSON yang valid.
Pertimbangkan faktor:
1. Musim tanam/panen di wilayah tersebut
2. Cuaca (musim hujan Nov-Mar, kemarau Apr-Okt)
3. Hari besar & event (Idul Fitri, Natal, Tahun Baru)
4. Tren pasokan nasional
5. Volatilitas historis komoditas
6. Perbandingan dengan harga rata-rata nasional`

    // ─── 5. Call Groq LLM ────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: PRICE_PREDICTOR_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const rawContent = completion.choices[0]?.message?.content || '{}'

    let prediction
    try {
      prediction = JSON.parse(rawContent)
    } catch {
      prediction = {
        prediction: 'stabil',
        confidence: 50,
        predicted_price_range: { min: current_price * 0.95, max: current_price * 1.05 },
        reasoning: 'Data belum cukup untuk prediksi akurat.',
        recommendation: 'Pantau harga beberapa hari lagi.',
        factors: ['Data historis terbatas'],
      }
    }

    return NextResponse.json({
      commodity,
      region: region ?? 'Nasional',
      current_price,
      historical,
      prediction,
      metadata: {
        data_source: source,
        reference_price: referenceInfo,
        stats: priceStats,
        regional_adjustment: regionalMultiplier,
      },
    })
  } catch (err: any) {
    console.error('[PRICE PREDICT ERROR]', err)
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import {
  REAL_BASE_PRICES,
  generateRealisticHistoricalPrices,
  getRealPriceFromLatest,
} from '@/lib/price-data'

const REGIONS = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Banten', 'Bali', 'Sumatera Utara', 'Sumatera Barat',
  'Riau', 'Sumatera Selatan', 'Lampung', 'Kalimantan Barat',
  'Kalimantan Timur', 'Sulawesi Selatan', 'Sulawesi Utara',
  'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua',
]

// Fallback multiplier kalau region tidak ada di JSON
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  'DKI Jakarta':         1.15,
  'Jawa Barat':          1.05,
  'Jawa Tengah':         0.95,
  'DI Yogyakarta':       1.00,
  'Jawa Timur':          0.95,
  'Banten':              1.10,
  'Bali':                1.20,
  'Sumatera Utara':      1.05,
  'Sumatera Barat':      1.00,
  'Riau':                1.15,
  'Sumatera Selatan':    1.00,
  'Lampung':             0.95,
  'Kalimantan Barat':    1.20,
  'Kalimantan Timur':    1.25,
  'Sulawesi Selatan':    1.10,
  'Sulawesi Utara':      1.15,
  'Nusa Tenggara Barat': 1.15,
  'Nusa Tenggara Timur': 1.25,
  'Papua':               1.40,
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const filterCommodity = searchParams.get('commodity')?.toLowerCase()
    const filterRegion = searchParams.get('region')

    const results: Array<{
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
      source: string
    }> = []

    const commodityKeys = filterCommodity
      ? Object.keys(REAL_BASE_PRICES).filter(k => k.includes(filterCommodity))
      : Object.keys(REAL_BASE_PRICES)

    const targetRegions = filterRegion ? [filterRegion] : REGIONS

    for (const commodityKey of commodityKeys) {
      const commodityData = REAL_BASE_PRICES[commodityKey]

      for (const region of targetRegions) {
        // ⭐ Coba ambil dari JSON latest dulu
        const realPrice = getRealPriceFromLatest(commodityKey, region)

        let currentPrice: number
        let source: string

        if (realPrice) {
          currentPrice = realPrice.price
          source = 'PIHPS BI + Bapanas'
        } else {
          // Fallback: hitung dari base × regional multiplier
          const multiplier = REGIONAL_MULTIPLIERS[region] ?? 1.0
          currentPrice = Math.round(commodityData.avg * multiplier / 100) * 100
          source = 'Referensi Pasar'
        }

        // Generate previous price (kemarin) untuk hitung trend
        const historical = generateRealisticHistoricalPrices(commodityKey, currentPrice, 3)
        const yesterdayPrice = historical[historical.length - 2]?.price ?? currentPrice
        const changePercent = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (changePercent > 1) trend = 'up'
        else if (changePercent < -1) trend = 'down'

        results.push({
          commodity: capitalize(commodityKey),
          commodity_key: commodityKey,
          unit: commodityData.unit,
          region,
          price: currentPrice,
          previous_price: yesterdayPrice,
          change_percent: Number(changePercent.toFixed(2)),
          trend,
          volatility: commodityData.volatility,
          seasonality: commodityData.seasonality,
          last_updated: new Date().toISOString(),
          source,
        })
      }
    }

    let historicalData = null
    if (filterCommodity && commodityKeys.length === 1) {
      const commodityKey = commodityKeys[0]

      historicalData = targetRegions.slice(0, 5).map(region => {
        const realPrice = getRealPriceFromLatest(commodityKey, region)
        const basePrice = realPrice?.price ?? REAL_BASE_PRICES[commodityKey].avg

        return {
          region,
          data: generateRealisticHistoricalPrices(commodityKey, basePrice, 30),
        }
      })
    }

    return NextResponse.json({
      results,
      historical: historicalData,
      total: results.length,
      last_updated: new Date().toISOString(),
      sources: ['PIHPS Bank Indonesia', 'Panel Harga Bapanas', 'TaniConnect Marketplace'],
      data_source_mode: 'reference-latest',
    })
  } catch (err: any) {
    console.error('[HARGA PANGAN LIST ERROR]', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}

function capitalize(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
/**
 * Utility & Business Logic Layer untuk Layanan Pengiriman Milik Penjual
 */

export interface ShippingCalculationParams {
  distanceKm: number
  pricePerKm: number
  minimumCost: number
  maxCoverageKm?: number
}

export interface ShippingCalculationResult {
  rawCalculatedCost: number
  finalCost: number
  isMinimumApplied: boolean
  isOverCoverage: boolean
}

/**
 * Menghitung biaya pengiriman otomatis berdasarkan rumus:
 * total = max(distance_km * price_per_km, minimum_cost)
 */
export function calculateShippingCost({
  distanceKm,
  pricePerKm,
  minimumCost,
  maxCoverageKm = 50,
}: ShippingCalculationParams): ShippingCalculationResult {
  const safeDistance = Math.max(0, Number(distanceKm) || 0)
  const safePrice = Math.max(0, Number(pricePerKm) || 0)
  const safeMinCost = Math.max(0, Number(minimumCost) || 0)
  const safeMaxCoverage = Math.max(0, Number(maxCoverageKm) || 50)

  if (safeDistance <= 0) {
    return {
      rawCalculatedCost: 0,
      finalCost: 0,
      isMinimumApplied: false,
      isOverCoverage: false,
    }
  }

  const isOverCoverage = safeDistance > safeMaxCoverage
  const rawCalculatedCost = Math.round(safeDistance * safePrice)
  const finalCost = isOverCoverage ? 0 : Math.max(rawCalculatedCost, safeMinCost)
  const isMinimumApplied = !isOverCoverage && rawCalculatedCost < safeMinCost

  return {
    rawCalculatedCost,
    finalCost,
    isMinimumApplied,
    isOverCoverage,
  }
}

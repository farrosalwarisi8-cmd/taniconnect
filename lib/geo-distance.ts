/**
 * Utility Geolocation & Perhitungan Jarak Otomatis (Haversine & Database Kota)
 */

interface Coordinates {
  lat: number
  lng: number
}

// Koordinat kota-kota utama di Indonesia (Database Lokasi)
export const INDONESIA_CITY_COORDS: Record<string, Coordinates> = {
  jakarta: { lat: -6.2088, lng: 106.8456 },
  bogor: { lat: -6.5971, lng: 106.7949 },
  depok: { lat: -6.4025, lng: 106.7942 },
  tangerang: { lat: -6.1783, lng: 106.6319 },
  bekasi: { lat: -6.2383, lng: 106.9756 },
  bandung: { lat: -6.9175, lng: 107.6191 },
  semarang: { lat: -6.9667, lng: 110.4167 },
  yogyakarta: { lat: -7.7956, lng: 110.3695 },
  surabaya: { lat: -7.2575, lng: 112.7521 },
  malang: { lat: -7.9666, lng: 112.6326 },
  denpasar: { lat: -8.6705, lng: 115.2126 },
  medan: { lat: 3.5952, lng: 98.6722 },
  palembang: { lat: -2.9761, lng: 104.7754 },
  lampung: { lat: -5.4500, lng: 105.2667 },
  makassar: { lat: -5.1477, lng: 119.4327 },
  manado: { lat: 1.4748, lng: 124.8428 },
  banjarmasin: { lat: -3.3194, lng: 114.5908 },
  pontianak: { lat: -0.0263, lng: 109.3425 },
}

/**
 * Menghitung jarak Haversine (dalam Kilometer) antara 2 titik koordinat (Lat/Lng)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius bumi dalam KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  // Tambahkan faktor rute jalan raya (skala 1.25x dari garis lurus)
  return Math.round(distance * 1.25 * 10) / 10
}

/**
 * Estimasi jarak berdasarkan nama kota asal (penjual) dan kota tujuan (pembeli)
 */
export function estimateDistanceBetweenCities(
  originCity: string,
  destinationCity: string
): number | null {
  if (!originCity || !destinationCity) return null

  const originKey = Object.keys(INDONESIA_CITY_COORDS).find(k =>
    originCity.toLowerCase().includes(k)
  )
  const destKey = Object.keys(INDONESIA_CITY_COORDS).find(k =>
    destinationCity.toLowerCase().includes(k)
  )

  if (originKey && destKey) {
    if (originKey === destKey) return 5.0 // Dalam kota yang sama (estimasi rata-rata 5 KM)
    const c1 = INDONESIA_CITY_COORDS[originKey]
    const c2 = INDONESIA_CITY_COORDS[destKey]
    return calculateHaversineDistance(c1.lat, c1.lng, c2.lat, c2.lng)
  }

  return null
}

/**
 * Simple In-Memory TTL Cache for Fast Retrieval & DB Load Reduction
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

/**
 * Simpan data ke cache dengan TTL (dalam milidetik)
 */
export function setCache<T>(key: string, value: T, ttlMs = 30_000): void {
  const expiresAt = Date.now() + ttlMs
  memoryCache.set(key, { value, expiresAt })
}

/**
 * Ambil data dari cache jika belum expired
 */
export function getCache<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }

  return entry.value as T
}

/**
 * Hapus cache berdasarkan key atau pattern
 */
export function clearCacheKey(keyOrPrefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      memoryCache.delete(key)
    }
  }
}

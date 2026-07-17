/**
 * In-memory rate limiter — untuk mencegah brute-force login & abuse API.
 *
 * CATATAN PRODUCTION: gunakan Upstash Redis / Vercel KV untuk multi-instance.
 * Ini cukup untuk single-instance / dev.
 */

interface RateLimitEntry {
  count:     number
  resetAt:   number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  key:         string   // identifier: IP, phone, dst
  maxRequests: number   // maksimum request
  windowMs:    number   // window waktu (ms)
}

export function checkRateLimit(opts: RateLimitOptions): {
  allowed:   boolean
  remaining: number
  resetIn:   number
} {
  const now = Date.now()
  const entry = store.get(opts.key)

  if (!entry || entry.resetAt < now) {
    store.set(opts.key, {
      count:   1,
      resetAt: now + opts.windowMs,
    })
    return { allowed: true, remaining: opts.maxRequests - 1, resetIn: opts.windowMs }
  }

  if (entry.count >= opts.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now }
  }

  entry.count++
  return {
    allowed:   true,
    remaining: opts.maxRequests - entry.count,
    resetIn:   entry.resetAt - now,
  }
}

// Cleanup entry expired setiap 5 menit
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}
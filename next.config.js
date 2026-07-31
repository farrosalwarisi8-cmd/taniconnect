/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Paksa HTTPS + HSTS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Cegah clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Cegah MIME-type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(self), payment=()',
  },
  // Content Security Policy — Supabase + Midtrans + Groq + Bapanas + PIHPS + Fonts + Images + PWA
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",

      // Script: Next.js hydration + Midtrans Snap
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.midtrans.com https://app.sandbox.midtrans.com https://api.midtrans.com",

      // Style: Tailwind inline + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Font
      "font-src 'self' data: https://fonts.gstatic.com",

      // Image: Supabase + Unsplash + Pexels + Pixabay
      "img-src 'self' data: blob: " +
      "https://*.supabase.co https://*.supabase.in " +
      "https://images.unsplash.com https://plus.unsplash.com " +
      "https://images.pexels.com " +
      "https://cdn.pixabay.com",

      // ⭐ Connect: Supabase + Midtrans + Groq AI + Bapanas + PIHPS BI + Google Fonts (untuk SW)
      "connect-src 'self' " +
      "https://*.supabase.co https://*.supabase.in " +
      "wss://*.supabase.co wss://*.supabase.in " +
      "https://api.midtrans.com https://api.sandbox.midtrans.com " +
      "https://app.midtrans.com https://app.sandbox.midtrans.com " +
      "https://api.groq.com " +
      "https://api-panelharga.badanpangan.go.id " +
      "https://www.bi.go.id " +
      "https://fonts.googleapis.com https://fonts.gstatic.com",

      // Frame: Midtrans popup
      "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",

      // Object
      "object-src 'none'",

      // Base URI
      "base-uri 'self'",

      // Form action
      "form-action 'self'",

      // Worker: Service Worker untuk PWA (offline support)
      "worker-src 'self' blob:",

      // Manifest: PWA manifest.json
      "manifest-src 'self'",

      // Upgrade insecure
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  // Security headers untuk semua routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache manifest.json dengan header yang tepat
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      // Service Worker tidak boleh di-cache (biar update instant)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },

  // Whitelist domain untuk Next.js Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
        pathname: '/**',
      },
    ],
  },

  reactStrictMode: true,
}

module.exports = nextConfig
import Link from 'next/link'

/**
 * Halaman root — Splash Screen TaniConnect.
 * Server Component (tidak butuh 'use client').
 * Menampilkan brand dan link ke halaman register/login.
 */
export default function SplashPage() {
  return (
    <main className="min-h-screen gradient-hero flex flex-col items-center justify-center px-6 text-white">

      {/* Logo & Wordmark */}
      <div className="flex flex-col items-center gap-4 mb-8">
        {/* Ikon daun */}
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <span className="text-5xl" role="img" aria-label="Daun">🌿</span>
        </div>

        {/* Wordmark — Bricolage Grotesque, HANYA untuk display 76px+ */}
        <h1
          className="text-display text-center text-white"
          style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
        >
          TaniConnect
        </h1>
      </div>

      {/* Tagline */}
      <p
        className="text-body text-center mb-12"
        style={{ color: 'rgba(255,255,255,0.85)' }}
      >
        Tani Lebih Mudah, Hasil Lebih Nyata
      </p>

      {/* Subtagline */}
      <p
        className="text-caption text-center mb-16 max-w-xs"
        style={{ color: 'rgba(255,255,255,0.7)' }}
      >
        Platform ekosistem digital pertanian Indonesia — menghubungkan petani,
        pembeli, dan penyedia alat tani langsung tanpa perantara.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col w-full max-w-sm gap-3">
        <Link
          href="/register"
          className="w-full bg-white text-primary-dark font-medium text-btn rounded-sm px-6 py-3 text-center min-h-[48px] flex items-center justify-center shadow-lg hover:bg-green-50 transition-colors"
        >
          Daftar Sekarang
        </Link>
        <Link
          href="/login"
          className="w-full bg-transparent text-white border border-white/50 font-medium text-btn rounded-sm px-6 py-3 text-center min-h-[48px] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          Masuk
        </Link>
      </div>

      {/* Loading indicator pulsing — seperti di spec splash screen */}
      <div className="mt-12 flex gap-2" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-light animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      {/* Footer note */}
      <p className="absolute bottom-8 text-caption" style={{ color: 'rgba(255,255,255,0.5)' }}>
        © 2026 TaniConnect · Platform pertanian Indonesia
      </p>
    </main>
  )
}
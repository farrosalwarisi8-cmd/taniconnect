// app/unauthorized/page.tsx
//
// Server Component — fetch user + profile untuk tampilkan opsi dashboard
// yang sesuai dengan role yang dimiliki user.
//
// Kasus yang ditangani:
//   A. User login + punya roles  → tampilkan card per role + opsi beranda
//   B. User login + roles kosong → tampilkan fallback sederhana + opsi beranda
//   C. User tidak login          → tampilkan fallback dengan tombol login
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROLE_CONFIG } from '@/lib/role-config'
import type { UserRole } from '@/lib/supabase/client'

// ─── Type helper — sama dengan pola di admin/layout.tsx ──────────────────────
interface ProfileData {
  role: UserRole | null
  roles: UserRole[] | null
  full_name: string | null
}

// ─── Server Component ─────────────────────────────────────────────────────────
export default async function UnauthorizedPage() {
  // ── Fetch user + profile (pola identik dengan admin/layout.tsx) ───────────
  let profile: ProfileData | null = null

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: rawProfile } = await supabase
        .from('profiles')
        .select('role, roles, full_name')
        .eq('id', user.id)
        .single()

      // Cast eksplisit — sama dengan pola di admin/layout.tsx
      profile = rawProfile as ProfileData | null
    }
  } catch {
    // Kalau fetch gagal (env tidak diset, network error, dsb),
    // fallback ke tampilan tidak-login — tidak crash halaman.
    profile = null
  }

  // ── Normalisasi roles ──────────────────────────────────────────────────────
  // Support user lama yang belum punya kolom roles (fallback ke role tunggal)
  const userRoles: UserRole[] =
    profile?.roles && profile.roles.length > 0
      ? profile.roles
      : profile?.role
        ? [profile.role]
        : []

  const isLoggedIn = profile !== null
  const hasRoles = userRoles.length > 0
  const displayName = profile?.full_name?.split(' ')[0] ?? null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-surface-light flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-5">🔒</div>
          <h1 className="text-h2 text-fg-dark mb-3">Akses Ditolak</h1>
          <p className="text-body text-fg/70">
            {isLoggedIn && displayName
              ? `Hei ${displayName}, halaman ini tidak bisa diakses dengan peranmu saat ini.`
              : 'Kamu tidak memiliki izin untuk mengakses halaman ini.'}
          </p>
        </div>

        {/* ── Kasus A & B: User login ──────────────────────────────────────── */}
        {isLoggedIn && (
          <div className="space-y-3 mb-6">
            {hasRoles ? (
              <>
                {/* Label section */}
                <p className="text-sm font-semibold text-fg/50 uppercase tracking-wider text-center mb-4">
                  Buka dashboard yang kamu punya
                </p>

                {/* Card per role */}
                {userRoles.map(role => {
                  const config = ROLE_CONFIG[role]
                  // Skip role yang tidak ada di ROLE_CONFIG (defensive)
                  if (!config) return null
                  return (
                    <Link
                      key={role}
                      href={config.href}
                      className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border-2 border-border hover:border-primary hover:shadow-md transition-all group"
                    >
                      {/* Emoji dalam lingkaran */}
                      <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-2xl shrink-0 group-hover:bg-green-100 transition-colors">
                        {config.emoji}
                      </div>

                      {/* Label + href */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-fg-dark group-hover:text-primary-dark transition-colors">
                          {config.label}
                        </p>
                        <p className="text-xs text-fg/50 truncate">{config.href}</p>
                      </div>

                      {/* Arrow */}
                      <span className="text-fg/30 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all">
                        →
                      </span>
                    </Link>
                  )
                })}
              </>
            ) : (
              /* Kasus B: login tapi roles kosong */
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-sm text-amber-700">
                  Akunmu belum punya peran. Silakan pilih peran terlebih dahulu.
                </p>
                <Link
                  href="/pilih-peran"
                  className="inline-block mt-3 text-sm font-semibold text-amber-700 underline underline-offset-2"
                >
                  Pilih Peran Sekarang →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Divider — hanya tampil kalau ada role cards di atas ──────────── */}
        {isLoggedIn && hasRoles && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-light px-3 text-caption text-fg/40">atau</span>
            </div>
          </div>
        )}

        {/* ── Footer actions ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Kembali ke Beranda — selalu ada */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 min-h-[48px] bg-white border-2 border-border hover:border-primary rounded-2xl text-fg-dark font-medium transition-all hover:shadow-sm"
          >
            🏠 Kembali ke Beranda
          </Link>

          {/* Kasus C: tidak login → tampilkan tombol login */}
          {!isLoggedIn && (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 min-h-[48px] bg-primary hover:bg-primary-dark text-white font-medium rounded-2xl transition-colors"
            >
              🔑 Masuk dengan Akun Lain
            </Link>
          )}

          {/* Kalau login: tawarkan ganti/tambah peran */}
          {isLoggedIn && (
            <Link
              href="/pilih-peran"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 min-h-[48px] text-sm text-fg/50 hover:text-fg/70 transition-colors"
            >
              ⚙️ Kelola peran saya
            </Link>
          )}
        </div>

      </div>
    </main>
  )
}
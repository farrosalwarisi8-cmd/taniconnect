'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/client'

// ─── Role config ──────────────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, {
  emoji: string
  label: string
  color: string
  bg: string
  href: string
  gradient: string
}> = {
  petani: {
    emoji: '🌾', label: 'Petani',
    color: 'text-green-700', bg: 'bg-green-50 border-green-200',
    href: '/petani/dashboard', gradient: 'from-green-500 to-emerald-600',
  },
  pembeli: {
    emoji: '🛒', label: 'Pembeli',
    color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',
    href: '/pembeli/marketplace', gradient: 'from-amber-400 to-orange-500',
  },
  penyedia_alat: {
    emoji: '🚜', label: 'Penyedia Alat',
    color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',
    href: '/penyedia/dashboard', gradient: 'from-blue-500 to-cyan-600',
  },
  admin: {
    emoji: '🔐', label: 'Administrator',
    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200',
    href: '/admin/dashboard', gradient: 'from-purple-600 to-violet-700',
  },
}

// Public nav links
const PUBLIC_LINKS = [
  { href: '/harga-pangan', label: 'Harga Pangan', emoji: '💹' },
  { href: '/prediksi-harga', label: 'Prediksi Harga', emoji: '🔮' },
  { href: '/tanya-ai', label: 'Tanya AI', emoji: '🤖' },
]

interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  roles: UserRole[]
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Hide navbar on dashboard routes — dashboards have their own sidebar
  const isDashboardRoute =
    pathname.startsWith('/petani') ||
    pathname.startsWith('/pembeli') ||
    pathname.startsWith('/penyedia') ||
    pathname.startsWith('/admin')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, roles')
          .eq('id', user.id)
          .single()

        if (data) {
          const profileData = data as { full_name: string; role: UserRole; roles: UserRole[] | null }
          const roles = profileData.roles?.length
            ? profileData.roles
            : [profileData.role ?? 'pembeli']

          setProfile({
            id: user.id,
            full_name: profileData.full_name,
            role: profileData.role ?? 'pembeli',
            roles: roles as UserRole[],
          })
        }
      } catch {
        // Supabase not configured — guest mode
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleSwitchRole = async (newRole: UserRole) => {
    if (!profile) return
    setSwitching(true)
    setDropdownOpen(false)

    try {
      // 1. Update ke Supabase via API server-side (dengan validasi & bypass RLS)
      const res = await fetch('/api/user/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: profile.roles, // pertahankan semua role yang ada
          activeRole: newRole,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[SWITCH ROLE] Gagal update role:', errData)
        setSwitching(false)
        return
      }

      // 2. Refresh JWT session agar cookie sinkron dengan DB terbaru
      await supabase.auth.refreshSession()

      // 3. Hard navigate ke dashboard role baru — middleware akan re-validasi dari DB
      const destination = ROLE_CONFIG[newRole]?.href ?? '/'
      window.location.href = destination
    } catch (err) {
      console.error('[SWITCH ROLE] Error:', err)
      setSwitching(false)
    }
  }

  // Don't show on dashboard routes
  if (isDashboardRoute) return null

  const activeRoleConfig = profile ? ROLE_CONFIG[profile.role] : null
  const otherRoles = profile
    ? profile.roles.filter(r => r !== profile.role)
    : []

  return (
    <>
      {/* ─── Main Navbar ──────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 nav-glass border-b border-border/60"
        role="navigation"
        aria-label="Navigasi utama"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 min-h-0 group"
              aria-label="TaniConnect — Beranda"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                🌿
              </div>
              <span
                className="font-extrabold text-primary-dark text-[18px] hidden sm:block"
                style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
              >
                TaniConnect
              </span>
            </Link>

            {/* Desktop center links */}
            <div className="hidden md:flex items-center gap-1">
              {PUBLIC_LINKS.map(link => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-btn text-sm font-medium transition-all min-h-0',
                      isActive
                        ? 'bg-primary/10 text-primary-dark'
                        : 'text-fg/70 hover:text-fg hover:bg-surface',
                    )}
                  >
                    <span className="text-base">{link.emoji}</span>
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
              ) : profile ? (
                /* ─── Logged in: user dropdown ─── */
                <div className="relative" ref={dropdownRef}>
                  {/* Active role badge + avatar trigger */}
                  <button
                    type="button"
                    id="user-menu-btn"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-surface transition-all min-h-0 group"
                  >
                    {/* Active role gradient avatar */}
                    <div className={cn(
                      'w-8 h-8 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm',
                      activeRoleConfig?.gradient ?? 'from-gray-400 to-gray-600'
                    )}>
                      {profile.full_name[0]?.toUpperCase() ?? 'U'}
                    </div>

                    {/* Name & role */}
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-semibold text-fg-dark leading-tight max-w-[100px] truncate">
                        {profile.full_name.split(' ')[0]}
                      </p>
                      <p className={cn('text-[10px] font-medium leading-tight', activeRoleConfig?.color ?? 'text-fg/60')}>
                        {activeRoleConfig?.emoji} {activeRoleConfig?.label}
                      </p>
                    </div>

                    {/* Chevron */}
                    <svg
                      className={cn('w-3.5 h-3.5 text-fg/40 transition-transform', dropdownOpen && 'rotate-180')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-modal border border-border/60 overflow-hidden animate-scale-in z-50">
                      {/* User info header */}
                      <div className={cn(
                        'px-4 py-4 bg-gradient-to-br text-white',
                        activeRoleConfig?.gradient ?? 'from-gray-500 to-gray-700'
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-lg font-bold border border-white/30">
                            {profile.full_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{profile.full_name}</p>
                            <p className="text-white/70 text-xs">
                              {activeRoleConfig?.emoji} Aktif sebagai {activeRoleConfig?.label}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Go to dashboard */}
                      <div className="p-2 border-b border-border/50">
                        <Link
                          href={activeRoleConfig?.href ?? '/'}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors min-h-0 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-dark text-sm">
                            📊
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-fg-dark">Dashboard Saya</p>
                            <p className="text-xs text-fg/50">Buka panel {activeRoleConfig?.label}</p>
                          </div>
                          <svg className="w-4 h-4 text-fg/30 ml-auto group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>

                      {/* Switch role — if user has other roles */}
                      {otherRoles.length > 0 && (
                        <div className="p-2 border-b border-border/50">
                          <p className="text-[10px] font-semibold text-fg/40 uppercase tracking-wider px-3 mb-1.5">
                            Ganti Peran
                          </p>
                          {otherRoles.map(role => {
                            const rc = ROLE_CONFIG[role]
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => handleSwitchRole(role)}
                                disabled={switching}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors min-h-0 text-left"
                              >
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm border',
                                  rc?.bg ?? 'bg-gray-50 border-gray-200'
                                )}>
                                  {rc?.emoji}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-fg-dark">
                                    {rc?.label}
                                  </p>
                                  <p className="text-xs text-fg/50">Masuk sebagai {rc?.label}</p>
                                </div>
                                {switching && (
                                  <div className="ml-auto w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Manage roles */}
                      <div className="p-2 border-b border-border/50">
                        <Link
                          href="/pilih-peran"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors min-h-0"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                            ⚙️
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fg-dark">Kelola Peran</p>
                            <p className="text-xs text-fg/50">Tambah atau ubah peran</p>
                          </div>
                        </Link>
                      </div>

                      {/* Quick links */}
                      <div className="p-2 border-b border-border/50">
                        {PUBLIC_LINKS.map(link => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface transition-colors min-h-0 text-sm text-fg/70"
                          >
                            <span>{link.emoji}</span>
                            <span>{link.label}</span>
                          </Link>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-error transition-colors min-h-0 text-sm font-medium"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm">
                            🚪
                          </div>
                          Keluar dari Akun
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── Guest: login + register buttons ─── */
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="hidden sm:block text-sm font-medium text-fg/70 hover:text-fg-dark px-3 py-2 rounded-btn hover:bg-surface transition-all min-h-0"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    className="bg-primary-dark hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-btn transition-colors shadow-btn-primary min-h-0"
                  >
                    Daftar
                  </Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                type="button"
                id="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Buka menu"
                aria-expanded={mobileOpen}
                className="md:hidden w-9 h-9 rounded-btn bg-surface flex items-center justify-center text-fg-dark hover:bg-border/50 transition-colors min-h-0"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Mobile Menu ─────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-white animate-fade-up">
            <div className="px-4 py-4 space-y-1">
              {PUBLIC_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all min-h-0',
                    pathname === link.href
                      ? 'bg-primary/10 text-primary-dark'
                      : 'text-fg/70 hover:bg-surface hover:text-fg'
                  )}
                >
                  <span>{link.emoji}</span>
                  {link.label}
                </Link>
              ))}

              {!profile && (
                <div className="pt-3 border-t border-border mt-3 flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-btn bg-surface text-fg-dark font-medium text-sm border border-border min-h-0"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-btn bg-primary-dark text-white font-semibold text-sm min-h-0"
                  >
                    Daftar Gratis
                  </Link>
                </div>
              )}

              {profile && (
                <div className="pt-3 border-t border-border mt-3">
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface rounded-btn mb-2">
                    <div className={cn(
                      'w-9 h-9 rounded-full bg-gradient-to-br text-white flex items-center justify-center font-bold',
                      activeRoleConfig?.gradient
                    )}>
                      {profile.full_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-fg-dark">{profile.full_name}</p>
                      <p className={cn('text-xs', activeRoleConfig?.color)}>
                        {activeRoleConfig?.emoji} {activeRoleConfig?.label}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={activeRoleConfig?.href ?? '/'}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-surface text-sm text-fg min-h-0"
                  >
                    📊 Dashboard Saya
                  </Link>

                  {otherRoles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => { setMobileOpen(false); handleSwitchRole(role) }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-surface text-sm text-fg min-h-0 text-left"
                    >
                      {ROLE_CONFIG[role]?.emoji} Ganti ke {ROLE_CONFIG[role]?.label}
                    </button>
                  ))}

                  <Link
                    href="/pilih-peran"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-surface text-sm text-fg/70 min-h-0"
                  >
                    ⚙️ Kelola Peran
                  </Link>

                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); handleLogout() }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-red-50 text-error text-sm font-medium min-h-0 text-left"
                  >
                    🚪 Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}

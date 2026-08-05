'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, normalizeUserRole } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/penyedia/dashboard', icon: '📊', label: 'Dashboard'     },
  { href: '/penyedia/alat',      icon: '🚜', label: 'Alat Saya'     },
  { href: '/penyedia/booking',   icon: '📥', label: 'Booking Masuk' },
  { href: '/penyedia/pengiriman', icon: '🚚', label: 'Pengiriman'   },
  { href: '/penyedia/profil',    icon: '👤', label: 'Profil'        },
]

const ALL_ROLE_CONFIG: Record<string, { emoji: string; label: string; href: string; color: string; gradient: string }> = {
  petani:        { emoji: '🌾', label: 'Petani',         href: '/petani/dashboard',    color: 'text-green-700',  gradient: 'from-green-500 to-emerald-600' },
  pembeli:       { emoji: '🛒', label: 'Pembeli',        href: '/pembeli/marketplace', color: 'text-amber-700',  gradient: 'from-amber-400 to-orange-500'  },
  penyedia_alat: { emoji: '🚜', label: 'Penyedia Alat',  href: '/penyedia/dashboard',  color: 'text-blue-700',   gradient: 'from-blue-500 to-cyan-600'     },
  admin:         { emoji: '🔐', label: 'Administrator',  href: '/admin/dashboard',     color: 'text-purple-700', gradient: 'from-purple-600 to-violet-700' },
}

interface Props {
  providerName: string
  userRoles?: string[]
}

export function PenyediaSidebar({ providerName, userRoles = [] }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSwitchRole = async (newRole: UserRole) => {
    setSwitching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any)
          .upsert({ id: user.id, role: newRole }, { onConflict: 'id' })
        await supabase.auth.updateUser({ data: { role: newRole } })
      } catch {
        // ignore and still redirect
      }
    }
    const dest = ALL_ROLE_CONFIG[newRole]?.href ?? '/'
    window.location.href = dest
  }

  const otherRoles = userRoles.filter(r => r !== 'penyedia_alat')

  const SidebarContent = () => (
    <aside
      className={cn(
        'bg-white border-r border-border w-64 flex-col',
        'lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:flex',
        mobileOpen ? 'flex fixed inset-0 z-50 h-screen' : 'hidden',
      )}
    >
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/penyedia/dashboard" className="flex items-center gap-3 min-h-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-lg shadow-sm">
            🚜
          </div>
          <div>
            <p
              className="font-extrabold text-fg-dark text-[16px] leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
            >
              TaniConnect
            </p>
            <p className="text-[11px] text-blue-600 font-semibold">Penyedia Alat</p>
          </div>
        </Link>
      </div>

      {/* Provider info */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
            {providerName?.trim()?.[0]?.toUpperCase() ?? 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg-dark truncate">{providerName || 'Penyedia'}</p>
            <p className="text-[11px] text-blue-600 font-medium">🔧 Penyedia Alat & Bahan</p>
          </div>
          <Link
            href="/pilih-peran"
            onClick={() => setMobileOpen(false)}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium min-h-0 shrink-0"
            title="Kelola peran"
          >
            ⚙️
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Menu penyedia">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all min-h-0 text-sm',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-[3px] border-blue-600 pl-[9px]'
                  : 'text-fg/70 hover:bg-surface hover:text-blue-700',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-0.5">
        {/* Public links */}
        <Link
          href="/pembeli/marketplace"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm text-fg/60 min-h-0"
          onClick={() => setMobileOpen(false)}
        >
          <span>🛒</span>
          <span>Marketplace</span>
        </Link>
        <Link
          href="/tanya-ai"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm text-fg/60 min-h-0"
          onClick={() => setMobileOpen(false)}
        >
          <span>🤖</span>
          <span>Tanya AI</span>
        </Link>

        {/* Switch role section — show all roles with checkmark */}
        {userRoles.length > 1 && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-semibold text-fg/40 uppercase tracking-wider px-3">
                Ganti Role
              </p>
            </div>
            {userRoles.map(role => {
              const rc = ALL_ROLE_CONFIG[role]
              if (!rc) return null
              const isActive = role === 'penyedia_alat'
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => { if (!isActive) { setMobileOpen(false); handleSwitchRole(role as UserRole) } }}
                  disabled={switching || isActive}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-0 text-left transition-colors',
                    isActive ? 'bg-blue-50/50 cursor-default' : 'hover:bg-surface cursor-pointer',
                    rc.color
                  )}
                >
                  <span>{rc.emoji}</span>
                  <span className={isActive ? 'font-semibold' : ''}>{rc.label}</span>
                  {isActive && <span className="ml-auto text-blue-600 font-bold">✓</span>}
                  {!isActive && switching && <div className="ml-auto w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                </button>
              )
            })}
          </>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-error min-h-0 transition-colors"
        >
          <span>🚪</span>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-border sticky top-16 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚜</span>
            <div>
              <p className="font-bold text-fg-dark text-sm">Penyedia Alat</p>
              <p className="text-[11px] text-fg/50">TaniConnect</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-btn bg-surface flex items-center justify-center min-h-0"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <SidebarContent />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
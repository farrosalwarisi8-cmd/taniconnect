'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/admin/profil', icon: '👤', label: 'Profil Saya' },
  { href: '/admin/verifikasi', icon: '🪪', label: 'Verifikasi KYC' },
  { href: '/admin/wilayah', icon: '🗺️', label: 'Data Wilayah' },
  { href: '/admin/audit-log', icon: '📜', label: 'Audit Log' },
]

const OTHER_ROLE_CONFIG: Record<string, { emoji: string; label: string; href: string; color: string }> = {
  petani: { emoji: '🌾', label: 'Mode Petani', href: '/petani/dashboard', color: 'text-green-700' },
  pembeli: { emoji: '🛒', label: 'Mode Pembeli', href: '/pembeli/marketplace', color: 'text-amber-700' },
  penyedia_alat: { emoji: '🚜', label: 'Mode Penyedia Alat', href: '/penyedia/dashboard', color: 'text-blue-700' },
}

interface Props {
  adminName: string
  userRoles?: string[]
}

export function AdminSidebar({ adminName, userRoles = [] }: Props) {
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
      await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
      await supabase.auth.updateUser({ data: { role: newRole } })
    }
    const dest = OTHER_ROLE_CONFIG[newRole]?.href ?? '/'
    window.location.href = dest
  }

  const otherRoles = userRoles.filter(r => r !== 'admin' && r in OTHER_ROLE_CONFIG)

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
        <Link href="/admin/dashboard" className="flex items-center gap-3 min-h-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white text-lg shadow-sm">
            🌿
          </div>
          <div>
            <p
              className="font-extrabold text-fg-dark text-[16px] leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
            >
              TaniConnect
            </p>
            <p className="text-[11px] text-purple-600 font-semibold">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Admin info */}
      <div className="p-3 border-b border-border">
        <Link
          href="/admin/profil"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 rounded-xl border border-purple-100 transition-colors min-h-0"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white font-bold text-sm">
            {adminName[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg-dark truncate">{adminName}</p>
            <p className="text-[11px] text-purple-600 font-medium">🔐 Administrator</p>
          </div>
          <Link
            href="/pilih-peran"
            onClick={e => e.stopPropagation()}
            className="text-xs text-purple-400 hover:text-purple-600 min-h-0 shrink-0"
            title="Kelola peran"
          >
            ⚙️
          </Link>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Menu admin">
        {NAV_ITEMS.map(item => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all min-h-0 text-sm',
                isActive
                  ? 'bg-purple-50 text-purple-700 font-semibold border-l-[3px] border-purple-600 pl-[9px]'
                  : 'text-fg/70 hover:bg-surface hover:text-purple-700',
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
        {/* Switch role — if admin has other roles */}
        {otherRoles.length > 0 && (
          <>
            <div className="pt-1 pb-1">
              <p className="text-[10px] font-semibold text-fg/40 uppercase tracking-wider px-3">
                Ganti Mode
              </p>
            </div>
            {otherRoles.map(role => {
              const rc = OTHER_ROLE_CONFIG[role]
              if (!rc) return null
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setMobileOpen(false); handleSwitchRole(role as UserRole) }}
                  disabled={switching}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm min-h-0 text-left transition-colors',
                    rc.color
                  )}
                >
                  <span className="text-base">{rc.emoji}</span>
                  <span>{rc.label}</span>
                  {switching && <div className="ml-auto w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                </button>
              )
            })}
          </>
        )}

        {/* Public tools */}
        <div className="pt-1">
          <p className="text-[10px] font-semibold text-fg/40 uppercase tracking-wider px-3 mb-1">
            Tools
          </p>
        </div>
        <Link
          href="/harga-pangan"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm text-fg/60 min-h-0"
          onClick={() => setMobileOpen(false)}
        >
          <span>💹</span>
          <span>Harga Pangan</span>
        </Link>
        <Link
          href="/tanya-ai"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm text-fg/60 min-h-0"
          onClick={() => setMobileOpen(false)}
        >
          <span>🤖</span>
          <span>Tanya AI</span>
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-error min-h-0 transition-colors mt-1"
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
            <span className="text-xl">🌿</span>
            <div>
              <p className="font-bold text-fg-dark text-sm">Admin Panel</p>
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
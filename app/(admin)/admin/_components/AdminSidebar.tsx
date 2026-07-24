'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin/dashboard',    icon: '📊', label: 'Dashboard' },
  { href: '/admin/profil',       icon: '👤', label: 'Profil Saya' },
  { href: '/admin/verifikasi',   icon: '🪪', label: 'Verifikasi KYC' },
  { href: '/admin/wilayah',      icon: '🗺️', label: 'Data Wilayah' },
  { href: '/admin/audit-log',    icon: '📜', label: 'Audit Log' },
]

interface Props {
  adminName: string
}

export function AdminSidebar({ adminName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Header (hamburger) */}
      <header className="lg:hidden bg-white border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <div>
              <p className="font-bold text-fg-dark text-sm">Admin Panel</p>
              <p className="text-caption text-fg/60">TaniConnect</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 rounded-btn bg-surface flex items-center justify-center min-h-0"
            aria-label="Menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Sidebar (desktop always show, mobile toggle) */}
      <aside
        className={cn(
          'bg-white border-r border-border w-64 flex-col',
          'lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:flex',
          mobileOpen ? 'flex fixed inset-0 z-50 h-screen' : 'hidden',
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/admin/dashboard" className="flex items-center gap-3 min-h-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-lg">
              🌿
            </div>
            <div>
              <p
                className="font-extrabold text-fg-dark text-lg leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
              >
                TaniConnect
              </p>
              <p className="text-caption text-primary-dark font-semibold">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Admin info (clickable to profile) */}
        <div className="p-4 border-b border-border">
          <Link
            href="/admin/profil"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-btn transition-colors min-h-0"
          >
            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-900 font-bold">
              {adminName[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg-dark truncate">{adminName}</p>
              <p className="text-caption text-purple-700 font-medium">🔐 Administrator</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-btn transition-all min-h-0',
                  isActive
                    ? 'bg-primary/10 text-primary-dark font-semibold border-l-4 border-primary -ml-1 pl-3'
                    : 'text-fg hover:bg-surface hover:text-primary-dark',
                )}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/petani/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-surface text-sm text-fg/70 min-h-0"
            onClick={() => setMobileOpen(false)}
          >
            <span>👤</span>
            <span>Mode Pengguna</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-error/10 text-sm text-error min-h-0"
          >
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}
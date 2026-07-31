'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface UserInfo {
  id: string
  fullName: string
  dbRole: string   // role asli dari database
  initial: string
}

type ActiveMode = 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'

const MODE_CONFIG: Record<ActiveMode, {
  label: string
  emoji: string
  color: string
  dashboard: string
}> = {
  petani: {
    label: 'Petani',
    emoji: '🌾',
    color: 'bg-green-100 text-green-700',
    dashboard: '/petani/dashboard',
  },
  pembeli: {
    label: 'Pembeli',
    emoji: '🛒',
    color: 'bg-blue-100 text-blue-700',
    dashboard: '/pembeli/pesanan',
  },
  penyedia_alat: {
    label: 'Penyedia Alat',
    emoji: '🚜',
    color: 'bg-cyan-100 text-cyan-700',
    dashboard: '/penyedia/dashboard',
  },
  admin: {
    label: 'Admin',
    emoji: '🔐',
    color: 'bg-purple-100 text-purple-700',
    dashboard: '/admin/dashboard',
  },
}

const ALL_MODES: ActiveMode[] = ['petani', 'pembeli', 'penyedia_alat', 'admin']

export function ProfileAvatar() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<ActiveMode>('pembeli')
  const [showModeSwitcher, setShowModeSwitcher] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { setUser(null); setLoading(false); return }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          const dbRole = (profile as any).role ?? 'pembeli'
          setUser({
            id: authUser.id,
            fullName: (profile as any).full_name ?? 'User',
            dbRole,
            initial: ((profile as any).full_name?.[0] ?? 'U').toUpperCase(),
          })

          // Load active mode dari localStorage, fallback ke dbRole
          const savedMode = localStorage.getItem('taniconnect_active_mode') as ActiveMode | null
          setActiveMode(savedMode && ALL_MODES.includes(savedMode) ? savedMode : dbRole as ActiveMode)
        }
      } catch { setUser(null) }
      finally { setLoading(false) }
    }
    loadUser()
  }, [supabase])

  const handleLogout = async () => {
    localStorage.removeItem('taniconnect_active_mode')
    await supabase.auth.signOut()
    setUser(null)
    setMenuOpen(false)
    window.location.href = '/login'
  }

  const switchMode = (mode: ActiveMode) => {
    setActiveMode(mode)
    localStorage.setItem('taniconnect_active_mode', mode)
    setShowModeSwitcher(false)
    setMenuOpen(false)

    // Redirect ke dashboard mode yang dipilih
    const config = MODE_CONFIG[mode]
    window.location.href = config.dashboard
  }

  const currentConfig = MODE_CONFIG[activeMode]

  // Menu items berdasarkan ACTIVE MODE (bukan db role)
  const getMenuItems = () => {
    if (!user) return []

    switch (activeMode) {
      case 'petani':
        return [
          { href: '/petani/dashboard', icon: '📊', label: 'Dashboard Petani' },
          { href: '/petani/produk', icon: '📦', label: 'Produk Saya' },
          { href: '/petani/produk/baru', icon: '🌾', label: 'Jual Panen' },
          { href: '/petani/keuangan', icon: '💰', label: 'Keuangan' },
          { href: '/pembeli/marketplace', icon: '🛒', label: 'Marketplace' },
        ]
      case 'pembeli':
        return [
          { href: '/pembeli/pesanan', icon: '📋', label: 'Pesanan Saya' },
          { href: '/pembeli/marketplace', icon: '🛒', label: 'Marketplace' },
        ]
      case 'penyedia_alat':
        return [
          { href: '/penyedia/dashboard', icon: '📊', label: 'Dashboard Penyedia' },
          { href: '/penyedia/alat', icon: '🚜', label: 'Alat Saya' },
          { href: '/penyedia/alat/baru', icon: '➕', label: 'Tambah Alat' },
          { href: '/penyedia/booking', icon: '📥', label: 'Booking Masuk' },
        ]
      case 'admin':
        return [
          { href: '/admin/dashboard', icon: '🏛️', label: 'Admin Dashboard' },
          { href: '/admin/verifikasi', icon: '🪪', label: 'Verifikasi KYC' },
          { href: '/admin/wilayah', icon: '🗺️', label: 'Data Wilayah' },
          { href: '/admin/audit-log', icon: '📜', label: 'Audit Log' },
        ]
      default:
        return [
          { href: '/pembeli/marketplace', icon: '🛒', label: 'Marketplace' },
        ]
    }
  }

  // Common links (tampil di semua mode)
  const commonLinks = [
    { href: '/tanya-ai', icon: '🤖', label: 'Tanya AI' },
    { href: '/prediksi-harga', icon: '🔮', label: 'Prediksi Harga' },
    { href: '/harga-pangan', icon: '💹', label: 'Harga Pangan' },
  ]

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 font-semibold text-xs rounded-full hover:bg-gray-50 transition-colors min-h-0 touch-target-exempt"
      >
        <span>👤</span>
        <span>Masuk</span>
      </Link>
    )
  }

  const menuItems = getMenuItems()

  return (
    <div className="relative">
      {/* Avatar + Active Mode indicator */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 min-h-0 touch-target-exempt"
        aria-label="Menu profil"
      >
        {/* Mode badge (small, di samping avatar) */}
        <span className="hidden sm:inline-flex text-xs font-semibold text-gray-500">
          {user.fullName.split(' ')[0]}
        </span>
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            {user.initial}
          </div>
          {/* Tiny mode indicator dot */}
          <div className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">
            {currentConfig.emoji}
          </div>
        </div>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setShowModeSwitcher(false) }} />

          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-scale-in">
            {/* User Header */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {user.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate text-sm">{user.fullName}</p>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5', currentConfig.color)}>
                    {currentConfig.emoji} Mode: {currentConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* ⭐ Mode Switcher */}
            <div className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => setShowModeSwitcher(!showModeSwitcher)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span>Ganti Mode</span>
                </div>
                <span className={cn('text-xs transition-transform', showModeSwitcher && 'rotate-180')}>
                  ▼
                </span>
              </button>

              {/* Mode Grid (expanded) */}
              {showModeSwitcher && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  {ALL_MODES.map((mode) => {
                    const config = MODE_CONFIG[mode]
                    const isActive = activeMode === mode

                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => switchMode(mode)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl text-left transition-all min-h-0',
                          isActive
                            ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-white'
                        )}
                      >
                        <span className="text-2xl">{config.emoji}</span>
                        <div>
                          <p className={cn('text-xs font-bold', isActive ? 'text-green-700' : 'text-gray-700')}>
                            {config.label}
                          </p>
                          {isActive && (
                            <p className="text-[10px] text-green-600">✓ Aktif</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Dashboard CTA */}
            <Link
              href={currentConfig.dashboard}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-green-700 bg-green-50/50 hover:bg-green-50 transition-colors min-h-0"
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-lg">📊</span>
              <span>Dashboard {currentConfig.label}</span>
              <span className="ml-auto text-green-500">→</span>
            </Link>

            <div className="h-px bg-gray-100" />

            {/* Menu Items (sesuai active mode) */}
            <div className="py-1 max-h-[40vh] overflow-y-auto">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-0"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}

              <div className="h-px bg-gray-100 my-1" />

              {/* Common links */}
              {commonLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors min-h-0"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="h-px bg-gray-100" />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-0"
            >
              <span className="text-base w-6 text-center">🚪</span>
              <span>Keluar</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
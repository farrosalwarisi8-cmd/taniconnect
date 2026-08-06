'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient, type UserRole } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const MODE_CONFIG: Record<UserRole, {
  label: string
  emoji: string
  color: string
  dashboard: string
  gradient: string
}> = {
  petani: {
    label: 'Petani',
    emoji: '🌾',
    color: 'bg-green-100 text-green-700',
    dashboard: '/petani/dashboard',
    gradient: 'from-green-500 to-emerald-700',
  },
  pembeli: {
    label: 'Pembeli',
    emoji: '🛒',
    color: 'bg-blue-100 text-blue-700',
    dashboard: '/pembeli/marketplace',
    gradient: 'from-amber-400 to-orange-500',
  },
  penyedia_alat: {
    label: 'Penyedia Alat & Bahan',
    emoji: '🚜',
    color: 'bg-cyan-100 text-cyan-700',
    dashboard: '/penyedia/dashboard',
    gradient: 'from-blue-500 to-cyan-600',
  },
  admin: {
    label: 'Admin',
    emoji: '🔐',
    color: 'bg-purple-100 text-purple-700',
    dashboard: '/admin/dashboard',
    gradient: 'from-purple-600 to-violet-700',
  },
}

const supabase = createClient()

export function ProfileAvatar() {
  const pathname = usePathname()
  const { user, activeRole, roles, loading, switching, switchRole } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setShowRoleSwitcher(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    window.location.href = '/login'
  }

  const handleSwitchMode = async (mode: UserRole) => {
    setShowRoleSwitcher(false)
    setMenuOpen(false)
    await switchRole(mode)
  }

  const currentConfig = MODE_CONFIG[activeRole] ?? MODE_CONFIG['pembeli']

  const getMenuItems = () => {
    if (!user) return []

    switch (activeRole) {
      case 'petani':
        return [
          { href: '/petani/dashboard', icon: '📊', label: 'Dashboard Petani' },
          { href: '/petani/produk', icon: '📦', label: 'Produk Saya' },
          { href: '/petani/pengiriman', icon: '🚚', label: 'Layanan Pengiriman' },
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
          { href: '/penyedia/pengiriman', icon: '🚚', label: 'Layanan Pengiriman' },
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
    <div className="relative" ref={dropdownRef}>
      {/* Avatar + Active Mode indicator */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 min-h-0 touch-target-exempt"
        aria-label="Menu profil"
      >
        <span className="hidden sm:inline-flex text-xs font-semibold text-gray-500">
          {user.fullName.split(' ')[0]}
        </span>
        <div className="relative">
          <div className={cn(
            'w-9 h-9 rounded-full bg-gradient-to-br text-white font-bold text-sm flex items-center justify-center border-2 border-white shadow-sm hover:shadow-md transition-shadow cursor-pointer',
            currentConfig.gradient
          )}>
            {user.initial}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">
            {currentConfig.emoji}
          </div>
        </div>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-scale-in">
          {/* User Header */}
          <div className={cn('p-4 bg-gradient-to-r text-white', currentConfig.gradient)}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-md">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate text-sm">{user.fullName}</p>
                <p className="text-white/80 text-xs mt-0.5">
                  Role Aktif : <b>{currentConfig.label}</b>
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="border-b border-gray-100">
            <button
              type="button"
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <span>Ganti Role</span>
              </div>
              <span className={cn('text-xs transition-transform', showRoleSwitcher && 'rotate-180')}>
                ▼
              </span>
            </button>

            {showRoleSwitcher && (
              <div className="px-3 pb-3 grid grid-cols-1 gap-1">
                {roles.map((mode) => {
                  const config = MODE_CONFIG[mode] ?? { label: mode, emoji: '👤', color: 'bg-gray-100 text-gray-700' }
                  const isActive = activeRole === mode

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleSwitchMode(mode as UserRole)}
                      disabled={switching || isActive}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-xl text-left transition-all min-h-0 text-xs font-semibold',
                        isActive
                          ? 'bg-green-50 border border-green-500 text-green-800 font-bold'
                          : 'bg-gray-50 border border-transparent hover:border-gray-200 hover:bg-white text-gray-700',
                        switching && !isActive && 'opacity-50 cursor-wait'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm">{isActive ? '✓' : '○'}</span>
                        <span className="text-base">{config.emoji}</span>
                        <span>{config.label}</span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold">
                          Aktif
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Kelola Role link */}
          <Link
            href="/pilih-peran"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-0 border-b border-gray-100"
          >
            <span className="text-lg">🎭</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Kelola Role</p>
              <p className="text-[11px] text-gray-500">Tambah atau ubah daftar role kamu</p>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          {/* Dashboard CTA */}
          <Link
            href={currentConfig.dashboard}
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-green-700 bg-green-50/50 hover:bg-green-50 transition-colors min-h-0"
            onClick={() => setMenuOpen(false)}
          >
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
            <span className="ml-auto text-green-500">→</span>
          </Link>

          <div className="h-px bg-gray-100" />

          {/* Menu Items */}
          <div className="py-1 max-h-[35vh] overflow-y-auto">
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
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-0 font-medium"
          >
            <span className="text-base w-6 text-center">🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  )
}
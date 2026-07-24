'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserProfileState {
  id: string
  full_name: string
  role: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'
  avatar_storage_path: string | null
}

export function ProfileAvatar() {
  const [profile, setProfile] = useState<UserProfileState | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role, avatar_storage_path')
            .eq('id', user.id)
            .single()

          if (data) {
            setProfile(data as UserProfileState)
          }
        }
      } catch (err) {
        console.error('Error loading profile avatar:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-full transition-all shadow-sm min-h-0 touch-target-exempt"
      >
        Masuk
      </Link>
    )
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  // Links based on role
  const profileHref =
    profile.role === 'petani' ? '/petani/profil' :
    profile.role === 'admin' ? '/admin/profil' :
    '/pembeli/profil'

  const dashboardHref =
    profile.role === 'petani' ? '/petani/dashboard' :
    profile.role === 'admin' ? '/admin/dashboard' :
    '/pembeli/marketplace'

  const roleLabel =
    profile.role === 'petani' ? '🌾 Petani' :
    profile.role === 'admin' ? '🔐 Admin' :
    '🛒 Pembeli'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors min-h-0 touch-target-exempt border border-gray-200"
        aria-label="Menu Profil"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <span className="text-xs font-semibold text-gray-800 hidden md:inline max-w-[100px] truncate">
          {profile.full_name.split(' ')[0]}
        </span>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in">
          {/* User Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-900 truncate">{profile.full_name}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              {roleLabel}
            </span>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 min-h-0"
            >
              <span>👤</span> Profil Saya
            </Link>

            <Link
              href={dashboardHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 min-h-0"
            >
              <span>📊</span> Dashboard {profile.role === 'admin' ? 'Admin' : profile.role === 'petani' ? 'Petani' : 'Pembeli'}
            </Link>

            {profile.role === 'pembeli' && (
              <Link
                href="/pembeli/pesanan"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 min-h-0"
              >
                <span>📦</span> Pesanan Saya
              </Link>
            )}

            {profile.role === 'petani' && (
              <Link
                href="/petani/keuangan"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 min-h-0"
              >
                <span>💰</span> Keuangan Tani
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1 mt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left min-h-0"
            >
              <span>🚪</span> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

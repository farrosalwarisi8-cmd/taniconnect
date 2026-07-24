'use client'

import { useState } from 'react'
import { EditPembeliProfileModal } from './EditPembeliProfileModal'
import { formatRupiah, formatDateID, TRANSACTION_STATUS_LABELS } from '@/lib/utils'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

interface PembeliProfile {
  full_name: string
  phone: string
  email: string | null
  city: string | null
  province: string | null
  address: string | null
  bio: string | null
  is_verified: boolean
  avatar_storage_path: string | null
  created_at: string
}

interface PembeliProfileClientProps {
  profile: PembeliProfile
  stats: {
    totalOrders: number
    completedSpend: number
    completedOrders: number
  }
  recentOrders: Array<{
    id: string
    created_at: string
    total_amount: number
    status: string
  }>
}

export function PembeliProfileClient({ profile: initialProfile, stats, recentOrders }: PembeliProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [showEdit, setShowEdit] = useState(false)

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'P'

  const memberSince = profile.created_at
    ? formatDateID(profile.created_at, 'long')
    : '—'

  return (
    <>
      <main className="min-h-screen bg-[#FAFAF9] pb-28">
        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0F2942 0%, #1E3A5F 50%, #1D4ED8 100%)' }}>
          <div className="blob-bg w-56 h-56 bg-blue-300 top-[-40px] right-[-30px]" />
          <div className="blob-bg w-36 h-36 bg-blue-200 bottom-[-20px] left-[10px]" />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
            <Link
              href="/pembeli/marketplace"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-[13px] font-medium mb-6 min-h-0 touch-target-exempt transition-colors"
            >
              ← Kembali ke Marketplace
            </Link>

            <div className="flex items-start gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-3xl border-2 border-white/30 shadow-lg shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-2xl sm:text-3xl leading-tight">
                  {profile.full_name}
                </h1>
                <p className="text-white/70 text-[13px] mt-1">🛒 Pembeli · TaniConnect</p>
                {(profile.city || profile.province) && (
                  <p className="text-white/80 text-[14px] mt-1">
                    📍 {[profile.city, profile.province].filter(Boolean).join(', ')}
                  </p>
                )}
                <p className="text-white/60 text-[12px] mt-1">Bergabung {memberSince}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-10 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {stats.totalOrders}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Total Pesanan</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {stats.completedOrders}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Selesai</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-[12px] font-bold text-blue-700 leading-tight">
                {formatRupiah(stats.completedSpend)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Total Belanja</p>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-gray-900">Informasi Profil</h2>
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                id="btn-edit-profil-pembeli"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[13px] rounded-xl transition-colors min-h-0 touch-target-exempt"
              >
                ✏️ Edit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Telepon</p>
                  <p className="text-[14px] font-semibold text-gray-900">{profile.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">✉️</span>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Email</p>
                  <p className="text-[14px] font-semibold text-gray-900 truncate">{profile.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">🏙️</span>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Kota</p>
                  <p className="text-[14px] font-semibold text-gray-900">{profile.city || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">🗺️</span>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Provinsi</p>
                  <p className="text-[14px] font-semibold text-gray-900">{profile.province || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-gray-900">Pesanan Terbaru</h2>
              <Link
                href="/pembeli/pesanan"
                className="text-[13px] text-blue-600 font-semibold hover:underline min-h-0 touch-target-exempt"
              >
                Lihat Semua →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🧺</div>
                <p className="text-gray-500 text-[14px]">Belum ada pesanan.</p>
                <Link
                  href="/pembeli/marketplace"
                  className="inline-block mt-3 px-5 py-2 bg-blue-50 text-blue-700 font-semibold text-[13px] rounded-xl hover:bg-blue-100 transition-colors min-h-0 touch-target-exempt"
                >
                  Mulai Belanja →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const statusInfo = TRANSACTION_STATUS_LABELS[order.status] ?? { label: order.status, variant: 'neutral' as const }
                  return (
                    <div key={order.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-[14px]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[12px] text-gray-500">{formatDateID(order.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[14px] text-gray-900">{formatRupiah(order.total_amount)}</p>
                        <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/pembeli/marketplace"
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover-lift flex items-center gap-3 min-h-0"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">🛒</div>
              <div>
                <p className="font-semibold text-gray-900 text-[14px]">Marketplace</p>
                <p className="text-[12px] text-gray-500">Belanja produk segar</p>
              </div>
            </Link>
            <Link
              href="/pembeli/pesanan"
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover-lift flex items-center gap-3 min-h-0"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">📦</div>
              <div>
                <p className="font-semibold text-gray-900 text-[14px]">Pesanan</p>
                <p className="text-[12px] text-gray-500">Lacak status order</p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {showEdit && (
        <EditPembeliProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated: any) => setProfile(prev => ({ ...prev, ...updated }))}
        />
      )}
    </>
  )
}

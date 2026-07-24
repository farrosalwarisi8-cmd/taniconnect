'use client'

import { useState } from 'react'
import { EditProfileModal } from './EditProfileModal'
import { formatRupiah, formatDateID } from '@/lib/utils'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

interface PetaniProfile {
  full_name: string
  phone: string
  email: string | null
  city: string | null
  province: string | null
  address: string | null
  bio: string | null
  is_verified: boolean
  kyc_submitted_at: string | null
  avatar_storage_path: string | null
  rating_avg: number | null
  rating_count: number | null
  created_at: string
}

interface PetaniProfileClientProps {
  profile: PetaniProfile
  stats: {
    totalProducts: number
    totalIncome: number
    activeProducts: number
  }
  recentProducts: Array<{
    id: string
    name: string
    price_per_unit: number
    unit: string
    status: string
    category: string
  }>
}

export function PetaniProfileClient({ profile: initialProfile, stats, recentProducts }: PetaniProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [showEdit, setShowEdit] = useState(false)

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'P'

  const memberSince = profile.created_at
    ? formatDateID(profile.created_at, 'long')
    : '—'

  const CATEGORY_ICONS: Record<string, string> = {
    sayuran: '🥬', buah: '🍎', beras_padi: '🌾', rempah: '🌶️', lainnya: '📦',
  }

  return (
    <>
      <main className="min-h-screen bg-[#FAFAF9] pb-28">
        {/* Hero Header */}
        <div className="relative gradient-dashboard overflow-hidden">
          {/* Decorative blobs */}
          <div className="blob-bg w-64 h-64 bg-white top-[-60px] right-[-40px]" />
          <div className="blob-bg w-40 h-40 bg-white bottom-[-20px] left-[-20px]" />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
            <Link
              href="/petani/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-[13px] font-medium mb-6 min-h-0 touch-target-exempt transition-colors"
            >
              ← Kembali ke Dashboard
            </Link>

            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-3xl sm:text-4xl border-2 border-white/30 shadow-lg">
                  {initials}
                </div>
                {profile.is_verified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 flex-wrap">
                  <h1 className="text-white font-bold text-2xl sm:text-3xl leading-tight">
                    {profile.full_name}
                  </h1>
                  {profile.is_verified ? (
                    <Badge variant="verified" size="sm">✓ Terverifikasi</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">⏳ Belum Terverifikasi</Badge>
                  )}
                </div>
                <p className="text-white/70 text-[13px] mt-1">🌾 Petani · TaniConnect</p>
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
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {stats.activeProducts}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Produk Aktif</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {profile.rating_avg ? profile.rating_avg.toFixed(1) : '—'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Rating ⭐</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-[13px] font-bold text-green-700 leading-tight">
                {formatRupiah(stats.totalIncome)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Pendapatan</p>
            </div>
          </div>

          {/* Bio & Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-gray-900">Informasi Profil</h2>
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                id="btn-edit-profile"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-[13px] rounded-xl transition-colors min-h-0 touch-target-exempt"
              >
                ✏️ Edit
              </button>
            </div>

            <div className="space-y-3">
              {profile.bio && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[14px] text-gray-600 leading-relaxed italic">
                    &ldquo;{profile.bio}&rdquo;
                  </p>
                </div>
              )}

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
          </div>

          {/* KYC Status */}
          {!profile.is_verified && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📋</div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 text-[15px]">Verifikasi Akun Kamu</h3>
                  <p className="text-amber-700 text-[13px] mt-1 leading-relaxed">
                    {profile.kyc_submitted_at
                      ? `Dokumen dikirim ${formatDateID(profile.kyc_submitted_at)}. Sedang ditinjau admin.`
                      : 'Upload KTP dan foto lahan untuk mendapatkan badge terverifikasi. Produkmu akan lebih dipercaya pembeli!'}
                  </p>
                  {!profile.kyc_submitted_at && (
                    <Link
                      href="/petani/dashboard"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[13px] rounded-xl transition-colors min-h-0 touch-target-exempt"
                    >
                      Upload Dokumen KYC →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Products */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-gray-900">Produk Terakhir</h2>
              <Link
                href="/petani/produk/baru"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-[12px] rounded-xl transition-colors min-h-0 touch-target-exempt"
              >
                + Jual Produk
              </Link>
            </div>

            {recentProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🌱</div>
                <p className="text-gray-500 text-[14px]">Belum ada produk yang dijual.</p>
                <Link
                  href="/petani/produk/baru"
                  className="inline-block mt-3 px-5 py-2 bg-green-50 text-green-700 font-semibold text-[13px] rounded-xl hover:bg-green-100 transition-colors min-h-0 touch-target-exempt"
                >
                  Mulai Jual Panen →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl shrink-0">
                      {CATEGORY_ICONS[p.category] ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-[14px] truncate">{p.name}</p>
                      <p className="text-[12px] text-gray-500">{formatRupiah(p.price_per_unit)} / {p.unit}</p>
                    </div>
                    <Badge
                      variant={p.status === 'active' ? 'success' : p.status === 'sold' ? 'neutral' : 'info'}
                      size="sm"
                    >
                      {p.status === 'active' ? 'Aktif' : p.status === 'sold' ? 'Terjual' : 'Draft'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/petani/keuangan"
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover-lift flex items-center gap-3 min-h-0"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">📊</div>
              <div>
                <p className="font-semibold text-gray-900 text-[14px]">Keuangan</p>
                <p className="text-[12px] text-gray-500">Catatan & analisis</p>
              </div>
            </Link>
            <Link
              href="/pembeli/marketplace"
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover-lift flex items-center gap-3 min-h-0"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">🛒</div>
              <div>
                <p className="font-semibold text-gray-900 text-[14px]">Marketplace</p>
                <p className="text-[12px] text-gray-500">Lihat semua produk</p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated: any) => setProfile(prev => ({ ...prev, ...updated }))}
        />
      )}
    </>
  )
}

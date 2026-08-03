import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID, getDisplayName, getInitials, getEntityLabel } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profil Admin',
}

export default async function AdminProfilPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone, email, city, province, role, is_verified, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (!profileData || profileData.role !== 'admin') redirect('/unauthorized')

  const [
    { count: totalUsers },
    { count: totalPetani },
    { count: totalPembeli },
    { count: pendingKYC },
    { count: totalProducts },
    { count: txToday },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'petani'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pembeli'),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('is_verified', false).not('kyc_submitted_at', 'is', null),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('transactions').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ])

  const displayName = getDisplayName(profileData.full_name, 'Administrator')
  const initials = getInitials(profileData.full_name, 'A')

  const memberSince = profileData.created_at
    ? formatDateID(profileData.created_at, 'long')
    : '—'

  const platformStats = [
    { label: 'Total Pengguna', value: totalUsers ?? 0, icon: '👥', color: 'bg-violet-50 text-violet-700' },
    { label: 'Petani', value: totalPetani ?? 0, icon: '🌾', color: 'bg-green-50 text-green-700' },
    { label: 'Pembeli', value: totalPembeli ?? 0, icon: '🛒', color: 'bg-blue-50 text-blue-700' },
    { label: 'KYC Pending', value: pendingKYC ?? 0, icon: '⚠️', color: 'bg-amber-50 text-amber-700' },
    { label: 'Produk Aktif', value: totalProducts ?? 0, icon: '📦', color: 'bg-teal-50 text-teal-700' },
    { label: 'Transaksi Hari Ini', value: txToday ?? 0, icon: '💸', color: 'bg-rose-50 text-rose-700' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-up">
      {/* Profile Hero */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #1a0533 0%, #2d1065 50%, #4C1D95 100%)' }}>
        <div className="blob-bg w-64 h-64 bg-purple-400 top-[-40px] right-[-30px]" />
        <div className="blob-bg w-40 h-40 bg-violet-300 bottom-[-20px] left-[20px]" />

        <div className="relative p-6 sm:p-8 flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-3xl border-2 border-white/30 shadow-lg shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-white font-bold text-2xl sm:text-3xl leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {displayName}
              </h1>
              <span className="bg-white/20 text-white text-[12px] font-semibold px-3 py-1 rounded-full">
                🔐 Administrator
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              <p className="text-white/80 text-[14px]">📱 {getEntityLabel(profileData.phone, '—')}</p>
              <p className="text-white/80 text-[14px] truncate">✉️ {getEntityLabel(profileData.email, '—')}</p>
              <p className="text-white/80 text-[14px]">
                📍 {getEntityLabel([profileData.city, profileData.province].filter(Boolean).join(', '), '—')}
              </p>
            </div>

            <p className="text-white/50 text-[12px] mt-2">Admin sejak {memberSince}</p>
          </div>
        </div>
      </div>

      {/* Platform Stats Grid */}
      <div>
        <h2 className="text-[16px] font-bold text-gray-900 mb-3">Statistik Platform</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {platformStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 rounded-xl ${stat.color.split(' ')[0]} flex items-center justify-center text-xl mb-3`}>
                {stat.icon}
              </div>
              <p
                className={`text-3xl font-extrabold leading-none ${stat.color.split(' ')[1]}`}
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {stat.value.toLocaleString('id-ID')}
              </p>
              <p className="text-[12px] text-gray-500 mt-1.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Alert */}
      {(pendingKYC ?? 0) > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-3xl">⚠️</div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 text-[15px]">
              {pendingKYC} Verifikasi KYC Menunggu
            </h3>
            <p className="text-amber-700 text-[13px] mt-1">
              Ada petani yang menunggu verifikasi identitas. Tinjau sekarang untuk mempercepat aktivasi akun mereka.
            </p>
            <Link
              href="/admin/verifikasi"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[13px] rounded-xl transition-colors min-h-0 touch-target-exempt"
            >
              Tinjau KYC →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-[16px] font-bold text-gray-900 mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/dashboard', icon: '📊', label: 'Dashboard', desc: 'Overview platform' },
            { href: '/admin/verifikasi', icon: '🪪', label: 'Verifikasi KYC', desc: `${pendingKYC ?? 0} menunggu` },
            { href: '/admin/wilayah', icon: '🗺️', label: 'Data Wilayah', desc: 'Distribusi pangan' },
            { href: '/admin/audit-log', icon: '📜', label: 'Audit Log', desc: 'Track aktivitas' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover-lift flex flex-col gap-2 min-h-0"
            >
              <div className="text-2xl">{action.icon}</div>
              <div>
                <p className="font-semibold text-gray-900 text-[14px]">{action.label}</p>
                <p className="text-[12px] text-gray-500">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-[16px] font-bold text-gray-900 mb-4">Informasi Akun</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xl">🔐</span>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Role</p>
              <p className="text-[14px] font-semibold text-gray-900 capitalize">{profileData.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Status</p>
              <p className="text-[14px] font-semibold text-green-700">Akun Aktif</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xl">📱</span>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Telepon</p>
              <p className="text-[14px] font-semibold text-gray-900">{getEntityLabel(profileData.phone, '—')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xl">✉️</span>
            <div>
              <p className="text-[11px] text-gray-500 font-medium">Email</p>
              <p className="text-[14px] font-semibold text-gray-900 truncate">{getEntityLabel(profileData.email, '—')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

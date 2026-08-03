import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID, getDisplayName, getFirstName } from '@/lib/utils'
import type { Tables } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'


export default async function PetaniDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, is_verified, city, province')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const profile = profileData as
    | (Pick<Tables<'profiles'>, 'full_name' | 'is_verified' | 'city'> & {
      province?: string | null
    })
    | null

  const currentYear = new Date().getFullYear()
  const { data: recordsData } = await supabase
    .from('financial_records')
    .select('record_type, total_amount')
    .eq('farmer_id', user.id)
    .eq('season_year', currentYear)

  const { count: activeProductCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .eq('status', 'active')

  const records = (recordsData ?? []) as Array<
    Pick<Tables<'financial_records'>, 'record_type' | 'total_amount'>
  >

  const totalIncome = records
    .filter((r) => r.record_type === 'income')
    .reduce((s, r) => s + Number(r.total_amount), 0)
  const totalExpense = records
    .filter((r) => r.record_type === 'expense')
    .reduce((s, r) => s + Number(r.total_amount), 0)
  const profit = totalIncome - totalExpense

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  })()

  const rawName = profile?.full_name?.trim() ?? ''
  const firstName = getFirstName(rawName, 'Petani')

  const QUICK_LINKS = [
    {
      href: '/tanya-ai',
      icon: '🤖',
      label: 'Tanya AI',
      desc: 'Konsultasi langsung',
      gradient: 'from-violet-500 to-purple-600',
      featured: true,
    },
    {
      href: '/prediksi-harga',
      icon: '🔮',
      label: 'Prediksi Harga',
      desc: 'Analisis komoditas',
      gradient: 'from-blue-500 to-cyan-600',
      featured: true,
    },
    {
      href: '/petani/produk/baru',
      icon: '🌾',
      label: 'Jual Panen',
      desc: 'Upload produk baru',
      gradient: null,
      featured: false,
    },
    {
      href: '/petani/produk',
      icon: '📦',
      label: 'Produk Saya',
      desc: 'Kelola listing',
      gradient: null,
      featured: false,
    },
    {
      href: '/petani/keuangan',
      icon: '📊',
      label: 'Keuangan',
      desc: 'Catat & analisis',
      gradient: null,
      featured: false,
    },
    {
      href: '/pembeli/marketplace',
      icon: '🛒',
      label: 'Marketplace',
      desc: 'Lihat semua produk',
      gradient: null,
      featured: false,
    },
    {
      href: '/harga-pangan',
      icon: '💹',
      label: 'Harga Pangan',
      desc: 'Info pasar terkini',
      gradient: null,
      featured: false,
    },
  ]

  return (
    <main className="min-h-screen bg-[#FAFAF9] pb-24">
      {/* Hero Header */}
      <div className="gradient-dashboard relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-6 right-8 text-6xl opacity-10 select-none">
          🌿
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20">
          {/* Top bar: greeting + profile link */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-white/70 text-[13px] font-medium mb-0.5">
                {greeting}, 👋
              </p>
              <h1
                className="text-white leading-tight"
                style={{
                  fontFamily: "'Bricolage Grotesque', ui-sans-serif",
                  fontSize: 'clamp(26px, 5.5vw, 42px)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                {getDisplayName(firstName, 'Petani')}
              </h1>
              <p className="text-white/60 text-[12px] mt-1">
                {formatDateID(new Date(), 'full')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {profile?.is_verified ? (
                <Badge variant="verified" size="md">
                  ✓ Terverifikasi
                </Badge>
              ) : (
                <Badge variant="warning" size="md">
                  ⏳ KYC menunggu
                </Badge>
              )}
              <Link
                href="/petani/profil"
                className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg transition-colors min-h-0 touch-target-exempt border border-white/30"
                aria-label="Profil saya"
                title="Lihat profil"
              >
                {getDisplayName(firstName, 'P')[0]?.toUpperCase() ?? 'P'}
              </Link>
            </div>
          </div>

          {/* Location */}
          {(profile?.city || profile?.province) && (
            <p className="text-white/60 text-[13px]">
              📍 {[profile?.city, profile?.province].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 space-y-6">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-sm">
                💰
              </div>
              <p className="text-[12px] text-gray-500 font-medium">Pendapatan</p>
            </div>
            <p
              className="text-[22px] font-extrabold text-green-700 leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {formatRupiah(totalIncome)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Tahun {currentYear}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-sm">
                📦
              </div>
              <p className="text-[12px] text-gray-500 font-medium">Modal</p>
            </div>
            <p
              className="text-[22px] font-extrabold text-gray-700 leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {formatRupiah(totalExpense)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Pengeluaran</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${profit >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                  }`}
              >
                {profit >= 0 ? '📈' : '📉'}
              </div>
              <p className="text-[12px] text-gray-500 font-medium">Keuntungan</p>
            </div>
            <p
              className={`text-[22px] font-extrabold leading-tight ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {formatRupiah(profit)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {profit >= 0 ? 'Untung' : 'Rugi'}
            </p>
          </div>

          <Link
            href="/petani/produk"
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all group min-h-0"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-sm">
                🌾
              </div>
              <p className="text-[12px] text-gray-500 font-medium">Produk Aktif</p>
            </div>
            <p
              className="text-[32px] font-extrabold text-blue-700 leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {activeProductCount ?? 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-1 group-hover:text-green-600 transition-colors">
              Kelola produk →
            </p>
          </Link>
        </div>

        {/* Quick Access */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-gray-900">Akses Cepat</h2>
            <Link
              href="/petani/profil"
              className="text-[13px] text-green-600 font-semibold hover:underline min-h-0 touch-target-exempt"
            >
              Profil →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group min-h-0"
              >
                {link.gradient ? (
                  <div
                    className={`bg-gradient-to-br ${link.gradient} rounded-2xl p-4 h-full flex flex-col justify-between min-h-[100px] relative overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5`}
                  >
                    <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
                      AI
                    </div>
                    <div className="text-3xl mb-2">{link.icon}</div>
                    <div>
                      <p className="font-bold text-white text-[14px] leading-tight">
                        {link.label}
                      </p>
                      <p className="text-white/70 text-[11px] mt-0.5">
                        {link.desc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 h-full flex flex-col justify-between min-h-[100px] shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200 hover:-translate-y-0.5">
                    <div className="text-3xl mb-2">{link.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-900 text-[14px] leading-tight">
                        {link.label}
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {link.desc}
                      </p>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* CTA jika belum ada data */}
        {records.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
              <div className="text-5xl mb-3 animate-float">🌱</div>
              <h3 className="text-[18px] font-bold text-gray-900 mb-2">
                Siap panen?
              </h3>
              <p className="text-gray-600 text-[14px] mb-4 max-w-xs mx-auto">
                Mulai catat modal & pendapatan agar dashboard bisa memberi
                insight untukmu.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/petani/keuangan"
                  className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-5 py-3 text-[14px] transition-colors shadow-sm min-h-[48px]"
                >
                  📊 Catat Modal Pertama
                </Link>
                <Link
                  href="/tanya-ai"
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-green-200 text-green-700 font-semibold rounded-xl px-5 py-3 text-[14px] hover:bg-green-50 transition-colors min-h-[48px]"
                >
                  🤖 Tanya AI Dulu
                </Link>
                <Link
                  href="/prediksi-harga"
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-blue-200 text-blue-700 font-semibold rounded-xl px-5 py-3 text-[14px] hover:bg-blue-50 transition-colors min-h-[48px]"
                >
                  🔮 Prediksi Harga
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Info Bar */}
        <div className="flex gap-3 items-center bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">
            💹
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">
              Info Harga Pangan Hari Ini
            </p>
            <p className="text-[12px] text-gray-500 hidden sm:block">
              Data resmi Bapanas & PIHPS BI, gratis untuk umum
            </p>
          </div>
          <Link
            href="/harga-pangan"
            className="text-green-700 font-semibold text-[13px] hover:underline shrink-0 min-h-0 touch-target-exempt"
          >
            Lihat →
          </Link>
        </div>
      </div>
    </main>
  )
}
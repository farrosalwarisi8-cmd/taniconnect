// app/(petani)/petani/dashboard/page.tsx
//
// Layout mirror dashboard penyedia (header gradient + metric cards border-l-4 +
// gradient CTA + shortcut Pesan + Recent items + Tips card),
// TAPI semua fitur lama dipertahankan:
//   - Quick Access grid 8 shortcut (dengan featured gradient untuk AI)
//   - Empty state CTA "Siap panen?" kalau belum ada financial records
//   - Info bar Harga Pangan di bawah
//
// Penambahan baru:
//   - Shortcut Pesan Masuk dengan badge unread count
//   - Recent Products grid
//   - Tips card konsisten dengan penyedia

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRupiah, formatDateID, getDisplayName, getFirstName } from '@/lib/utils'
import type { Tables } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard Petani',
}

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

  // ─── Produk milik petani ──────────────────────────────────────────────────
  const { data: productsData, count: totalProducts } = await supabase
    .from('products')
    .select('id, name, price_per_unit, unit, stock_quantity, status, image_paths', { count: 'exact' })
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((productsData ?? []) as any[]) as Array<{
    id: string
    name: string
    price_per_unit: number
    unit: string
    stock_quantity: number
    status: string
    image_paths: string[] | null
  }>

  const activeProducts = products.filter((p) => p.status === 'active').length

  // ─── Keuangan tahun berjalan ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const { data: recordsData } = await supabase
    .from('financial_records')
    .select('record_type, total_amount')
    .eq('farmer_id', user.id)
    .eq('season_year', currentYear)

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

  // ─── Unread messages untuk shortcut Pesan ─────────────────────────────────
  const { data: myConvos } = await supabase
    .from('conversations')
    .select('id')
    .eq('seller_id', user.id)

  const myConvoIds = (myConvos ?? []).map((c: { id: string }) => c.id)

  let unreadMessages = 0
  if (myConvoIds.length > 0) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', myConvoIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)
    unreadMessages = count ?? 0
  }

  const rawName = profile?.full_name?.trim() ?? ''
  const firstName = getFirstName(rawName, 'Petani')

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  })()

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const getFirstImageUrl = (imagePaths: string[] | null): string | null => {
    if (!imagePaths || imagePaths.length === 0) return null
    const p = imagePaths[0]
    return p.startsWith('http')
      ? p
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${p}`
  }

  // ─── Quick Access links — dipertahankan dari versi lama ───────────────────
  // Note: 2 pertama (Tanya AI & Prediksi) featured pakai gradient color card,
  // sisanya card putih polos. Ini pola dari desain lama yang harus dijaga.
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
      href: '/petani/pengiriman',
      icon: '🚚',
      label: 'Pengiriman',
      desc: 'Kelola jasa kirim',
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Header — gradient hijau, pola sama dengan penyedia ────────────── */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 -m-4 sm:-m-6 lg:-m-8 mb-0 p-6 sm:p-8 rounded-b-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-4 right-8 text-6xl opacity-10 select-none">🌾</div>

        <div className="relative">
          <p className="text-white/80 text-[13px] font-medium mb-1">{greeting}, 👋</p>
          <h1
            className="text-white leading-tight mb-2"
            style={{
              fontFamily: "'Bricolage Grotesque', ui-sans-serif",
              fontSize: 'clamp(24px, 5vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            {getDisplayName(firstName, 'Petani')}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white/70 text-[13px]">
              {formatDateID(new Date(), 'full')}
            </p>
            {profile?.is_verified ? (
              <Badge variant="verified" size="sm">✓ Terverifikasi</Badge>
            ) : (
              <Badge variant="warning" size="sm">⏳ KYC menunggu</Badge>
            )}
          </div>
          {(profile?.city || profile?.province) && (
            <p className="text-white/60 text-[12px] mt-2">
              📍 {[profile?.city, profile?.province].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* ─── Metric Cards — pola sama persis dengan penyedia ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
        <Card variant="standard" padding="md" className="border-l-4 !border-l-green-500">
          <p className="text-caption text-fg/60 mb-1">🌾 Produk</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalProducts ?? 0}
          </p>
          <p className="text-caption text-green-600 mt-1">
            {activeProducts} aktif
          </p>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
          <p className="text-caption text-fg/60 mb-1">💰 Pendapatan</p>
          <p
            className="text-success font-extrabold leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 22 }}
          >
            {formatRupiah(totalIncome)}
          </p>
          <p className="text-caption text-fg/60 mt-1">Tahun {currentYear}</p>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-amber">
          <p className="text-caption text-fg/60 mb-1">📦 Modal</p>
          <p
            className="text-amber font-extrabold leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 22 }}
          >
            {formatRupiah(totalExpense)}
          </p>
          <p className="text-caption text-fg/60 mt-1">Pengeluaran</p>
        </Card>

        <Card
          variant="standard"
          padding="md"
          className={`border-l-4 ${profit >= 0 ? '!border-l-primary' : '!border-l-error'}`}
        >
          <p className="text-caption text-fg/60 mb-1">
            {profit >= 0 ? '📈' : '📉'} Keuntungan
          </p>
          <p
            className={`font-extrabold leading-tight ${
              profit >= 0 ? 'text-primary-dark' : 'text-error'
            }`}
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 22 }}
          >
            {formatRupiah(profit)}
          </p>
          <p className="text-caption text-fg/60 mt-1">
            {profit >= 0 ? 'Untung' : 'Rugi'}
          </p>
        </Card>
      </div>

      {/* ─── Quick Actions — CTA gradient card besar ────────────────────────── */}
      <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-green-500 to-emerald-600 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-h2 text-white font-bold mb-2">🌾 Mulai Jual Panen</h2>
            <p className="text-white/90 text-body">
              Upload produk panen milikmu dan raih pembeli dari seluruh Indonesia!
            </p>
          </div>
          <Link href="/petani/produk/baru">
            <Button
              size="lg"
              className="!bg-white !text-green-700 hover:!bg-green-50 shrink-0"
            >
              + Tambah Produk Baru
            </Button>
          </Link>
        </div>
      </Card>

      {/* ─── Shortcut Pesan Masuk (BARU) ────────────────────────────────────── */}
      <Link href="/petani/pesan" className="block group">
        <Card
          variant="standard"
          padding="md"
          hover
          className="border-l-4 !border-l-green-400 group-hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:bg-green-100 transition-colors">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-fg-dark text-sm">Pesan Masuk</p>
                {unreadMessages > 0 && (
                  <span className="inline-flex items-center justify-center bg-[#ee4d2d] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </div>
              <p className="text-caption text-fg/60">
                {unreadMessages > 0
                  ? `${unreadMessages} pesan belum dibaca`
                  : 'Lihat semua percakapan dengan pembeli'}
              </p>
            </div>
            <span className="text-fg/30 text-lg shrink-0 group-hover:text-green-400 transition-colors">›</span>
          </div>
        </Card>
      </Link>

      {/* ─── Akses Cepat — DIPERTAHANKAN dari versi lama ────────────────────
       *  8 shortcut cards: 2 pertama featured (Tanya AI + Prediksi Harga) dengan
       *  gradient purple/blue, sisanya card putih polos. Layout responsive grid.
       * ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h4 text-fg-dark font-bold">⚡ Akses Cepat</h2>
          <Link
            href="/petani/profil"
            className="text-green-600 font-semibold text-sm hover:underline min-h-0"
          >
            Profil →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
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
                    <p className="font-semibold text-fg-dark text-[14px] leading-tight">
                      {link.label}
                    </p>
                    <p className="text-fg/60 text-[11px] mt-0.5">
                      {link.desc}
                    </p>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Empty state CTA "Siap panen?" — DIPERTAHANKAN dari versi lama ──
       *  Hanya tampil kalau belum ada financial records — mendorong petani baru
       *  untuk mulai catat modal + eksplor fitur AI.
       * ─────────────────────────────────────────────────────────────────────── */}
      {records.length === 0 && (
        <Card variant="standard" padding="none" className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
            <div className="text-5xl mb-3">🌱</div>
            <h3 className="text-h4 text-fg-dark font-bold mb-2">
              Siap panen?
            </h3>
            <p className="text-fg/70 text-body mb-4 max-w-md mx-auto">
              Mulai catat modal & pendapatan agar dashboard bisa memberi
              insight untukmu.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/petani/keuangan"
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-5 py-3 text-sm transition-colors shadow-sm min-h-0"
              >
                📊 Catat Modal Pertama
              </Link>
              <Link
                href="/tanya-ai"
                className="inline-flex items-center justify-center gap-2 bg-white border-2 border-green-200 text-green-700 font-semibold rounded-xl px-5 py-3 text-sm hover:bg-green-50 transition-colors min-h-0"
              >
                🤖 Tanya AI Dulu
              </Link>
              <Link
                href="/prediksi-harga"
                className="inline-flex items-center justify-center gap-2 bg-white border-2 border-blue-200 text-blue-700 font-semibold rounded-xl px-5 py-3 text-sm hover:bg-blue-50 transition-colors min-h-0"
              >
                🔮 Prediksi Harga
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Recent Products (BARU) ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h4 text-fg-dark font-bold">🌾 Produk Terbaru</h2>
          <Link
            href="/petani/produk"
            className="text-green-600 font-semibold text-sm hover:underline min-h-0"
          >
            Lihat semua →
          </Link>
        </div>

        {products.length === 0 ? (
          <Card variant="standard" padding="lg" className="text-center border-dashed">
            <div className="text-5xl mb-3">🌱</div>
            <h3 className="text-h4 text-fg-dark font-bold mb-2">
              Belum ada produk terdaftar
            </h3>
            <p className="text-body text-fg/60 mb-4 max-w-md mx-auto">
              Mulai upload hasil panen pertamamu untuk mulai
              menerima pesanan dari pembeli seluruh Indonesia.
            </p>
            <Link href="/petani/produk/baru">
              <Button size="lg">+ Upload Produk Pertama</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((item) => {
              const thumbUrl = getFirstImageUrl(item.image_paths)
              const isActive = item.status === 'active'
              return (
                <Card key={item.id} variant="standard" padding="md" hover>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">🌾</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-fg-dark truncate">
                        {getDisplayName(item.name, 'Produk')}
                      </p>
                      <p className="text-caption text-fg/60">
                        Stok: {item.stock_quantity} {item.unit}
                      </p>
                    </div>
                    <Badge
                      variant={isActive ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {isActive ? '✓ Aktif' : '⏸ Nonaktif'}
                    </Badge>
                  </div>
                  <p className="text-body text-green-600 font-bold">
                    {formatRupiah(item.price_per_unit)}
                    <span className="text-caption text-fg/60 font-normal">
                      {' '}/ {item.unit}
                    </span>
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Info Bar Harga Pangan — DIPERTAHANKAN dari versi lama ─────────── */}
      <Card variant="standard" padding="md">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">
            💹
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg-dark">
              Info Harga Pangan Hari Ini
            </p>
            <p className="text-caption text-fg/60 hidden sm:block">
              Data resmi Bapanas & PIHPS BI, gratis untuk umum
            </p>
          </div>
          <Link
            href="/harga-pangan"
            className="text-green-700 font-semibold text-sm hover:underline shrink-0 min-h-0"
          >
            Lihat →
          </Link>
        </div>
      </Card>

      {/* ─── Tips Card (BARU) — konsisten dengan penyedia ──────────────────── */}
      <Card variant="standard" padding="lg" className="!bg-amber/5 border-l-4 !border-l-amber">
        <div className="flex gap-3">
          <div className="text-3xl shrink-0">💡</div>
          <div>
            <p className="font-bold text-fg-dark mb-1">Tips Petani Sukses</p>
            <ul className="text-caption text-fg/70 space-y-1">
              <li>• Upload foto hasil panen yang jelas dan menarik</li>
              <li>• Tetapkan harga kompetitif sesuai kondisi pasar</li>
              <li>• Verifikasi KYC untuk mendapat kepercayaan pembeli</li>
              <li>• Balas pesan dan pesanan pembeli dalam 24 jam</li>
              <li>• Catat modal & pendapatan agar keuangan terpantau</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
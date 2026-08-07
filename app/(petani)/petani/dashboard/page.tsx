// app/(petani)/petani/dashboard/page.tsx
//
// Redesign: struktur & pola visual sama dengan dashboard penyedia
// (bg-gradient header + decorative circles + 4 metric cards dengan
// border-l-4 + Quick Actions gradient card + shortcut Pesan + Recent
// Products + Tips card).
//
// Perbedaan dari penyedia:
//   - Palette hijau/emerald (bukan blue/cyan)
//   - Icon utama 🌾 (bukan 🚜)
//   - Subtitle role "Petani"
//   - Metric ke-4: produk aktif (bukan rata-rata sewa)
//   - Recent items: produk (bukan alat/equipment)
//   - CTA utama: "Jual Panen" ke /petani/produk/baru

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

  // ─── Ambil daftar produk milik petani ─────────────────────────────────────
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

  // ─── Ringkasan keuangan tahun berjalan ────────────────────────────────────
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

  // ─── Hitung unread messages untuk shortcut Pesan ──────────────────────────
  // Pola 2-step yang aman dari picky foreign-key hint Supabase:
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

  // ─── URL utility untuk thumbnail produk (sama seperti di halaman produk) ──
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const getFirstImageUrl = (imagePaths: string[] | null): string | null => {
    if (!imagePaths || imagePaths.length === 0) return null
    const p = imagePaths[0]
    return p.startsWith('http')
      ? p
      : `${SUPABASE_URL}/storage/v1/object/public/product-images/${p}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Header — gradient hijau khas petani ────────────────────────────── */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 -m-4 sm:-m-6 lg:-m-8 mb-0 p-6 sm:p-8 rounded-b-3xl relative overflow-hidden">
        {/* Decorative circles */}
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

      {/* ─── Quick Actions — gradient card besar dengan CTA ────────────────── */}
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

      {/* ─── Shortcut Pesan — konsisten dengan penyedia ────────────────────── */}
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

      {/* ─── Recent Products ────────────────────────────────────────────────── */}
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
                    {/* Thumbnail */}
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
                      {' '}
                      / {item.unit}
                    </span>
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Tips Card — pola sama dengan penyedia ─────────────────────────── */}
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
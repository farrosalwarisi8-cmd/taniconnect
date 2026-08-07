// app/(penyedia)/penyedia/dashboard/page.tsx

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRupiah, formatDateID, getDisplayName, getFirstName } from '@/lib/utils'
import type { Tables } from '@/lib/supabase/client'

export const metadata = {
  title: 'Dashboard Penyedia',
}

export default async function PenyediaDashboardPage() {
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

  // Ambil daftar alat milik penyedia
  const { data: equipmentData, count: totalEquipment } = await supabase
    .from('equipment')
    .select('id, name, price_rent, price_sell, is_available, stock', { count: 'exact' })
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const equipment = (equipmentData ?? []) as Array<
    Pick<Tables<'equipment'>, 'id' | 'name' | 'price_rent' | 'price_sell' | 'is_available' | 'stock'>
  >

  const activeEquipment = equipment.filter((e) => e.is_available).length

  // Booking masuk (rental_bookings)
  const { count: totalBookings } = await supabase
    .from('rental_bookings')
    .select('*', { count: 'exact', head: true })
    .in(
      'equipment_id',
      equipment.length > 0 ? equipment.map((e) => e.id) : ['00000000-0000-0000-0000-000000000000']
    )

  const { count: pendingBookings } = await supabase
    .from('rental_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .in(
      'equipment_id',
      equipment.length > 0 ? equipment.map((e) => e.id) : ['00000000-0000-0000-0000-000000000000']
    )

  // ─── Hitung unread messages untuk badge di shortcut Pesan ─────────────────
  // Query ringan: hanya count, tidak perlu ambil content sama sekali
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select(
      `
      id,
      conversations!inner (seller_id)
    `,
      { count: 'exact', head: true }
    )
    .eq('is_read', false)
    .neq('sender_id', user.id)
    .eq('conversations.seller_id', user.id)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Penyedia'

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  })()

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 -m-4 sm:-m-6 lg:-m-8 mb-0 p-6 sm:p-8 rounded-b-3xl relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-4 right-8 text-6xl opacity-10 select-none">🚜</div>

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
            {getDisplayName(firstName, 'Penyedia')}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
        <Card variant="standard" padding="md" className="border-l-4 !border-l-blue-500">
          <p className="text-caption text-fg/60 mb-1">🚜 Alat/Bahan</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalEquipment ?? 0}
          </p>
          <p className="text-caption text-blue-600 mt-1">
            {activeEquipment} tersedia
          </p>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-amber">
          <p className="text-caption text-fg/60 mb-1">📥 Booking Masuk</p>
          <p
            className="text-amber font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {pendingBookings ?? 0}
          </p>
          {(pendingBookings ?? 0) > 0 && (
            <Link
              href="/penyedia/booking"
              className="text-caption text-blue-600 font-semibold hover:underline min-h-0"
            >
              Perlu konfirmasi →
            </Link>
          )}
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
          <p className="text-caption text-fg/60 mb-1">📊 Total Booking</p>
          <p
            className="text-success font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalBookings ?? 0}
          </p>
          <p className="text-caption text-fg/60 mt-1">Sepanjang waktu</p>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-primary">
          <p className="text-caption text-fg/60 mb-1">💰 Rata-rata Sewa</p>
          <p
            className="text-primary-dark font-extrabold text-xl leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            {equipment.filter((e) => e.price_rent).length > 0
              ? formatRupiah(
                  Math.round(
                    equipment
                      .filter((e) => e.price_rent)
                      .reduce((s, e) => s + Number(e.price_rent), 0) /
                    equipment.filter((e) => e.price_rent).length
                  )
                )
              : '-'}
          </p>
          <p className="text-caption text-fg/60 mt-1">per hari</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-h2 text-white font-bold mb-2">🚀 Mulai Sewakan Alat</h2>
            <p className="text-white/90 text-body">
              Daftarkan alat/bahan tani milikmu dan mulai raih pendapatan dari sewa!
            </p>
          </div>
          <Link href="/penyedia/alat/baru">
            <Button
              size="lg"
              className="!bg-white !text-blue-700 hover:!bg-blue-50 shrink-0"
            >
              + Tambah Alat Baru
            </Button>
          </Link>
        </div>
      </Card>

      {/* ─── Shortcut Pesan ─────────────────────────────────────────────────────
       *  Disisipkan di sini — setelah Quick Actions, sebelum Recent Equipment —
       *  supaya penyedia langsung lihat ada pesan masuk dari pembeli tanpa harus
       *  buka sidebar dulu. Hanya tampil kalau ada unread > 0, atau selalu
       *  tampil sebagai navigasi cepat.
       * ─────────────────────────────────────────────────────────────────────── */}
      <Link href="/penyedia/pesan" className="block group">
        <Card
          variant="standard"
          padding="md"
          hover
          className="border-l-4 !border-l-blue-400 group-hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:bg-blue-100 transition-colors">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-fg-dark text-sm">Pesan Masuk</p>
                {/* Badge unread — hanya muncul kalau ada pesan belum dibaca */}
                {(unreadMessages ?? 0) > 0 && (
                  <span className="inline-flex items-center justify-center bg-[#ee4d2d] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1">
                    {(unreadMessages ?? 0) > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </div>
              <p className="text-caption text-fg/60">
                {(unreadMessages ?? 0) > 0
                  ? `${unreadMessages} pesan belum dibaca`
                  : 'Lihat semua percakapan dengan pembeli'}
              </p>
            </div>
            <span className="text-fg/30 text-lg shrink-0 group-hover:text-blue-400 transition-colors">›</span>
          </div>
        </Card>
      </Link>

      {/* Recent Equipment */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h4 text-fg-dark font-bold">🚜 Alat Terbaru</h2>
          <Link
            href="/penyedia/alat"
            className="text-blue-600 font-semibold text-sm hover:underline min-h-0"
          >
            Lihat semua →
          </Link>
        </div>

        {equipment.length === 0 ? (
          <Card variant="standard" padding="lg" className="text-center border-dashed">
            <div className="text-5xl mb-3">🚜</div>
            <h3 className="text-h4 text-fg-dark font-bold mb-2">
              Belum ada alat terdaftar
            </h3>
            <p className="text-body text-fg/60 mb-4 max-w-md mx-auto">
              Mulai daftarkan alat/bahan tani pertama kamu untuk mulai
              menerima booking dari petani seluruh Indonesia.
            </p>
            <Link href="/penyedia/alat/baru">
              <Button size="lg">+ Daftarkan Alat Pertama</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipment.map((item) => (
              <Card key={item.id} variant="standard" padding="md" hover>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-fg-dark truncate">{getDisplayName(item.name, 'Alat')}</p>
                    <p className="text-caption text-fg/60">Stok: {item.stock}</p>
                  </div>
                  <Badge
                    variant={item.is_available ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {item.is_available ? '✓ Tersedia' : '✗ Habis'}
                  </Badge>
                </div>
                {item.price_rent && (
                  <p className="text-body text-blue-600 font-bold">
                    {formatRupiah(item.price_rent)}
                    <span className="text-caption text-fg/60 font-normal"> / hari</span>
                  </p>
                )}
                {item.price_sell && (
                  <p className="text-caption text-fg/70">
                    Jual: {formatRupiah(item.price_sell)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tips Card */}
      <Card variant="standard" padding="lg" className="!bg-amber/5 border-l-4 !border-l-amber">
        <div className="flex gap-3">
          <div className="text-3xl shrink-0">💡</div>
          <div>
            <p className="font-bold text-fg-dark mb-1">Tips Penyedia Sukses</p>
            <ul className="text-caption text-fg/70 space-y-1">
              <li>• Upload foto alat yang jelas dan berkualitas</li>
              <li>• Tetapkan harga kompetitif berdasarkan lokasi & kondisi alat</li>
              <li>• Verifikasi KYC untuk mendapat kepercayaan pembeli</li>
              <li>• Balas booking pending dalam 24 jam</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
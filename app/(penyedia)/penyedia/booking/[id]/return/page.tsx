import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID } from '@/lib/utils'
import { ReturnForm } from './_components/ReturnForm'

export const metadata = {
  title: 'Konfirmasi Pengembalian',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReturnBookingPage({ params }: Props) {
  const { id: bookingId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirect=/penyedia/booking/${bookingId}/return`)

  // Ambil booking + equipment + renter
  const { data: bookingData, error: bookingError } = await supabase
    .from('rental_bookings')
    .select(`
      id, equipment_id, renter_id, start_date, end_date, total_days,
      total_price, deposit_status, status, created_at, photo_before_url,
      equipment:equipment ( name, image_paths, owner_id, price_rent, deposit_amount ),
      renter:profiles!rental_bookings_renter_id_fkey ( full_name, phone, city )
    `)
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError || !bookingData) notFound()

  const booking = bookingData as any
  const eq = Array.isArray(booking.equipment) ? booking.equipment[0] : booking.equipment
  const renter = Array.isArray(booking.renter) ? booking.renter[0] : booking.renter

  // Cek owner
  if (!eq || eq.owner_id !== user.id) {
    redirect('/unauthorized')
  }

  // Cek status: harus active atau late
  if (!['active', 'late'].includes(booking.status)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card variant="standard" padding="lg" className="text-center max-w-2xl mx-auto">
          <div className="text-6xl mb-3">⚠️</div>
          <h1 className="text-h2 text-fg-dark font-bold mb-2">
            Tidak Bisa Konfirmasi Pengembalian
          </h1>
          <p className="text-body text-fg/60 mb-4">
            Booking ini berstatus <strong>"{booking.status}"</strong>.
            Konfirmasi pengembalian hanya bisa dilakukan untuk booking yang <strong>Aktif</strong> atau <strong>Terlambat</strong>.
          </p>
          <Link
            href="/penyedia/booking"
            className="inline-block bg-primary text-white px-6 py-3 rounded-btn font-semibold min-h-[48px]"
          >
            ← Kembali ke Booking
          </Link>
        </Card>
      </div>
    )
  }

  const depositAmount = Number(eq.deposit_amount ?? 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/penyedia/booking"
          className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center min-h-0"
          aria-label="Kembali"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-fg-dark leading-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', ui-sans-serif",
              fontSize: 'clamp(22px, 4.5vw, 32px)',
              fontWeight: 800,
            }}
          >
            Konfirmasi Pengembalian 📸
          </h1>
          <p className="text-caption text-fg/60 truncate">
            Booking #{bookingId.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </header>

      {/* Info Booking Summary */}
      <div className="max-w-3xl space-y-4 mb-6">
        <Card variant="standard" padding="lg" className="border-l-4 !border-l-blue-500">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-h4 font-bold text-fg-dark">
                🚜 {eq.name}
              </h2>
              <Badge variant={booking.status === 'late' ? 'error' : 'success'} size="sm" className="mt-1">
                {booking.status === 'late' ? '⚠️ Terlambat' : '✅ Aktif'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-4">
            <div>
              <p className="text-caption text-fg/60">Penyewa</p>
              <p className="font-semibold text-fg-dark">{renter?.full_name ?? '-'}</p>
              <p className="text-caption text-fg/60">📱 {renter?.phone ?? '-'}</p>
            </div>
            <div>
              <p className="text-caption text-fg/60">Mulai</p>
              <p className="font-semibold text-fg-dark">
                {formatDateID(booking.start_date)}
              </p>
            </div>
            <div>
              <p className="text-caption text-fg/60">Selesai</p>
              <p className="font-semibold text-fg-dark">
                {formatDateID(booking.end_date)}
              </p>
            </div>
            <div>
              <p className="text-caption text-fg/60">Durasi</p>
              <p className="font-bold text-fg-dark">{booking.total_days} hari</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-caption text-fg/60">Total Sewa: </span>
              <span className="font-bold text-primary-dark">
                {formatRupiah(booking.total_price - depositAmount)}
              </span>
            </div>
            <div>
              <span className="text-caption text-fg/60">Deposit Ditahan: </span>
              <span className="font-bold text-amber">
                {formatRupiah(depositAmount)}
              </span>
            </div>
          </div>
        </Card>

        {/* Foto Sebelum Sewa (kalau ada) */}
        {booking.photo_before_url && (
          <Card variant="standard" padding="md">
            <p className="text-caption text-fg/60 font-semibold mb-2">
              📸 Foto Kondisi Sebelum Sewa (Referensi)
            </p>
            <img
              src={booking.photo_before_url}
              alt="Kondisi sebelum"
              className="w-full max-w-sm rounded-btn border border-border"
            />
          </Card>
        )}
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <ReturnForm
          bookingId={bookingId}
          equipmentName={eq.name}
          depositAmount={depositAmount}
          userId={user.id}
        />
      </div>
    </div>
  )
}
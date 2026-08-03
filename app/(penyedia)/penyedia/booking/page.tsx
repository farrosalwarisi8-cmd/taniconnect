import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRupiah, formatDateID, getDisplayName, getEntityLabel } from '@/lib/utils'
import { BookingActions } from './_components/BookingActions'
import type { Tables } from '@/lib/supabase/client'

export const metadata = {
  title: 'Booking Masuk',
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral' }
> = {
  pending:   { label: '⏳ Menunggu Konfirmasi', variant: 'warning' },
  active:    { label: '✅ Aktif', variant: 'success' },
  completed: { label: '✓ Selesai', variant: 'info' },
  cancelled: { label: '✗ Dibatalkan', variant: 'error' },
  late:      { label: '⚠️ Terlambat', variant: 'error' },
}

export default async function BookingMasukPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/penyedia/booking')

  // Ambil semua booking yg terkait alat milik user (via join)
  // Query: rental_bookings JOIN equipment WHERE equipment.owner_id = user.id
  const { data: ownedEquipment } = await supabase
    .from('equipment')
    .select('id')
    .eq('owner_id', user.id)

  const equipmentIds = (ownedEquipment ?? []).map((e: any) => e.id)

  let bookings: any[] = []
  if (equipmentIds.length > 0) {
    const { data: bookingsData } = await supabase
      .from('rental_bookings')
      .select(`
        id, equipment_id, renter_id, start_date, end_date, total_days,
        total_price, deposit_status, status, created_at,
        equipment:equipment ( name, image_paths ),
        renter:profiles!rental_bookings_renter_id_fkey ( full_name, phone, city )
      `)
      .in('equipment_id', equipmentIds)
      .order('created_at', { ascending: false })

    bookings = bookingsData ?? []
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length
  const activeCount = bookings.filter((b) => b.status === 'active').length
  const completedCount = bookings.filter((b) => b.status === 'completed').length
  const totalRevenue = bookings
    .filter((b) => b.status === 'active' || b.status === 'completed')
    .reduce((s, b) => s + Number(b.total_price ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24">
      <header className="mb-6">
        <h1
          className="text-fg-dark leading-tight"
          style={{
            fontFamily: "'Bricolage Grotesque', ui-sans-serif",
            fontSize: 'clamp(24px, 5vw, 40px)',
            fontWeight: 800,
          }}
        >
          Booking Masuk 📥
        </h1>
        <p className="text-caption text-fg/60">
          Kelola booking sewa alat/bahan yang masuk dari petani
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card variant="standard" padding="md" className="border-l-4 !border-l-amber">
          <p className="text-caption text-fg/60">⏳ Menunggu</p>
          <p
            className="text-amber font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {pendingCount}
          </p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
          <p className="text-caption text-fg/60">Aktif</p>
          <p
            className="text-success font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {activeCount}
          </p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-blue-500">
          <p className="text-caption text-fg/60">Selesai</p>
          <p
            className="text-blue-600 font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {completedCount}
          </p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-primary">
          <p className="text-caption text-fg/60">💰 Total Revenue</p>
          <p
            className="text-primary-dark font-extrabold text-xl leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            {formatRupiah(totalRevenue)}
          </p>
        </Card>
      </div>

      {/* Empty state */}
      {bookings.length === 0 && (
        <Card variant="standard" padding="lg" className="text-center">
          <div className="text-6xl mb-3">📥</div>
          <h2 className="text-h4 text-fg-dark font-bold mb-2">
            Belum ada booking masuk
          </h2>
          <p className="text-body text-fg/60 mb-4 max-w-md mx-auto">
            Petani akan booking alat/bahan kamu di sini. Pastikan alatmu
            terdaftar dan tersedia di marketplace.
          </p>
          <Link href="/penyedia/alat">
            <Button variant="secondary">Kelola Alat →</Button>
          </Link>
        </Card>
      )}

      {/* List booking */}
      {bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const eq = Array.isArray(booking.equipment) ? booking.equipment[0] : booking.equipment
            const renter = Array.isArray(booking.renter) ? booking.renter[0] : booking.renter
            const statusInfo = STATUS_LABELS[booking.status] ?? {
              label: booking.status,
              variant: 'neutral' as const,
            }

            return (
              <Card
                key={booking.id}
                variant="standard"
                padding="md"
                className={
                  booking.status === 'pending'
                    ? 'border-l-4 !border-l-amber bg-amber/5'
                    : ''
                }
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                      <div>
                        <h3 className="font-bold text-fg-dark text-lg">
                          🚜 {getDisplayName(eq?.name, 'Alat tidak ditemukan')}
                        </h3>
                        <p className="text-caption text-fg/60">
                          Booking #{booking.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} size="md">
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Renter info */}
                    <div className="p-3 bg-white rounded-btn border border-border mb-3">
                      <p className="text-caption text-fg/60 mb-1">👤 Penyewa</p>
                      <p className="font-semibold text-fg-dark">
                        {getDisplayName(renter?.full_name, 'Anonim')}
                      </p>
                      <p className="text-caption text-fg/60">
                        📱 {getEntityLabel(renter?.phone, '-')} · 📍 {getEntityLabel(renter?.city, '-')}
                      </p>
                    </div>

                    {/* Booking details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
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
                        <p className="font-bold text-fg-dark">
                          {booking.total_days} hari
                        </p>
                      </div>
                      <div>
                        <p className="text-caption text-fg/60">Total</p>
                        <p className="font-bold text-primary-dark">
                          {formatRupiah(booking.total_price)}
                        </p>
                      </div>
                    </div>

                    <BookingActions
                      bookingId={booking.id}
                      currentStatus={booking.status}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
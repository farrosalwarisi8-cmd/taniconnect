'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatRupiah, formatDateID } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  pricePerDay: number
  deposit:     number
  equipmentId: string
}

function CalendarFlow({ pricePerDay, deposit, equipmentId }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate]     = useState<Date | null>(null)
  const [loading, setLoading]     = useState(false)

  // Generate 30 hari ke depan
  const days = useMemo(() => {
    const arr: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [])

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return diff + 1
  }, [startDate, endDate])

  const totalRent = totalDays * pricePerDay
  const grandTotal = totalRent + deposit

  const handleDateClick = (date: Date) => {
    // Logic: klik pertama = start, klik kedua = end
    if (!startDate || (startDate && endDate)) {
      setStartDate(date)
      setEndDate(null)
    } else if (date >= startDate) {
      setEndDate(date)
    } else {
      setStartDate(date)
      setEndDate(null)
    }
  }

  const isInRange = (date: Date): boolean => {
    if (!startDate) return false
    if (!endDate) return date.getTime() === startDate.getTime()
    return date >= startDate && date <= endDate
  }

  const isStart = (date: Date) =>
    startDate && date.getTime() === startDate.getTime()

  const isEnd = (date: Date) =>
    endDate && date.getTime() === endDate.getTime()

  const handleBooking = async () => {
    if (!startDate || !endDate) {
      toast('Pilih tanggal mulai dan selesai sewa', 'warning')
      return
    }

    setLoading(true)
    try {
      // TODO: Implementasi API booking (Fase 2 lanjutan)
      // Untuk sekarang, mock behavior
      await new Promise(r => setTimeout(r, 800))
      toast(`Booking berhasil untuk ${totalDays} hari!`, 'success')

      // Redirect ke halaman pesanan setelah 1 detik
      setTimeout(() => {
        router.push('/pembeli/pesanan')
      }, 1000)
    } catch (err: any) {
      toast(err.message ?? 'Gagal booking', 'error')
    } finally {
      setLoading(false)
    }
  }

  const monthName = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(days[0])

  return (
    <div className="space-y-6">
      {/* Header bulan */}
      <div className="text-center">
        <p className="text-caption text-fg/60 mb-1">Bulan</p>
        <p className="text-h4 font-bold text-fg-dark">{monthName}</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-caption text-fg/70">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 bg-primary rounded-full" /> Dipilih
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 bg-surface-light border border-border rounded-full" /> Tersedia
        </span>
      </div>

      {/* Grid tanggal (7 kolom seperti kalender) */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
          <div key={i} className="text-caption font-bold text-fg/60 py-2">
            {d}
          </div>
        ))}

        {/* Padding awal supaya sejajar hari dalam seminggu */}
        {Array.from({ length: days[0].getDay() }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((date, i) => {
          const inRange = isInRange(date)
          const isS = isStart(date)
          const isE = isEnd(date)

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDateClick(date)}
              className={cn(
                'aspect-square rounded-full text-sm font-medium transition-all min-h-0 flex items-center justify-center',
                inRange
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-light text-fg-dark hover:bg-primary-light',
                (isS || isE) && 'ring-2 ring-primary-dark',
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* Summary */}
      {startDate && endDate && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex justify-between text-caption">
            <span className="text-fg/60">Tanggal Mulai</span>
            <span className="font-semibold">{formatDateID(startDate, 'short')}</span>
          </div>
          <div className="flex justify-between text-caption">
            <span className="text-fg/60">Tanggal Selesai</span>
            <span className="font-semibold">{formatDateID(endDate, 'short')}</span>
          </div>
          <div className="flex justify-between text-caption">
            <span className="text-fg/60">Durasi Sewa</span>
            <Badge variant="info" size="sm">{totalDays} hari</Badge>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-body">
              <span className="text-fg/70">Total Sewa</span>
              <span className="font-semibold">{formatRupiah(totalRent)}</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-fg/70">Deposit (dikembalikan)</span>
              <span className="font-semibold text-amber">{formatRupiah(deposit)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-border pt-2">
              <span className="text-h4 text-fg-dark">Total Bayar</span>
              <span className="text-h2 text-primary-dark font-bold">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        onClick={handleBooking}
        fullWidth
        size="lg"
        disabled={!startDate || !endDate}
        loading={loading}
      >
        {!startDate || !endDate
          ? 'Pilih tanggal dulu'
          : `Pesan Sekarang · ${formatRupiah(grandTotal)}`}
      </Button>

      <p className="text-caption text-fg/60 text-center">
        🔒 Deposit ditahan selama sewa dan dikembalikan penuh setelah alat dicek kondisi baik.
      </p>
    </div>
  )
}

export function RentalCalendar(props: Props) {
  return (
    <ToastProvider>
      <CalendarFlow {...props} />
    </ToastProvider>
  )
}
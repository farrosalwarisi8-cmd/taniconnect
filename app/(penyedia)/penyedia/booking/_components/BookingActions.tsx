'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'

interface Props {
  bookingId: string
  currentStatus: string
}

function Actions({ bookingId, currentStatus }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const updateStatus = async (newStatus: string, reason?: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rental-bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal ubah status')

      const messages: Record<string, string> = {
        active: '✅ Booking dikonfirmasi! Petani sudah bisa gunakan alat.',
        cancelled: '❌ Booking ditolak',
        completed: '✓ Booking selesai',
        late: '⚠️ Booking ditandai terlambat',
      }

      toast(messages[newStatus] ?? 'Status diperbarui', 'success')
      setShowRejectModal(false)
      router.refresh()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        {/* ─── STATUS: PENDING ────────────────────────────────── */}
        {currentStatus === 'pending' && (
          <>
            <Button
              size="sm"
              onClick={() => updateStatus('active')}
              loading={loading}
              className="!bg-success !text-white hover:!bg-success/90"
            >
              ✓ Konfirmasi Booking
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowRejectModal(true)}
              className="!border-error !text-error hover:!bg-error/10"
            >
              ✗ Tolak
            </Button>
          </>
        )}

        {/* ─── STATUS: ACTIVE (Alat sedang dipakai) ────────────── */}
        {currentStatus === 'active' && (
          <>
            {/* ⭐ Link ke halaman konfirmasi pengembalian (Tahap 6) */}
            <Link href={`/penyedia/booking/${bookingId}/return`}>
              <Button
                size="sm"
                className="!bg-gradient-to-r !from-primary !to-primary-dark"
              >
                📸 Konfirmasi Pengembalian
              </Button>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => updateStatus('late')}
              loading={loading}
              className="!border-amber !text-amber hover:!bg-amber/10"
            >
              ⚠️ Tandai Terlambat
            </Button>
          </>
        )}

        {/* ─── STATUS: LATE (Terlambat balik) ──────────────────── */}
        {currentStatus === 'late' && (
          <Link href={`/penyedia/booking/${bookingId}/return`}>
            <Button
              size="sm"
              className="!bg-gradient-to-r !from-amber !to-amber/80"
            >
              📸 Konfirmasi Pengembalian (Terlambat)
            </Button>
          </Link>
        )}

        {/* ─── STATUS: SELESAI / BATAL ────────────────────────── */}
        {(currentStatus === 'completed' || currentStatus === 'cancelled') && (
          <p className="text-caption text-fg/60 italic">
            Booking sudah {currentStatus === 'completed' ? 'selesai' : 'dibatalkan'}.
          </p>
        )}
      </div>

      {/* Modal Reject */}
      <Modal
        open={showRejectModal}
        onClose={() => !loading && setShowRejectModal(false)}
        title="✗ Tolak Booking?"
      >
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/30 rounded-btn">
            <p className="text-body text-fg-dark">
              Booking akan dibatalkan dan petani akan diberi tahu.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-fg-dark mb-2 block">
              Alasan penolakan (opsional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Alat sedang maintenance..."
              rows={3}
              className="w-full bg-white border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-primary resize-y"
              maxLength={500}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowRejectModal(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={() => updateStatus('cancelled', rejectReason.trim() || undefined)}
              loading={loading}
              className="!bg-error !text-white hover:!bg-error/90"
            >
              ✗ Ya, Tolak
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export function BookingActions(props: Props) {
  return (
    <ToastProvider>
      <Actions {...props} />
    </ToastProvider>
  )
}
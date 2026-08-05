'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDateID } from '@/lib/utils'

export type TrackingStatus = 'diproses' | 'diambil' | 'dalam_perjalanan' | 'terkirim'

export interface TrackingLog {
  id: string
  transaction_id: string
  status: TrackingStatus
  location_notes: string
  created_at: string
  updater?: {
    full_name?: string
  } | null
}

interface Props {
  transactionId: string
  isSeller?: boolean
  toast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

const STEPS: Array<{ key: TrackingStatus; label: string; icon: string; desc: string }> = [
  { key: 'diproses', label: 'Diproses', icon: '📦', desc: 'Pesanan disiapkan oleh penjual' },
  { key: 'diambil', label: 'Diambil', icon: '🚜', desc: 'Kurir/penjual mengambil paket' },
  { key: 'dalam_perjalanan', label: 'Dalam Perjalanan', icon: '🚚', desc: 'Paket dalam pengiriman ke alamat' },
  { key: 'terkirim', label: 'Terkirim', icon: '✅', desc: 'Paket telah sampai di tujuan' },
]

export function ShipmentTracker({ transactionId, isSeller = false, toast }: Props) {
  const [logs, setLogs] = useState<TrackingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newStatus, setNewStatus] = useState<TrackingStatus>('dalam_perjalanan')
  const [locationNotes, setLocationNotes] = useState('')

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/tracking`)
      if (!res.ok) return
      const body = await res.json()
      setLogs(body.data ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => {
    fetchTracking()
  }, [fetchTracking])

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null
  const currentStatusIndex = latestLog
    ? STEPS.findIndex(s => s.key === latestLog.status)
    : 0

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationNotes.trim() || locationNotes.trim().length < 3) {
      toast?.('Catatan lokasi minimal 3 karakter', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          location_notes: locationNotes.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal memperbarui tracking')
      }

      toast?.('Status pengiriman berhasil diperbarui!', 'success')
      setLocationNotes('')
      fetchTracking()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui tracking'
      toast?.(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse space-y-4">
        <div className="h-5 bg-gray-200 rounded w-48" />
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <h3 className="font-bold text-gray-900 text-base">Tracking Real-Time Pengiriman</h3>
        </div>
        {latestLog && (
          <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full">
            ● Status: {STEPS.find(s => s.key === latestLog.status)?.label ?? latestLog.status}
          </span>
        )}
      </div>

      {/* Step progress timeline */}
      <div className="relative flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentStatusIndex
          const isCurrent = idx === currentStatusIndex

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative z-10 text-center px-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all shadow-sm',
                  isCurrent
                    ? 'bg-green-600 text-white ring-4 ring-green-100 scale-110'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-400',
                )}
              >
                {step.icon}
              </div>
              <p className={cn('text-xs font-semibold mt-2', isDone ? 'text-gray-900' : 'text-gray-400')}>
                {step.label}
              </p>
              <p className="text-[10px] text-gray-400 hidden sm:block mt-0.5 max-w-[100px]">
                {step.desc}
              </p>
            </div>
          )
        })}

        {/* Progress connecting line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(currentStatusIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Tracking logs history timeline */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Riwayat Perjalanan Paket
        </h4>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Belum ada update pengiriman dari penjual.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">
                    {log.location_notes}
                  </p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    {formatDateID(log.created_at, 'full')} • {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seller update form */}
      {isSeller && (
        <form onSubmit={handleAddUpdate} className="border-t border-gray-100 pt-4 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            ➕ Update Status Pengiriman Baru (Khusus Penjual)
          </h4>
          <div className="grid sm:grid-cols-3 gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as TrackingStatus)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 font-medium focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {STEPS.map(s => (
                <option key={s.key} value={s.key}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="Posisi/catatan lokasi (misal: Paket berangkat dari Kebun Cisarua)"
              className="sm:col-span-2 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 min-h-0 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memperbarui...</span>
              </>
            ) : (
              '📍 Kirim Update Lokasi'
            )}
          </button>
        </form>
      )}
    </div>
  )
}

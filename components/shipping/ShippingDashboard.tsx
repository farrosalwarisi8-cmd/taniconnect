'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShippingServiceCard } from './ShippingServiceCard'
import { ShippingServiceForm } from './ShippingServiceForm'
import { ToastProvider, useToast } from '@/components/ui/Toast'

interface ShippingServiceData {
  id: string
  service_name: string
  description: string | null
  price_per_km: number
  minimum_cost: number
  estimated_delivery: string
  is_active: boolean
  max_coverage_km?: number
  created_at: string
}

function ShippingDashboardInner() {
  const supabase = createClient()
  const { toast } = useToast()

  const [services, setServices] = useState<ShippingServiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<ShippingServiceData | null>(null)
  
  // Confirmation Modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('shipping_services')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[ShippingDashboard] Fetch error:', error)
        toast('Gagal memuat layanan pengiriman', 'error')
        return
      }

      setServices((data as ShippingServiceData[]) ?? [])
    } catch {
      toast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleEdit = (service: ShippingServiceData) => {
    setEditData(service)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditData(null)
    setFormOpen(true)
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/shipping-services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal mengubah status')
      }

      toast(isActive ? 'Layanan berhasil diaktifkan' : 'Layanan berhasil dinonaktifkan', 'success')
      fetchServices()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status'
      toast(msg, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const executeDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeletingId(id)

    try {
      const res = await fetch(`/api/shipping-services/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal menghapus layanan')
      }

      toast('Layanan pengiriman berhasil dihapus', 'success')
      fetchServices()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus layanan'
      toast(msg, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="bg-gray-50 rounded-xl p-3">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const serviceToDelete = services.find(s => s.id === confirmDeleteId)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Layanan Pengiriman Mandiri</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Atur sistem pengiriman internal untuk produk Anda sendiri
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all min-h-0"
        >
          <span className="text-lg">➕</span>
          Tambah Layanan
        </button>
      </div>

      {/* Empty state */}
      {services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-6xl mb-4 animate-float">🚚</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Belum Ada Layanan Pengiriman
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Buat layanan pengiriman internal agar pembeli dapat melakukan pemesanan produk Anda.
            Tentukan tarif per KM dan biaya minimum secara mandiri.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all"
          >
            🚚 Buat Layanan Pertama
          </button>
        </div>
      ) : (
        /* Service list */
        <div className="grid gap-4 md:grid-cols-2">
          {services.map(service => (
            <ShippingServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleConfirmDelete}
              isDeleting={deletingId === service.id}
              isToggling={togglingId === service.id}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <ShippingServiceForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditData(null) }}
        onSuccess={fetchServices}
        editData={editData}
        toast={toast}
      />

      {/* Confirmation Modal before delete */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  🗑️
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Hapus Layanan Pengiriman?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Apakah Anda yakin ingin menghapus layanan{' '}
                  <span className="font-bold text-gray-800">
                    &quot;{serviceToDelete?.service_name}&quot;
                  </span>
                  ? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors min-h-0"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={executeDelete}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors min-h-0 shadow-sm"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export function ShippingDashboard() {
  return (
    <ToastProvider>
      <ShippingDashboardInner />
    </ToastProvider>
  )
}

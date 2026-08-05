'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface FormData {
  service_name: string
  description: string
  price_per_km: string
  minimum_cost: string
  estimated_delivery: string
  max_coverage_km: string
}

interface ShippingServiceData {
  id: string
  service_name: string
  description: string | null
  price_per_km: number
  minimum_cost: number
  estimated_delivery: string
  is_active: boolean
  max_coverage_km?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: ShippingServiceData | null
  toast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

const INITIAL_FORM: FormData = {
  service_name: '',
  description: '',
  price_per_km: '',
  minimum_cost: '',
  estimated_delivery: '1-2 hari',
  max_coverage_km: '50',
}

export function ShippingServiceForm({ isOpen, onClose, onSuccess, editData, toast }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const isEdit = !!editData

  useEffect(() => {
    if (editData) {
      setForm({
        service_name: editData.service_name,
        description: editData.description ?? '',
        price_per_km: String(editData.price_per_km),
        minimum_cost: String(editData.minimum_cost),
        estimated_delivery: editData.estimated_delivery,
        max_coverage_km: String(editData.max_coverage_km ?? 50),
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setErrors({})
  }, [editData, isOpen])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!form.service_name.trim() || form.service_name.trim().length < 3) {
      newErrors.service_name = 'Nama layanan minimal 3 karakter'
    }
    const pricePerKm = Number(form.price_per_km)
    if (!form.price_per_km || isNaN(pricePerKm) || pricePerKm <= 0) {
      newErrors.price_per_km = 'Harga per KM harus lebih dari 0'
    }
    const minCost = Number(form.minimum_cost)
    if (form.minimum_cost === '' || isNaN(minCost) || minCost < 0) {
      newErrors.minimum_cost = 'Biaya minimum tidak boleh negatif'
    }
    if (!form.estimated_delivery.trim()) {
      newErrors.estimated_delivery = 'Estimasi pengiriman wajib diisi'
    }
    const maxCov = Number(form.max_coverage_km)
    if (!form.max_coverage_km || isNaN(maxCov) || maxCov <= 0) {
      newErrors.max_coverage_km = 'Jangkauan harus > 0 KM'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        service_name: form.service_name.trim(),
        description: form.description.trim() || undefined,
        price_per_km: Number(form.price_per_km),
        minimum_cost: Number(form.minimum_cost),
        estimated_delivery: form.estimated_delivery.trim(),
        max_coverage_km: Number(form.max_coverage_km),
      }

      const url = isEdit
        ? `/api/shipping-services/${editData!.id}`
        : '/api/shipping-services'

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Gagal menyimpan layanan')
      }

      toast(
        isEdit ? 'Layanan berhasil diperbarui' : 'Layanan baru berhasil dibuat',
        'success',
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan'
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-5 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                  🚚
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {isEdit ? 'Edit Layanan Pengiriman' : 'Tambah Layanan Pengiriman'}
                  </h2>
                  <p className="text-white/70 text-xs">
                    {isEdit ? 'Perbarui detail layanan' : 'Buat layanan pengiriman baru'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors min-h-0"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Service name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                🏷️ Nama Layanan
              </label>
              <input
                type="text"
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                placeholder="contoh: Pengiriman Petani Mandiri"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20',
                  errors.service_name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-green-400',
                )}
              />
              {errors.service_name && (
                <p className="text-xs text-red-500 mt-1">{errors.service_name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                📝 Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Keterangan singkat tentang layanan pengiriman Anda"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors resize-none"
              />
            </div>

            {/* Price per KM & Minimum cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  💰 Harga per KM
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Rp</span>
                  <input
                    type="number"
                    value={form.price_per_km}
                    onChange={(e) => setForm({ ...form, price_per_km: e.target.value })}
                    placeholder="2500"
                    min="0"
                    step="100"
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20',
                      errors.price_per_km ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-green-400',
                    )}
                  />
                </div>
                {errors.price_per_km && (
                  <p className="text-xs text-red-500 mt-1">{errors.price_per_km}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  📍 Biaya Minimum
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Rp</span>
                  <input
                    type="number"
                    value={form.minimum_cost}
                    onChange={(e) => setForm({ ...form, minimum_cost: e.target.value })}
                    placeholder="15000"
                    min="0"
                    step="500"
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20',
                      errors.minimum_cost ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-green-400',
                    )}
                  />
                </div>
                {errors.minimum_cost && (
                  <p className="text-xs text-red-500 mt-1">{errors.minimum_cost}</p>
                )}
              </div>
            </div>

            {/* Estimated delivery & Max coverage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ⏱️ Estimasi Pengiriman
                </label>
                <input
                  type="text"
                  value={form.estimated_delivery}
                  onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })}
                  placeholder="contoh: 1-2 hari"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20',
                    errors.estimated_delivery ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-green-400',
                  )}
                />
                {errors.estimated_delivery && (
                  <p className="text-xs text-red-500 mt-1">{errors.estimated_delivery}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  🗺️ Jangkauan Maks (KM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.max_coverage_km}
                    onChange={(e) => setForm({ ...form, max_coverage_km: e.target.value })}
                    placeholder="50"
                    min="1"
                    className={cn(
                      'w-full pr-12 pl-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20',
                      errors.max_coverage_km ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-green-400',
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">KM</span>
                </div>
                {errors.max_coverage_km && (
                  <p className="text-xs text-red-500 mt-1">{errors.max_coverage_km}</p>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <p className="text-xs text-blue-700 leading-relaxed">
                💡 <b>Contoh perhitungan ongkir:</b> Jika harga Rp2.500/KM dan jarak 8 KM,
                maka ongkir = 8 × Rp2.500 = Rp20.000. Jika hasilnya kurang dari biaya minimum,
                maka biaya minimum yang digunakan.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors min-h-0"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50 min-h-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>{isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Layanan'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

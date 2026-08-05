'use client'

import { cn } from '@/lib/utils'

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

interface Props {
  service: ShippingServiceData
  onEdit: (service: ShippingServiceData) => void
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
  isToggling?: boolean
}

export function ShippingServiceCard({ service, onEdit, onToggle, onDelete, isDeleting, isToggling }: Props) {
  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n)

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md',
        service.is_active ? 'border-gray-100' : 'border-gray-200 opacity-75',
      )}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm',
            service.is_active
              ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
              : 'bg-gray-100 text-gray-400',
          )}>
            🚚
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 truncate">
              {service.service_name}
            </h3>
            {service.description && (
              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{service.description}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={cn(
          'shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border',
          service.is_active
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-50 text-gray-500 border-gray-200',
        )}>
          {service.is_active ? '● Aktif' : '○ Nonaktif'}
        </span>
      </div>

      {/* Info grid */}
      <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-blue-50/60 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-blue-500 text-xs">💰</span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Harga/KM</span>
          </div>
          <p className="text-[14px] font-bold text-blue-800">
            Rp {formatRupiah(service.price_per_km)}
          </p>
        </div>

        <div className="bg-amber-50/60 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-amber-500 text-xs">📍</span>
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Minimum</span>
          </div>
          <p className="text-[14px] font-bold text-amber-800">
            Rp {formatRupiah(service.minimum_cost)}
          </p>
        </div>

        <div className="bg-purple-50/60 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-purple-500 text-xs">⏱️</span>
            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Estimasi</span>
          </div>
          <p className="text-[13px] font-bold text-purple-800 truncate">
            {service.estimated_delivery}
          </p>
        </div>

        <div className="bg-emerald-50/60 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-emerald-500 text-xs">🗺️</span>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Jangkauan</span>
          </div>
          <p className="text-[14px] font-bold text-emerald-800">
            Maks {service.max_coverage_km ?? 50} KM
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(service)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors min-h-0"
        >
          ✏️ Edit
        </button>

        <button
          type="button"
          onClick={() => onToggle(service.id, !service.is_active)}
          disabled={isToggling}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors min-h-0',
            service.is_active
              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
              : 'text-green-600 bg-green-50 hover:bg-green-100',
          )}
        >
          {isToggling ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : service.is_active ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
        </button>

        <button
          type="button"
          onClick={() => onDelete(service.id)}
          disabled={isDeleting}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors min-h-0"
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : '🗑️'}
        </button>
      </div>
    </div>
  )
}

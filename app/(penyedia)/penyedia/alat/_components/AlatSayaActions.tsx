'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'

interface Props {
  equipmentId: string
  equipmentName: string
  isAvailable: boolean
}

function Actions({ equipmentId, equipmentName, isAvailable }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggleAvailability = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !isAvailable }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal ubah status')
      }

      toast(
        isAvailable
          ? '⏸️ Alat dinonaktifkan (sembunyi dari marketplace)'
          : '✅ Alat diaktifkan (muncul di marketplace)',
        'success'
      )
      router.refresh()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal hapus alat')
      }

      toast('🗑️ Alat berhasil dihapus', 'success')
      setShowDeleteModal(false)
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
        <Link href={`/pembeli/alat/${equipmentId}`}>
          <Button size="sm" variant="secondary">
            👁️ Lihat
          </Button>
        </Link>
        <Link href={`/penyedia/alat/${equipmentId}/edit`}>
          <Button size="sm" variant="secondary">
            ✏️ Edit
          </Button>
        </Link>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleToggleAvailability}
          loading={loading}
        >
          {isAvailable ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowDeleteModal(true)}
          className="!border-error !text-error hover:!bg-error/10"
        >
          🗑️ Hapus
        </Button>
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => !loading && setShowDeleteModal(false)}
        title="🗑️ Hapus Alat?"
      >
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/30 rounded-btn">
            <p className="text-body text-fg-dark">Kamu akan menghapus alat:</p>
            <p className="text-h4 font-bold text-fg-dark mt-1">"{equipmentName}"</p>
          </div>

          <div className="text-sm text-fg/70 space-y-1">
            <p>⚠️ Aksi ini tidak bisa dibatalkan.</p>
            <p>💡 Kalau ada booking aktif, hapus tidak akan bisa dilakukan.</p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              loading={loading}
              className="!bg-error !text-white hover:!bg-error/90 !border-error"
            >
              🗑️ Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export function AlatSayaActions(props: Props) {
  return (
    <ToastProvider>
      <Actions {...props} />
    </ToastProvider>
  )
}
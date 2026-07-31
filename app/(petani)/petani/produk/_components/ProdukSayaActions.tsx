'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'

interface Props {
  productId: string
  productName: string
  currentStatus: string
}

function Actions({ productId, productName, currentStatus }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const isActive = currentStatus === 'active'

  const handleToggleStatus = async () => {
    setLoading(true)
    try {
      const newStatus = isActive ? 'draft' : 'active'
      const res = await fetch(`/api/product/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal ubah status')
      }

      toast(
        isActive
          ? '⏸️ Produk dinonaktifkan (sembunyi dari marketplace)'
          : '✅ Produk diaktifkan (muncul di marketplace)',
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
      const res = await fetch(`/api/product/${productId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal hapus produk')
      }

      if (data.action === 'archived') {
        toast(
          '📦 Produk diarsipkan (ada transaksi terkait, tidak bisa dihapus permanen)',
          'info',
          6000
        )
      } else {
        toast('🗑️ Produk berhasil dihapus', 'success')
      }

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
        <Link href={`/pembeli/produk/${productId}`}>
          <Button size="sm" variant="secondary">
            👁️ Lihat
          </Button>
        </Link>
        <Link href={`/petani/produk/${productId}/edit`}>
          <Button size="sm" variant="secondary">
            ✏️ Edit
          </Button>
        </Link>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleToggleStatus}
          loading={loading}
        >
          {isActive ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
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
        title="🗑️ Hapus Produk?"
      >
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/30 rounded-btn">
            <p className="text-body text-fg-dark">
              Kamu akan menghapus produk:
            </p>
            <p className="text-h4 font-bold text-fg-dark mt-1">
              "{productName}"
            </p>
          </div>

          <div className="text-sm text-fg/70 space-y-1">
            <p>⚠️ Aksi ini tidak bisa dibatalkan.</p>
            <p>💡 Kalau ada transaksi terkait, produk akan diarsipkan (bukan dihapus permanen).</p>
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

export function ProdukSayaActions(props: Props) {
  return (
    <ToastProvider>
      <Actions {...props} />
    </ToastProvider>
  )
}
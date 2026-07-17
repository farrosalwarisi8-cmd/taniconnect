'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'

function ConfirmButton({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/confirm-received`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal konfirmasi')
      }
      toast('Terima kasih! Dana sudah diteruskan ke penjual.', 'success', 5000)
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        ✅ Konfirmasi Diterima
      </Button>

      <Modal
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Konfirmasi Barang Diterima?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading} fullWidth>
              Batal
            </Button>
            <Button onClick={handleConfirm} loading={loading} fullWidth>
              Ya, Sudah Diterima
            </Button>
          </>
        }
      >
        <p>
          Dengan konfirmasi, dana akan <strong>diteruskan ke penjual</strong> dan transaksi selesai.
        </p>
        <p className="text-caption text-fg/60 mt-3">
          Jika ada masalah dengan barang, jangan konfirmasi — laporkan ke Pusat Dispute.
        </p>
      </Modal>
    </>
  )
}

export function ConfirmReceivedButton(props: { transactionId: string }) {
  return (
    <ToastProvider>
      <ConfirmButton {...props} />
    </ToastProvider>
  )
}
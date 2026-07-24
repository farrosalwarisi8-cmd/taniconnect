'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatDateID } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/client'

interface Props {
  users: Array<Tables<'profiles'>>
}

function KYCList({ users }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [selectedUser, setSelectedUser] = useState<Tables<'profiles'> | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const openApprovalModal = (user: Tables<'profiles'>, act: 'approve' | 'reject') => {
    setSelectedUser(user)
    setAction(act)
    setRejectionReason('')
  }

  const closeModal = () => {
    setSelectedUser(null)
    setAction(null)
    setRejectionReason('')
  }

  const handleConfirm = async () => {
    if (!selectedUser || !action) return

    setLoading(true)
    try {
      if (action === 'approve') {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_verified: true,
            kyc_reviewed_at: new Date().toISOString(),
          })
          .eq('id', selectedUser.id)

        if (error) throw error

        toast(`✓ ${selectedUser.full_name} berhasil diverifikasi!`, 'success')
      } else {
        // Reject — reset kyc_submitted_at supaya user bisa submit ulang
        const { error } = await supabase
          .from('profiles')
          .update({
            is_verified: false,
            kyc_reviewed_at: new Date().toISOString(),
            kyc_submitted_at: null,
          })
          .eq('id', selectedUser.id)

        if (error) throw error

        toast(`✗ Verifikasi ${selectedUser.full_name} ditolak. User bisa submit ulang.`, 'info')
      }

      closeModal()
      router.refresh()
    } catch (err: any) {
      toast(`Gagal: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (date: string | null) => {
    if (!date) return '-'
    const diff = Date.now() - new Date(date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Baru saja'
    if (hours < 24) return `${hours} jam lalu`
    const days = Math.floor(hours / 24)
    return `${days} hari lalu`
  }

  return (
    <>
      <div className="space-y-3">
        {users.map(user => (
          <div
            key={user.id}
            className="border border-border rounded-card p-4 hover:border-primary transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Avatar + Info */}
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {user.full_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-fg-dark">{user.full_name}</p>
                    <Badge variant="warning" size="sm">
                      ⏳ {getTimeAgo(user.kyc_submitted_at)}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {user.role === 'petani' ? '🌾 Petani' : 
                       user.role === 'pembeli' ? '🛒 Pembeli' : 
                       user.role === 'penyedia_alat' ? '🚜 Penyedia' : user.role}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-caption text-fg/70">
                    <p>📱 {user.phone}</p>
                    <p>✉️ {user.email ?? '-'}</p>
                    <p>📍 {user.address ?? '-'}, {user.district ?? '-'}, {user.city ?? '-'}, {user.province ?? '-'}</p>
                    {user.kyc_submitted_at && (
                      <p className="text-fg/50">
                        🕐 Submit: {formatDateID(user.kyc_submitted_at, 'full')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* KTP Preview + Actions */}
              <div className="flex flex-col gap-2 items-stretch sm:items-end shrink-0">
                <div className="w-full sm:w-48 h-32 bg-surface rounded-btn border border-border flex items-center justify-center relative overflow-hidden">
                  {user.ktp_storage_path ? (
                    <div className="text-center px-4">
                      <div className="text-3xl mb-1">🪪</div>
                      <p className="text-caption text-fg/60 font-medium">Foto KTP tersimpan</p>
                      <p className="text-[10px] text-fg/50 mt-1 break-all">{user.ktp_storage_path.slice(0, 30)}...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl mb-1 opacity-40">📷</div>
                      <p className="text-caption text-fg/40">Tidak ada foto</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-48">
                  <Button
                    size="sm"
                    variant="secondary"
                    fullWidth
                    onClick={() => openApprovalModal(user, 'reject')}
                    className="!border-error !text-error hover:!bg-error/10"
                  >
                    ✗ Tolak
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    fullWidth
                    onClick={() => openApprovalModal(user, 'approve')}
                  >
                    ✓ Setujui
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={!!selectedUser && !!action}
        onClose={closeModal}
        title={
          action === 'approve'
            ? '✓ Setujui Verifikasi KYC?'
            : '✗ Tolak Verifikasi KYC?'
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 bg-surface rounded-btn">
              <p className="font-semibold text-fg-dark">{selectedUser.full_name}</p>
              <p className="text-caption text-fg/60">{selectedUser.phone}</p>
              <p className="text-caption text-fg/60">
                📍 {selectedUser.city}, {selectedUser.province}
              </p>
            </div>

            {action === 'approve' ? (
              <div className="p-4 bg-success/10 border border-success/30 rounded-btn">
                <p className="text-body text-fg-dark">
                  ✅ User akan langsung mendapat status <strong>Terverifikasi</strong> dan bisa mulai transaksi di platform.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-error/10 border border-error/30 rounded-btn">
                  <p className="text-body text-fg-dark">
                    ⚠️ Verifikasi akan ditolak. User perlu submit ulang dokumen KYC.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-fg mb-2 block">
                    Alasan penolakan (opsional):
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Foto KTP buram, alamat tidak sesuai, dll"
                    rows={3}
                    className="w-full bg-white border border-border rounded-btn px-3 py-2 text-sm resize-y"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={closeModal} disabled={loading}>
                Batal
              </Button>
              <Button
                variant={action === 'approve' ? 'primary' : 'secondary'}
                onClick={handleConfirm}
                loading={loading}
                className={action === 'reject' ? '!bg-error !text-white' : ''}
              >
                {action === 'approve' ? '✓ Ya, Setujui' : '✗ Ya, Tolak'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

export function KYCVerificationList(props: Props) {
  return (
    <ToastProvider>
      <KYCList {...props} />
    </ToastProvider>
  )
}
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDateID, getDisplayName, getInitials } from '@/lib/utils'
import { KYCVerificationList } from './_components/KYCVerificationList'
import type { Tables } from '@/lib/supabase/client'

export default async function VerifikasiKYCPage() {
  const supabase = await createServerSupabaseClient()

  // Ambil semua user yang submit KYC tapi belum diverifikasi
  const { data: pendingData } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, role, province, city, district, address, ktp_storage_path, kyc_submitted_at, created_at')
    .not('kyc_submitted_at', 'is', null)
    .eq('is_verified', false)
    .order('kyc_submitted_at', { ascending: true })

  const { data: verifiedData } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, province, city, kyc_reviewed_at')
    .eq('is_verified', true)
    .not('kyc_reviewed_at', 'is', null)
    .order('kyc_reviewed_at', { ascending: false })
    .limit(10)

  const pending = (pendingData ?? []) as Array<Tables<'profiles'>>
  const verified = (verifiedData ?? []) as Array<Tables<'profiles'>>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-fg-dark leading-tight"
          style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800 }}
        >
          Verifikasi KYC
        </h1>
        <p className="text-caption text-fg/60 mt-1">
          Tinjau & setujui pendaftaran pengguna baru
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card variant="standard" padding="md" className="border-l-4 !border-l-error">
          <p className="text-caption text-fg/60 mb-1">⏳ Menunggu</p>
          <p
            className="text-error font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {pending.length}
          </p>
          <p className="text-caption text-fg/60 mt-1">Perlu tinjauan</p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
          <p className="text-caption text-fg/60 mb-1">✓ Terverifikasi</p>
          <p
            className="text-success font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {verified.length}
          </p>
          <p className="text-caption text-fg/60 mt-1">10 terbaru</p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-primary col-span-2 sm:col-span-1">
          <p className="text-caption text-fg/60 mb-1">📊 Tingkat Approval</p>
          <p
            className="text-primary-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {verified.length + pending.length > 0
              ? Math.round((verified.length / (verified.length + pending.length)) * 100)
              : 0}%
          </p>
          <p className="text-caption text-fg/60 mt-1">Approval rate</p>
        </Card>
      </div>

      {/* Antrian KYC */}
      <Card variant="standard" padding="lg">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-h4 text-fg-dark font-bold">🪪 Antrian Verifikasi</h2>
          <Badge variant="warning" size="md">
            {pending.length} menunggu
          </Badge>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-3">✅</div>
            <p className="text-h4 text-fg-dark font-bold">Semua sudah diverifikasi!</p>
            <p className="text-body text-fg/60 mt-2">
              Tidak ada pengguna yang menunggu verifikasi saat ini.
            </p>
          </div>
        ) : (
          <KYCVerificationList users={pending} />
        )}
      </Card>

      {/* Recently verified */}
      {verified.length > 0 && (
        <Card variant="standard" padding="lg">
          <h2 className="text-h4 text-fg-dark font-bold mb-4">✅ Baru Diverifikasi</h2>
          <div className="space-y-2">
            {verified.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-success/5 rounded-btn"
              >
                <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center font-bold shrink-0">
                  {getInitials(user.full_name, 'U')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-dark truncate">
                    {getDisplayName(user.full_name, 'User')}
                  </p>
                  <p className="text-caption text-fg/60">
                    📍 {user.city ?? '-'}, {user.province ?? '-'} · {user.role}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="success" size="sm">✓ Terverifikasi</Badge>
                  {user.kyc_reviewed_at && (
                    <p className="text-caption text-fg/60 mt-1">
                      {formatDateID(user.kyc_reviewed_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
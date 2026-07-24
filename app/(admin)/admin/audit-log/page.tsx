import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDateID } from '@/lib/utils'

const ACTION_ICONS: Record<string, string> = {
  'transaction.created':       '💰',
  'transaction.paid':          '✅',
  'transaction.cancelled':     '❌',
  'escrow.released':           '🔓',
  'kyc.approved':              '✓',
  'kyc.rejected':              '✗',
  'user.registered':           '👤',
  'user.role_changed':         '🔄',
  'product.created':           '📦',
  'payment.webhook_processed': '💳',
  'admin.action':              '🔐',
}

const ACTION_LABELS: Record<string, string> = {
  'transaction.created':       'Transaksi dibuat',
  'transaction.paid':          'Pembayaran diterima',
  'transaction.cancelled':     'Transaksi dibatalkan',
  'escrow.released':           'Escrow dicairkan',
  'kyc.approved':              'KYC disetujui',
  'kyc.rejected':              'KYC ditolak',
  'user.registered':           'User baru mendaftar',
  'user.role_changed':         'Role user diubah',
  'product.created':           'Produk baru',
  'payment.webhook_processed': 'Webhook diproses',
  'admin.action':              'Aksi admin',
}

export default async function AuditLogPage() {
  const supabase = await createServerSupabaseClient()

  const { data: logsData } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const logs = logsData ?? []

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-fg-dark leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800 }}
          >
            Audit Log
          </h1>
          <p className="text-caption text-fg/60 mt-1">
            Riwayat semua aksi sensitif di platform
          </p>
        </div>
        <Badge variant="verified" size="md">
          {logs.length} entry (100 terbaru)
        </Badge>
      </div>

      {/* Log Table */}
      <Card variant="standard" padding="none">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-3">📜</div>
            <p className="text-h4 font-bold text-fg-dark">Belum ada aktivitas</p>
            <p className="text-body text-fg/60 mt-2">
              Log akan muncul setelah ada transaksi atau aksi sensitif di platform.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log: any) => {
              const icon = ACTION_ICONS[log.action] ?? '📝'
              const label = ACTION_LABELS[log.action] ?? log.action
              return (
                <div key={log.id} className="p-4 hover:bg-surface transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-fg-dark">{label}</p>
                        <Badge variant="neutral" size="sm">{log.resource_type}</Badge>
                        {log.actor_role && (
                          <Badge variant="info" size="sm">{log.actor_role}</Badge>
                        )}
                      </div>
                      <p className="text-caption text-fg/60">
                        {log.notes ?? `${log.action} pada resource ${log.resource_id?.slice(0, 8) ?? '-'}`}
                      </p>
                      {log.actor_id && (
                        <p className="text-[10px] text-fg/50 mt-1 font-mono">
                          Actor: {log.actor_id.slice(0, 12)}... · IP: {log.ip_address ?? '-'}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-caption text-fg/60">
                        {formatDateID(log.created_at, 'short')}
                      </p>
                      <p className="text-[10px] text-fg/50 font-mono">
                        {new Date(log.created_at).toLocaleTimeString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
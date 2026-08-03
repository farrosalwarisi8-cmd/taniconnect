import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { formatRupiah, formatDateID, getDisplayName, getEntityLabel } from '@/lib/utils'
import { IndonesiaHeatmap } from '../_components/IndonesiaHeatmap'

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()

  // Ambil statistik utama
  const [
    { count: totalUsers },
    { count: totalPetani },
    { count: totalPembeli },
    { count: pendingKYC },
    { count: totalProducts },
    { count: totalTransactions },
    { data: recentTx },
    { data: regionalData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'petani'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pembeli'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false)
      .not('kyc_submitted_at', 'is', null),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase
      .from('transactions')
      .select('id, created_at, total_amount, status')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('province, city')
      .not('province', 'is', null),
  ])

  // Hitung distribusi per provinsi
  const distributionMap = new Map<string, number>()
  ;(regionalData ?? []).forEach((p: any) => {
    if (p.province) {
      distributionMap.set(p.province, (distributionMap.get(p.province) ?? 0) + 1)
    }
  })

  const regionStats = Array.from(distributionMap.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1
            className="text-fg-dark leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800 }}
          >
            Admin Dashboard
          </h1>
          <p className="text-caption text-fg/60 mt-1">
            {formatDateID(new Date(), 'full')} · Data real-time TaniConnect
          </p>
        </div>
        <Badge variant="verified" size="md">🟢 Sistem Aktif</Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card variant="standard" padding="md" className="border-l-4 !border-l-primary">
          <p className="text-caption text-fg/60 mb-1">👥 Total Pengguna</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalUsers?.toLocaleString('id-ID') ?? 0}
          </p>
          <p className="text-caption text-primary-dark mt-1">
            {totalPetani ?? 0} petani · {totalPembeli ?? 0} pembeli
          </p>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-error">
          <p className="text-caption text-fg/60 mb-1">🪪 Menunggu KYC</p>
          <p
            className="text-error font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {pendingKYC ?? 0}
          </p>
          <Link href="/admin/verifikasi" className="text-caption text-primary-dark font-semibold hover:underline min-h-0">
            Tinjau sekarang →
          </Link>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
          <p className="text-caption text-fg/60 mb-1">📦 Produk Aktif</p>
          <p
            className="text-success font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalProducts ?? 0}
          </p>
          <p className="text-caption text-fg/60 mt-1">Di marketplace</p>
        </Card>

        <Card variant="standard" padding="md" className="border-l-4 !border-l-teal">
          <p className="text-caption text-fg/60 mb-1">💰 Total Transaksi</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalTransactions ?? 0}
          </p>
          <p className="text-caption text-fg/60 mt-1">Sepanjang waktu</p>
        </Card>
      </div>

      {/* Peta Distribusi */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="text-h2 text-fg-dark font-bold">🗺️ Peta Distribusi Pengguna</h2>
            <p className="text-caption text-fg/60">
              Sebaran petani & pembeli di seluruh Indonesia
            </p>
          </div>
          <Badge variant="verified" size="sm">
            {regionStats.length} provinsi aktif
          </Badge>
        </div>

        <IndonesiaHeatmap regions={regionStats} />
      </Card>

      {/* Grid: Top Regions + Recent Transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Regions */}
        <Card variant="standard" padding="lg">
          <h3 className="text-h4 text-fg-dark font-bold mb-4">🏆 Top 10 Provinsi</h3>
          {regionStats.length === 0 ? (
            <p className="text-body text-fg/60">Belum ada data wilayah.</p>
          ) : (
            <div className="space-y-2">
              {regionStats.slice(0, 10).map((r, i) => {
                const maxCount = regionStats[0]?.count || 1
                const percent = (r.count / maxCount) * 100
                return (
                  <div key={r.province}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-fg-dark font-medium">
                        {i + 1}. 📍 {getDisplayName(r.province, 'Wilayah tidak diketahui')}
                      </span>
                      <span className="text-primary-dark font-bold">{r.count} user</span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card variant="standard" padding="lg">
          <h3 className="text-h4 text-fg-dark font-bold mb-4">💸 Transaksi Terbaru</h3>
          {!recentTx || recentTx.length === 0 ? (
            <p className="text-body text-fg/60">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 p-3 bg-surface rounded-btn">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg-dark font-semibold truncate">
                      #{tx.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-caption text-fg/60">
                      {formatDateID(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary-dark">
                      {formatRupiah(tx.total_amount)}
                    </p>
                    <Badge variant={
                      tx.status === 'completed' ? 'success' :
                      tx.status === 'cancelled' ? 'error' :
                      'info'
                    } size="sm">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-primary to-primary-dark text-white">
        <h3 className="text-h2 text-white font-bold mb-2">🚀 Aksi Cepat</h3>
        <p className="text-white/80 mb-4">Kelola platform TaniConnect dengan mudah</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link
            href="/admin/verifikasi"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-4 rounded-btn text-white transition-colors min-h-0"
          >
            <div className="text-2xl mb-2">🪪</div>
            <p className="font-semibold">Verifikasi KYC</p>
            <p className="text-caption text-white/80">{pendingKYC ?? 0} menunggu</p>
          </Link>
          <Link
            href="/admin/wilayah"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-4 rounded-btn text-white transition-colors min-h-0"
          >
            <div className="text-2xl mb-2">🗺️</div>
            <p className="font-semibold">Data Wilayah</p>
            <p className="text-caption text-white/80">Distribusi pangan</p>
          </Link>
          <Link
            href="/admin/audit-log"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-4 rounded-btn text-white transition-colors min-h-0"
          >
            <div className="text-2xl mb-2">📜</div>
            <p className="font-semibold">Audit Log</p>
            <p className="text-caption text-white/80">Track aktivitas</p>
          </Link>
        </div>
      </Card>
    </div>
  )
}
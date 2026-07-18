import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID } from '@/lib/utils'
import { AddRecordButton } from './_components/AddRecordButton'
import type { Tables } from '@/lib/supabase/client'

const CATEGORY_ICONS: Record<string, string> = {
  bibit:        '🌱',
  pupuk:        '💊',
  pestisida:    '🧪',
  tenaga_kerja: '👷',
  sewa_lahan:   '🏞️',
  lainnya:      '📝',
  penjualan:    '💰',
}

export default async function KeuanganPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()

  const { data: recordsData } = await supabase
    .from('financial_records')
    .select('*')
    .eq('farmer_id', user.id)
    .eq('season_year', currentYear)
    .order('recorded_at', { ascending: false })
    .limit(50)

  const records = (recordsData ?? []) as Array<Tables<'financial_records'>>

  const totalIncome  = records.filter(r => r.record_type === 'income').reduce((s, r) => s + Number(r.total_amount), 0)
  const totalExpense = records.filter(r => r.record_type === 'expense').reduce((s, r) => s + Number(r.total_amount), 0)
  const profit       = totalIncome - totalExpense
  const marginPct    = totalExpense > 0 ? ((profit / totalExpense) * 100).toFixed(1) : '—'

  return (
    <main className="min-h-screen bg-surface-light pb-32">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/petani/dashboard"
            className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center min-h-0"
            aria-label="Kembali"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1
              className="text-fg-dark leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800 }}
            >
              Keuangan Usaha Tani
            </h1>
            <p className="text-caption text-fg/60">Musim Tanam · Tahun {currentYear}</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card variant="elevated" padding="lg" className="!bg-gradient-to-br from-green-50 to-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-caption text-fg/60 mb-1">Total Modal</p>
              <p className="text-[32px] font-extrabold text-fg-dark leading-none" style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}>
                {formatRupiah(totalExpense)}
              </p>
              <p className="text-caption text-fg/60 mt-1">
                {records.filter(r => r.record_type === 'expense').length} pengeluaran
              </p>
            </div>
            <div>
              <p className="text-caption text-fg/60 mb-1">Total Pendapatan</p>
              <p className="text-[32px] font-extrabold text-primary-dark leading-none" style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}>
                {formatRupiah(totalIncome)}
              </p>
              <p className="text-caption text-fg/60 mt-1">
                {records.filter(r => r.record_type === 'income').length} transaksi
              </p>
            </div>
            <div>
              <p className="text-caption text-fg/60 mb-1">Keuntungan</p>
              <p className={`text-[32px] font-extrabold leading-none ${profit >= 0 ? 'text-success' : 'text-error'}`} style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}>
                {formatRupiah(profit)}
              </p>
              <div className="mt-1">
                <Badge variant={profit >= 0 ? 'success' : 'error'} size="sm">
                  {profit >= 0 ? '💹 Untung' : '📉 Rugi'} · Margin {marginPct}%
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-h2 text-fg-dark">Catatan Keuangan</h2>
          <AddRecordButton />
        </div>

        {records.length > 0 ? (
          <div className="bg-white rounded-DEFAULT border border-border overflow-hidden">
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-surface-light transition-colors">
                <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-xl shrink-0">
                  {CATEGORY_ICONS[r.category] ?? '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg-dark truncate">{r.item_name}</p>
                  <p className="text-caption text-fg/60">
                    {formatDateID(r.recorded_at)} · {r.quantity} {r.unit}
                    {r.transaction_id && ' · Auto dari marketplace'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${r.record_type === 'income' ? 'text-primary-dark' : 'text-error'}`}>
                    {r.record_type === 'income' ? '+' : '−'} {formatRupiah(Number(r.total_amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card variant="subtle" padding="lg" className="text-center border-dashed">
            <p className="text-body text-fg/60 mb-3">Belum ada catatan keuangan musim ini.</p>
            <AddRecordButton label="Catat Modal Pertama" />
          </Card>
        )}
      </div>
    </main>
  )
}
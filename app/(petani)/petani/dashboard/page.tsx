import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID } from '@/lib/utils'
import type { Tables } from '@/lib/supabase/client'

export default async function PetaniDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, is_verified, city')
    .eq('id', user.id)
    .single()

  const profile = profileData as Pick<Tables<'profiles'>, 'full_name' | 'is_verified' | 'city'> | null

  const currentYear = new Date().getFullYear()
  const { data: recordsData } = await supabase
    .from('financial_records')
    .select('record_type, total_amount')
    .eq('farmer_id', user.id)
    .eq('season_year', currentYear)

  const records = (recordsData ?? []) as Array<Pick<Tables<'financial_records'>, 'record_type' | 'total_amount'>>

  const totalIncome  = records.filter(r => r.record_type === 'income').reduce((s, r) => s + Number(r.total_amount), 0)
  const totalExpense = records.filter(r => r.record_type === 'expense').reduce((s, r) => s + Number(r.total_amount), 0)
  const profit       = totalIncome - totalExpense

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  })()

  return (
    <main className="min-h-screen bg-surface-light pb-24">
      <div className="gradient-dashboard px-4 sm:px-6 pt-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0">
              <p className="text-white/80 text-caption mb-1">{greeting}, 👋</p>
              <h1
                className="text-white leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 800 }}
              >
                {profile?.full_name ?? 'Petani'}
              </h1>
              <p className="text-white/80 text-caption mt-1">
                {formatDateID(new Date(), 'full')}
              </p>
            </div>
            {profile?.is_verified ? (
              <Badge variant="verified" size="md">✓ Terverifikasi</Badge>
            ) : (
              <Badge variant="warning" size="md">⏳ KYC menunggu</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card variant="subtle" padding="md">
            <p className="text-caption text-fg/60 mb-1">💰 Pendapatan</p>
            <p className="text-h2 text-primary-dark font-bold">{formatRupiah(totalIncome)}</p>
          </Card>
          <Card variant="subtle" padding="md">
            <p className="text-caption text-fg/60 mb-1">📦 Modal</p>
            <p className="text-h2 text-fg-dark font-bold">{formatRupiah(totalExpense)}</p>
          </Card>
          <Card variant="subtle" padding="md" className="col-span-2 sm:col-span-1">
            <p className="text-caption text-fg/60 mb-1">📈 Keuntungan</p>
            <p className={`text-h2 font-bold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
              {formatRupiah(profit)}
            </p>
          </Card>
        </div>

        <div>
          <h2 className="text-h2 text-fg-dark mb-3">Akses Cepat</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/petani/produk/baru">
              <Card variant="elevated" hover className="!bg-primary text-white min-h-0" padding="md">
                <div className="text-3xl mb-2">🌾</div>
                <p className="font-semibold">Jual Hasil Panen</p>
              </Card>
            </Link>
            <Link href="/petani/keuangan">
              <Card variant="standard" hover padding="md">
                <div className="text-3xl mb-2">📊</div>
                <p className="font-semibold">Keuangan</p>
              </Card>
            </Link>
            <Link href="/pembeli/marketplace">
              <Card variant="standard" hover padding="md">
                <div className="text-3xl mb-2">🛒</div>
                <p className="font-semibold">Marketplace</p>
              </Card>
            </Link>
            <Link href="/petani/pesanan">
              <Card variant="standard" hover padding="md">
                <div className="text-3xl mb-2">📦</div>
                <p className="font-semibold">Pesanan Masuk</p>
              </Card>
            </Link>
          </div>
        </div>

        {records.length === 0 && (
          <Card variant="elevated" className="text-center" padding="lg">
            <div className="text-5xl mb-3">🌱</div>
            <h3 className="text-h2 text-fg-dark mb-2">Siap panen?</h3>
            <p className="text-body text-fg/70 mb-4">
              Mulai catat modal & pendapatan agar dashboard bisa memberi insight untukmu.
            </p>
            <Link
              href="/petani/keuangan"
              className="inline-block bg-primary text-white font-medium rounded-sm px-6 py-3 min-h-[48px]"
            >
              Catat Modal Pertama
            </Link>
          </Card>
        )}
      </div>
    </main>
  )
}
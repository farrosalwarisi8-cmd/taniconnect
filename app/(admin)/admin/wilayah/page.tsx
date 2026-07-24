import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/utils'
import { IndonesiaHeatmap } from '../_components/IndonesiaHeatmap'

export default async function DataWilayahPage() {
  const supabase = await createServerSupabaseClient()

  // Aggregate data
  const [
    { data: profileData },
    { data: productData },
    { data: transactionData },
  ] = await Promise.all([
    supabase.from('profiles').select('province, role').not('province', 'is', null),
    supabase.from('products').select('province, price_per_unit, stock_quantity').eq('status', 'active').not('province', 'is', null),
    supabase.from('transactions').select('total_amount, buyer_id, created_at, product_id'),
  ])

  // Distribusi pengguna per provinsi
  const userMap = new Map<string, { total: number; petani: number; pembeli: number }>()
  ;(profileData ?? []).forEach((p: any) => {
    if (!p.province) return
    const curr = userMap.get(p.province) ?? { total: 0, petani: 0, pembeli: 0 }
    curr.total++
    if (p.role === 'petani') curr.petani++
    else if (p.role === 'pembeli') curr.pembeli++
    userMap.set(p.province, curr)
  })

  const distributionMap = new Map<string, number>()
  userMap.forEach((v, k) => distributionMap.set(k, v.total))
  const regionStats = Array.from(distributionMap.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count)

  // Produk per provinsi
  const productByRegion = new Map<string, { count: number; totalStock: number; avgPrice: number; sumPrice: number }>()
  ;(productData ?? []).forEach((p: any) => {
    if (!p.province) return
    const curr = productByRegion.get(p.province) ?? { count: 0, totalStock: 0, avgPrice: 0, sumPrice: 0 }
    curr.count++
    curr.totalStock += Number(p.stock_quantity ?? 0)
    curr.sumPrice += Number(p.price_per_unit ?? 0)
    curr.avgPrice = curr.sumPrice / curr.count
    productByRegion.set(p.province, curr)
  })

  const productStats = Array.from(productByRegion.entries())
    .map(([province, data]) => ({ province, ...data }))
    .sort((a, b) => b.count - a.count)

  const totalTransactions = transactionData?.length ?? 0
  const totalRevenue = (transactionData ?? []).reduce((s: number, t: any) => s + Number(t.total_amount ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-fg-dark leading-tight"
          style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 800 }}
        >
          Data Distribusi Wilayah
        </h1>
        <p className="text-caption text-fg/60 mt-1">
          Statistik aktivitas platform per provinsi Indonesia
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card variant="standard" padding="md">
          <p className="text-caption text-fg/60 mb-1">🗺️ Provinsi Aktif</p>
          <p
            className="text-primary-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {regionStats.length}
          </p>
          <p className="text-caption text-fg/60 mt-1">Dari 38 provinsi</p>
        </Card>
        <Card variant="standard" padding="md">
          <p className="text-caption text-fg/60 mb-1">📦 Total Produk</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {productData?.length ?? 0}
          </p>
        </Card>
        <Card variant="standard" padding="md">
          <p className="text-caption text-fg/60 mb-1">💰 Total Transaksi</p>
          <p
            className="text-success font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 32 }}
          >
            {totalTransactions}
          </p>
        </Card>
        <Card variant="standard" padding="md">
          <p className="text-caption text-fg/60 mb-1">💸 Total Revenue</p>
          <p
            className="text-primary-dark font-extrabold text-2xl leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            {formatRupiah(totalRevenue)}
          </p>
        </Card>
      </div>

      {/* Peta */}
      <Card variant="elevated" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">🗺️ Peta Distribusi Pengguna</h2>
        <IndonesiaHeatmap regions={regionStats} />
      </Card>

      {/* Detail Tabel per Provinsi */}
      <Card variant="standard" padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-h4 text-fg-dark font-bold">📋 Detail per Provinsi</h2>
          <p className="text-caption text-fg/60 mt-1">
            Data lengkap distribusi pengguna & produk
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-fg-dark">Provinsi</th>
                <th className="px-4 py-3 text-right font-semibold text-fg-dark">Total User</th>
                <th className="px-4 py-3 text-right font-semibold text-fg-dark">Petani</th>
                <th className="px-4 py-3 text-right font-semibold text-fg-dark">Pembeli</th>
                <th className="px-4 py-3 text-right font-semibold text-fg-dark">Produk</th>
                <th className="px-4 py-3 text-right font-semibold text-fg-dark">Stok</th>
                <th className="px-4 py-3 text-right font-semibold text-fg-dark">Avg Harga</th>
              </tr>
            </thead>
            <tbody>
              {regionStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-fg/60">
                    Belum ada data wilayah
                  </td>
                </tr>
              ) : (
                regionStats.map((r, i) => {
                  const userData = userMap.get(r.province) ?? { total: 0, petani: 0, pembeli: 0 }
                  const prodData = productByRegion.get(r.province) ?? { count: 0, totalStock: 0, avgPrice: 0 }
                  return (
                    <tr
                      key={r.province}
                      className="border-b border-border last:border-b-0 hover:bg-surface"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-caption text-fg/50 font-mono">
                            #{i + 1}
                          </span>
                          <span className="font-semibold text-fg-dark">
                            📍 {r.province}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="verified" size="sm">{userData.total}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-fg-dark">{userData.petani}</td>
                      <td className="px-4 py-3 text-right text-fg-dark">{userData.pembeli}</td>
                      <td className="px-4 py-3 text-right text-fg-dark">{prodData.count}</td>
                      <td className="px-4 py-3 text-right text-fg-dark">
                        {prodData.totalStock.toFixed(0)} kg
                      </td>
                      <td className="px-4 py-3 text-right text-primary-dark font-semibold">
                        {prodData.avgPrice > 0 ? formatRupiah(Math.round(prodData.avgPrice)) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Products per Region */}
      {productStats.length > 0 && (
        <Card variant="standard" padding="lg">
          <h2 className="text-h4 text-fg-dark font-bold mb-4">🏆 Provinsi Produsen Terbanyak</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {productStats.slice(0, 6).map((p, i) => (
              <div
                key={p.province}
                className="p-4 bg-surface rounded-btn border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-caption text-fg/50 font-mono">#{i + 1}</span>
                  <Badge variant="info" size="sm">{p.count} produk</Badge>
                </div>
                <p className="font-bold text-fg-dark mb-1">📍 {p.province}</p>
                <p className="text-caption text-fg/60">
                  Total stok: <strong className="text-fg-dark">{p.totalStock.toFixed(0)} kg</strong>
                </p>
                <p className="text-caption text-fg/60">
                  Harga rata-rata: <strong className="text-primary-dark">{formatRupiah(Math.round(p.avgPrice))}</strong>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
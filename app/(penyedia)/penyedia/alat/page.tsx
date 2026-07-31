import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah, formatDateID } from '@/lib/utils'
import { AlatSayaActions } from './_components/AlatSayaActions'
import type { Tables } from '@/lib/supabase/client'

export const metadata = {
  title: 'Alat Saya',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function getImageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/equipment-images/${path}`
}

const CATEGORY_LABELS: Record<string, string> = {
  traktor:     '🚜 Traktor',
  mesin_panen: '🌾 Mesin Panen',
  pompa_air:   '💧 Pompa Air',
  drone:       '🚁 Drone',
  pupuk:       '💊 Pupuk',
  bibit:       '🌱 Bibit',
  pestisida:   '🧪 Pestisida',
  lainnya:     '📦 Lainnya',
}

export default async function AlatSayaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/penyedia/alat')

  // Ambil semua alat milik user
  const { data: equipmentData } = await supabase
    .from('equipment')
    .select(
      'id, name, category, price_rent, price_sell, deposit_amount, stock, is_available, image_paths, city, province, created_at'
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const equipment = (equipmentData ?? []) as Array<
    Pick<
      Tables<'equipment'>,
      | 'id'
      | 'name'
      | 'category'
      | 'price_rent'
      | 'price_sell'
      | 'deposit_amount'
      | 'stock'
      | 'is_available'
      | 'image_paths'
      | 'city'
      | 'province'
      | 'created_at'
    >
  >

  // Statistik
  const totalCount = equipment.length
  const activeCount = equipment.filter((e) => e.is_available).length
  const inactiveCount = equipment.filter((e) => !e.is_available).length
  const totalStock = equipment.reduce((s, e) => s + Number(e.stock ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1
            className="text-fg-dark leading-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', ui-sans-serif",
              fontSize: 'clamp(24px, 5vw, 40px)',
              fontWeight: 800,
            }}
          >
            Alat Saya 🚜
          </h1>
          <p className="text-caption text-fg/60">
            Kelola semua alat/bahan yang kamu daftarkan
          </p>
        </div>
        <Link href="/penyedia/alat/baru">
          <Button
            size="md"
            className="!bg-gradient-to-r !from-blue-500 !to-cyan-600 hover:!from-blue-600 hover:!to-cyan-700"
          >
            + Tambah Alat
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card variant="standard" padding="md" className="border-l-4 !border-l-blue-500">
          <p className="text-caption text-fg/60">Total Alat</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {totalCount}
          </p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-success">
          <p className="text-caption text-fg/60">Tersedia</p>
          <p
            className="text-success font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {activeCount}
          </p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-fg/30">
          <p className="text-caption text-fg/60">Nonaktif</p>
          <p
            className="text-fg font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {inactiveCount}
          </p>
        </Card>
        <Card variant="standard" padding="md" className="border-l-4 !border-l-amber">
          <p className="text-caption text-fg/60">Total Stok Unit</p>
          <p
            className="text-fg-dark font-extrabold"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif", fontSize: 28 }}
          >
            {totalStock}
          </p>
        </Card>
      </div>

      {/* Empty State */}
      {equipment.length === 0 && (
        <Card variant="standard" padding="lg" className="text-center">
          <div className="text-6xl mb-3">🚜</div>
          <h2 className="text-h4 text-fg-dark font-bold mb-2">
            Belum ada alat terdaftar
          </h2>
          <p className="text-body text-fg/60 mb-6 max-w-md mx-auto">
            Mulai daftarkan alat/bahan tani pertama kamu untuk mulai
            menerima booking dari petani di seluruh Indonesia.
          </p>
          <Link href="/penyedia/alat/baru">
            <Button
              size="lg"
              className="!bg-gradient-to-r !from-blue-500 !to-cyan-600"
            >
              + Daftarkan Alat Pertama
            </Button>
          </Link>
        </Card>
      )}

      {/* Product List */}
      {equipment.length > 0 && (
        <div className="space-y-3">
          {equipment.map((item) => {
            const firstImage = item.image_paths?.[0]
            const imageUrl = firstImage ? getImageUrl(firstImage) : null

            return (
              <Card
                key={item.id}
                variant="standard"
                padding="none"
                className="overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* Image */}
                  <div className="w-full sm:w-32 h-32 rounded-btn bg-surface overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-blue-50">
                        🚜
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-fg-dark text-lg leading-tight">
                          {item.name}
                        </h3>
                        <p className="text-caption text-fg/60 mt-1">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                          {' · '}
                          📍 {item.city ?? '-'}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge
                          variant={item.is_available ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {item.is_available ? '✓ Tersedia' : '⏸️ Nonaktif'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-sm">
                      {item.price_rent && (
                        <div>
                          <p className="text-caption text-fg/60">Sewa/hari</p>
                          <p className="font-bold text-blue-600">
                            {formatRupiah(Number(item.price_rent))}
                          </p>
                        </div>
                      )}
                      {item.price_sell && (
                        <div>
                          <p className="text-caption text-fg/60">Harga Jual</p>
                          <p className="font-bold text-success">
                            {formatRupiah(Number(item.price_sell))}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-caption text-fg/60">Stok</p>
                        <p className="font-bold text-fg-dark">
                          {item.stock ?? 0} unit
                        </p>
                      </div>
                      <div>
                        <p className="text-caption text-fg/60">Dibuat</p>
                        <p className="text-sm text-fg">
                          {formatDateID(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <AlatSayaActions
                      equipmentId={item.id}
                      equipmentName={item.name}
                      isAvailable={item.is_available}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
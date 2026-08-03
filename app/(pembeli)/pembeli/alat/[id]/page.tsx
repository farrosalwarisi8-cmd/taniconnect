import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/utils'
import { RentalCalendar } from './_components/RentalCalendar'

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: item, error } = await supabase
    .from('equipment')
    .select('*, owner:profiles(full_name, is_verified)')
    .eq('id', id)
    .maybeSingle()

  if (error || !item) notFound()

  return (
    <main className="min-h-screen bg-white pb-32">
       {/* Hero & Info (Mirip Detail Produk) */}
       <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <h1 className="text-display-sm text-fg-dark">{item.name}</h1>
          <Badge variant="info">{item.category}</Badge>
          
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-surface-light p-6 rounded-DEFAULT border border-border">
                <p className="text-caption text-fg/60">Harga Sewa</p>
                <p className="text-h2 text-primary-dark font-bold">{formatRupiah(item.price_rent)} / hari</p>
                <p className="text-caption text-error mt-2">🛡️ Deposit: {formatRupiah(item.deposit_amount)}</p>
              </div>
              <p className="text-body text-fg">{item.description}</p>
            </div>

            {/* Kalender Booking */}
            <div className="bg-white border border-border rounded-DEFAULT p-6 shadow-md">
              <h3 className="text-h3 mb-4">Pilih Tanggal Sewa</h3>
              <RentalCalendar 
                pricePerDay={item.price_rent} 
                deposit={item.deposit_amount}
                equipmentId={item.id}
              />
            </div>
          </div>
       </div>
    </main>
  )
}
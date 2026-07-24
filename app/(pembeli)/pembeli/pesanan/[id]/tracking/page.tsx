import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: tx } = await supabase.from('transactions').select('*, product:products(name)').eq('id', id).single()

  const steps = [
    { label: 'Pesanan Diterima', status: 'pending', done: true },
    { label: 'Diproses Petani', status: 'processed', done: tx.status !== 'pending' },
    { label: 'Dalam Pengiriman', status: 'shipped', done: ['shipped', 'delivered', 'completed'].includes(tx.status) },
    { label: 'Sampai Tujuan', status: 'delivered', done: ['delivered', 'completed'].includes(tx.status) },
  ]

  return (
    <main className="min-h-screen bg-white p-6">
      <h1 className="text-h2 mb-6">Lacak Pesanan</h1>
      
      <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 items-start relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
              step.done ? 'bg-primary border-green-100 text-white' : 'bg-white border-border text-fg/40'
            }`}>
              {step.done ? '✓' : i + 1}
            </div>
            <div className="pt-2">
              <p className={`font-bold ${step.done ? 'text-fg-dark' : 'text-fg/40'}`}>{step.label}</p>
              {step.done && <p className="text-caption text-fg/60">Selesai pada {new Date().toLocaleDateString()}</p>}
            </div>
          </div>
        ))}
      </div>
      
      {tx.status === 'shipped' && (
        <div className="mt-12 p-6 bg-blue-50 border border-blue-100 rounded-sm">
          <p className="font-semibold text-blue-800">Nomor Resi: {tx.tracking_number || 'SEDANG_DIPROSES'}</p>
          <p className="text-sm text-blue-600 mt-1">Kurir: {tx.shipping_provider || 'JNE'}</p>
        </div>
      )}
    </main>
  )
}
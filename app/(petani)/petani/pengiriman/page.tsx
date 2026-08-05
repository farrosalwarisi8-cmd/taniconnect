import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShippingDashboard } from '@/components/shipping/ShippingDashboard'

export const dynamic = 'force-dynamic'

export default async function PetaniPengirimanPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/petani/pengiriman')

  // Verifikasi role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .maybeSingle()

  const profileAny = profile as { role: string | null; roles: string[] | null } | null
  const activeRole = profileAny?.role?.trim().toLowerCase()
  const userRoles = (profileAny?.roles ?? []).map((r: string) => r.trim().toLowerCase())

  const hasPetaniAccess =
    activeRole === 'petani' ||
    userRoles.includes('petani') ||
    activeRole === 'admin' ||
    userRoles.includes('admin')

  if (!hasPetaniAccess) redirect('/unauthorized')

  return (
    <main className="min-h-screen bg-[#FAFAF9] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-8 text-6xl opacity-10 select-none">🚚</div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          <div className="flex items-center gap-3 mb-2">
            <a
              href="/petani/dashboard"
              className="text-white/60 hover:text-white/90 text-sm transition-colors"
            >
              ← Dashboard
            </a>
          </div>
          <h1
            className="text-white text-2xl sm:text-3xl leading-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', ui-sans-serif",
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            🚚 Layanan Pengiriman
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Kelola jasa pengiriman untuk produk pertanian Anda
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <ShippingDashboard />
      </div>
    </main>
  )
}

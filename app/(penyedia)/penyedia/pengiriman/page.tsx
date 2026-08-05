import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShippingDashboard } from '@/components/shipping/ShippingDashboard'

export const dynamic = 'force-dynamic'

export default async function PenyediaPengirimanPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/penyedia/pengiriman')

  // Verifikasi role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .maybeSingle()

  const profileAny = profile as { role: string | null; roles: string[] | null } | null
  const activeRole = profileAny?.role?.trim().toLowerCase()
  const userRoles = (profileAny?.roles ?? []).map((r: string) => r.trim().toLowerCase())

  const hasPenyediaAccess =
    activeRole === 'penyedia_alat' ||
    userRoles.includes('penyedia_alat') ||
    activeRole === 'admin' ||
    userRoles.includes('admin')

  if (!hasPenyediaAccess) redirect('/unauthorized')

  return (
    <main className="min-h-screen bg-[#FAFAF9] p-4 sm:p-6 lg:p-8">
      <ShippingDashboard />
    </main>
  )
}

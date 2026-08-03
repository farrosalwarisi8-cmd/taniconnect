import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PenyediaSidebar } from './_components/PenyediaSidebar'

export default async function PenyediaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/penyedia/dashboard')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, roles, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as {
    role: string | null
    roles: string[] | null
    full_name: string
  } | null

  if (profileError || !profile) {
    redirect('/unauthorized')
  }

  // Support multi-role: cek apakah user punya role penyedia_alat di roles array ATAU role aktif
  const userRoles: string[] = profile.roles ?? (profile.role ? [profile.role] : [])
  const hasPenyediaAccess =
    userRoles.includes('penyedia_alat') ||
    profile.role === 'penyedia_alat'

  if (!hasPenyediaAccess) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Sidebar */}
      <PenyediaSidebar providerName={profile.full_name} userRoles={userRoles} />

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  )
}
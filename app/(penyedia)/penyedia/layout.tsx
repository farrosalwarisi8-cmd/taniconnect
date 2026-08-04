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

  // Baca DARI DATABASE — bukan dari JWT/user_metadata yang bisa stale
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, roles, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as {
    role: string | null
    roles: string[] | null
    full_name: string | null
  } | null

  // Jika profil belum ada → arahkan ke pilih peran
  if (!profile) {
    redirect('/pilih-peran')
  }

  const activeRole = profile.role?.trim().toLowerCase()
  const userRoles: string[] =
    profile.roles && profile.roles.length > 0
      ? profile.roles.map(r => r.trim().toLowerCase())
      : activeRole
        ? [activeRole]
        : []

  const hasPenyediaAccess =
    userRoles.includes('penyedia_alat') ||
    activeRole === 'penyedia_alat' ||
    userRoles.includes('admin') ||
    activeRole === 'admin'

  if (!hasPenyediaAccess) {
    redirect('/unauthorized')
  }

  const providerName = profile.full_name ?? 'Penyedia'

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Sidebar */}
      <PenyediaSidebar providerName={providerName} userRoles={userRoles} />

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  )
}
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

  const metaRole = user.user_metadata?.role as string | undefined
  const metaRoles = user.user_metadata?.roles as string[] | undefined
  const metaFullName = user.user_metadata?.full_name as string | undefined

  const activeRole = profile?.role ?? metaRole
  const userRoles: string[] = profile?.roles ?? metaRoles ?? (activeRole ? [activeRole] : [])

  const hasPenyediaAccess =
    userRoles.includes('penyedia_alat') ||
    activeRole === 'penyedia_alat' ||
    userRoles.includes('admin') ||
    activeRole === 'admin'

  if (!hasPenyediaAccess) {
    redirect('/unauthorized')
  }

  const providerName = profile?.full_name ?? metaFullName ?? 'Penyedia'

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
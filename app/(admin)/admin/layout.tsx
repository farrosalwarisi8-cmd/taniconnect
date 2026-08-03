import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AdminSidebar } from './_components/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/admin/dashboard')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, roles, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const profile = profileData as {
    role: string | null
    roles: string[] | null
    full_name: string | null
  } | null

  if (!profile) {
    redirect('/unauthorized')
  }

  // Hanya role 'admin' yang boleh akses panel admin — tidak boleh di-bypass
  const userRoles: string[] = profile.roles ?? (profile.role ? [profile.role] : [])
  const hasAdminAccess =
    userRoles.includes('admin') ||
    profile.role === 'admin'

  if (!hasAdminAccess) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <AdminSidebar adminName={profile.full_name ?? 'Administrator'} userRoles={userRoles} />
      <main className="flex-1 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  )
}
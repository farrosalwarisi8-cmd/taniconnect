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

  // Jika profil belum ada → arahkan ke unauthorized (admin harus sudah punya profil)
  if (!profile) {
    redirect('/unauthorized')
  }

  const activeRole = profile.role?.trim().toLowerCase()
  const userRoles: string[] =
    profile.roles && profile.roles.length > 0
      ? profile.roles.map(r => r.trim().toLowerCase())
      : activeRole
        ? [activeRole]
        : []

  const hasAdminAccess =
    userRoles.includes('admin') ||
    activeRole === 'admin'

  if (!hasAdminAccess) {
    redirect('/unauthorized')
  }

  const adminName = profile.full_name ?? 'Administrator'

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <AdminSidebar adminName={adminName} userRoles={userRoles} />
      <main className="flex-1 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  )
}
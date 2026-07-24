import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/client'
import { AdminSidebar } from './_components/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/admin/dashboard')

  // Cek apakah user adalah admin
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileData as Pick<Tables<'profiles'>, 'role' | 'full_name'> | null

  if (!profile || profile.role !== 'admin') {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Sidebar */}
      <AdminSidebar adminName={profile.full_name} />

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  )
}
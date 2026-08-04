import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRoleManagerWithToast, type UserProfileItem } from './_components/UserRoleManager'

export const dynamic = 'force-dynamic'

export default async function AdminPenggunaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/admin/pengguna')

  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, roles, is_verified, city, province, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ADMIN PENGGUNA FETCH ERROR]', error.message)
  }

  const users = (profilesData ?? []) as UserProfileItem[]

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
            👥
          </div>
          <div>
            <h1
              className="text-h2 font-extrabold text-fg-dark"
              style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
            >
              Kelola Pengguna & Role
            </h1>
            <p className="text-body text-fg/60 text-sm">
              Kelola hak akses, tambah/ubah role pengguna, dan kelola akun pengguna TaniConnect.
            </p>
          </div>
        </div>
      </div>

      <UserRoleManagerWithToast initialUsers={users} />
    </div>
  )
}

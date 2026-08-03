import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PembeliProfileClient } from './_components/PembeliProfileClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profil Saya',
}

export default async function PembeliProfilPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone, email, city, province, address, bio, is_verified, avatar_storage_path, rating_avg, rating_count, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (!profileData) {
    redirect('/login')
  }

  const [
    { count: totalOrders },
    { data: orderData },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', user.id),
    supabase
      .from('transactions')
      .select('total_amount, status')
      .eq('buyer_id', user.id),
    supabase
      .from('transactions')
      .select('id, created_at, total_amount, status, product_id')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const completedSpend = (orderData ?? [])
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + Number(t.total_amount), 0)

  return (
    <PembeliProfileClient
      profile={{
        full_name: profileData.full_name ?? '',
        phone: profileData.phone ?? '',
        email: profileData.email ?? null,
        city: profileData.city ?? null,
        province: profileData.province ?? null,
        address: profileData.address ?? null,
        bio: profileData.bio ?? null,
        is_verified: profileData.is_verified ?? false,
        avatar_storage_path: profileData.avatar_storage_path ?? null,
        created_at: profileData.created_at ?? '',
      }}
      stats={{
        totalOrders: totalOrders ?? 0,
        completedSpend,
        completedOrders: (orderData ?? []).filter((t: any) => t.status === 'completed').length,
      }}
      recentOrders={(recentOrders ?? []) as any}
    />
  )
}

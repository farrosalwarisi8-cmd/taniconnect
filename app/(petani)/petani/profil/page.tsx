import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PetaniProfileClient } from './_components/PetaniProfileClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profil Petani',
}

export default async function PetaniProfilPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Ambil profil lengkap
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, phone, email, city, province, address, bio, is_verified, kyc_submitted_at, avatar_storage_path, rating_avg, rating_count, created_at')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/login')

  const currentYear = new Date().getFullYear()

  // Ambil statistik paralel
  const [
    { count: activeProducts },
    { count: totalProducts },
    { data: incomeData },
    { data: recentProducts },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id),
    supabase
      .from('financial_records')
      .select('total_amount')
      .eq('farmer_id', user.id)
      .eq('record_type', 'income')
      .eq('season_year', currentYear),
    supabase
      .from('products')
      .select('id, name, price_per_unit, unit, status, category')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalIncome = (incomeData ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0)

  return (
    <PetaniProfileClient
      profile={{
        full_name: profileData.full_name ?? '',
        phone: profileData.phone ?? '',
        email: profileData.email ?? null,
        city: profileData.city ?? null,
        province: profileData.province ?? null,
        address: profileData.address ?? null,
        bio: profileData.bio ?? null,
        is_verified: profileData.is_verified ?? false,
        kyc_submitted_at: profileData.kyc_submitted_at ?? null,
        avatar_storage_path: profileData.avatar_storage_path ?? null,
        rating_avg: profileData.rating_avg ?? null,
        rating_count: profileData.rating_count ?? null,
        created_at: profileData.created_at ?? '',
      }}
      stats={{
        totalProducts: totalProducts ?? 0,
        totalIncome,
        activeProducts: activeProducts ?? 0,
      }}
      recentProducts={(recentProducts ?? []) as any}
    />
  )
}

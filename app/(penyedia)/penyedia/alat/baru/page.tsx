import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AlatForm } from './_components/AlatForm'
import type { Tables } from '@/lib/supabase/client'

export const metadata = {
  title: 'Tambah Alat Baru',
}

export default async function AlatBaruPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/penyedia/alat/baru')

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, province, city, is_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const profile = profileData as Pick<
    Tables<'profiles'>,
    'full_name' | 'province' | 'city' | 'is_verified'
  > | null

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/penyedia/alat"
          className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center min-h-0"
          aria-label="Kembali"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-fg-dark leading-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', ui-sans-serif",
              fontSize: 'clamp(22px, 4.5vw, 32px)',
              fontWeight: 800,
            }}
          >
            Tambah Alat/Bahan Baru 🚜
          </h1>
          <p className="text-caption text-fg/60">
            Daftarkan alat/bahan tani untuk disewa atau dijual
          </p>
        </div>
      </header>

      {!profile?.is_verified && (
        <div className="mb-6 p-4 bg-amber/10 border-l-4 border-amber rounded-btn">
          <p className="text-sm text-fg-dark font-semibold mb-1">
            ⏳ Akun kamu belum diverifikasi
          </p>
          <p className="text-caption text-fg/70">
            Alat tetap bisa didaftarkan, tapi petani akan lebih percaya pada
            penyedia yang sudah terverifikasi.
          </p>
        </div>
      )}

      <AlatForm
        userId={user.id}
        defaultProvince={profile?.province ?? ''}
        defaultCity={profile?.city ?? ''}
      />
    </div>
  )
}
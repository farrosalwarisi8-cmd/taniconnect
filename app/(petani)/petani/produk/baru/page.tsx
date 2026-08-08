import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProdukForm } from './_components/ProdukForm'
import type { Tables } from '@/lib/supabase/client'

export const metadata = {
  title: 'Jual Hasil Panen',
}

export default async function ProdukBaruPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/petani/produk/baru')

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
    <main className="min-h-screen bg-surface pb-24">
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/petani/dashboard"
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
              Jual Hasil Panen 🌾
            </h1>
            <p className="text-caption text-fg/60">
              Buat listing produk baru di marketplace TaniConnect
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {!profile?.is_verified && (
          <div className="mb-6 p-4 bg-amber/10 border-l-4 border-amber rounded-btn">
            <p className="text-sm text-fg-dark font-semibold mb-1">
              ⏳ Akun kamu belum diverifikasi
            </p>
            <p className="text-caption text-fg/70">
              Produk tetap bisa dibuat, tapi pembeli akan lebih percaya pada
              penjual yang sudah terverifikasi KYC.
            </p>
          </div>
        )}

        <ProdukForm
          userId={user.id}
          defaultProvince={profile?.province ?? ''}
          defaultCity={profile?.city ?? ''}
        />
      </div>
    </main>
  )
}
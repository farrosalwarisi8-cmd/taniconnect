import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Tables } from '@/lib/supabase/client'

export default async function ProfilPenyediaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Tables<'profiles'> | null

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1
        className="text-fg-dark leading-tight"
        style={{
          fontFamily: "'Bricolage Grotesque', ui-sans-serif",
          fontSize: 'clamp(24px, 5vw, 40px)',
          fontWeight: 800,
        }}
      >
        Profil Penyedia 👤
      </h1>

      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-3xl font-bold">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'P'}
          </div>
          <div className="min-w-0">
            <h2 className="text-h2 text-fg-dark font-bold">
              {profile?.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="info" size="sm">🔧 Penyedia Alat</Badge>
              {profile?.is_verified ? (
                <Badge variant="verified" size="sm">✓ Terverifikasi</Badge>
              ) : (
                <Badge variant="warning" size="sm">⏳ Belum Verifikasi</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-caption text-fg/60">📱 Nomor HP</p>
            <p className="font-semibold text-fg-dark">{profile?.phone ?? '-'}</p>
          </div>
          <div>
            <p className="text-caption text-fg/60">✉️ Email</p>
            <p className="font-semibold text-fg-dark truncate">{profile?.email ?? '-'}</p>
          </div>
          <div>
            <p className="text-caption text-fg/60">📍 Lokasi</p>
            <p className="font-semibold text-fg-dark">
              {[profile?.city, profile?.province].filter(Boolean).join(', ') || '-'}
            </p>
          </div>
          <div>
            <p className="text-caption text-fg/60">📅 Bergabung</p>
            <p className="font-semibold text-fg-dark">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '-'}
            </p>
          </div>
        </div>
      </Card>

      <Card variant="standard" padding="lg" className="text-center border-dashed">
        <p className="text-body text-fg/60 mb-3">
          Fitur edit profil untuk penyedia akan tersedia segera.
        </p>
        <Link href="/penyedia/dashboard">
          <Button variant="secondary">← Kembali ke Dashboard</Button>
        </Link>
      </Card>
    </div>
  )
}
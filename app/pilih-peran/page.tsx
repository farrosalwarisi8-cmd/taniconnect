'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Role = 'petani' | 'pembeli' | 'penyedia_alat'

const ROLES: Array<{
  value: Role
  emoji: string
  title: string
  description: string
}> = [
  {
    value: 'petani',
    emoji: '🌾',
    title: 'Petani',
    description: 'Jual hasil panen, catat keuangan, sewa alat, dapat insight AI.',
  },
  {
    value: 'pembeli',
    emoji: '🛒',
    title: 'Pembeli',
    description: 'Beli hasil panen segar langsung dari petani, tanpa perantara.',
  },
  {
    value: 'penyedia_alat',
    emoji: '🚜',
    title: 'Penyedia Alat & Bahan',
    description: 'Sewakan atau jual alat dan bahan pertanian ke petani.',
  },
]

function PilihPeranContent() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!selectedRole) {
      toast('Pilih salah satu peran dulu', 'warning')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session tidak ditemukan')

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: authError } = await supabase.auth.updateUser({
        data: { role: selectedRole },
      })
      if (authError) throw authError

      const destinations: Record<Role, string> = {
        petani:        '/petani/dashboard',
        pembeli:       '/pembeli/marketplace',
        penyedia_alat: '/penyedia/dashboard',
      }

      toast(`Selamat datang, ${ROLES.find(r => r.value === selectedRole)?.title}!`, 'success')

      setTimeout(() => {
        window.location.href = destinations[selectedRole]
      }, 800)
    } catch (err: any) {
      toast(err.message ?? 'Gagal menyimpan peran', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1
            className="text-[48px] sm:text-[64px] font-extrabold text-fg-dark leading-tight mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            Kamu siapa?
          </h1>
          <p className="text-body text-fg/70">
            Pilih peran untuk pengalaman yang paling sesuai.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {ROLES.map(role => {
            const isSelected = selectedRole === role.value

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                aria-pressed={isSelected}
                className={cn(
                  'text-left p-6 rounded-DEFAULT transition-all min-h-0',
                  'border-2 bg-white',
                  isSelected
                    ? 'border-primary bg-green-50 shadow-lg scale-[1.02]'
                    : 'border-border hover:border-primary-light hover:shadow-md',
                )}
              >
                {role.value === 'petani' && !isSelected && (
                  <div className="w-1 h-16 bg-primary rounded-full mb-4 -ml-6" />
                )}

                <div className="text-6xl mb-4">{role.emoji}</div>
                <h3 className="text-h2 text-fg-dark mb-2">{role.title}</h3>
                <p className="text-sm text-fg/70 leading-relaxed">{role.description}</p>

                {isSelected && (
                  <div className="mt-4 inline-flex items-center gap-1 text-primary-dark font-semibold text-sm">
                    ✓ Dipilih
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <Button
          onClick={handleContinue}
          fullWidth
          size="lg"
          disabled={!selectedRole}
          loading={loading}
          className="max-w-md mx-auto"
        >
          Lanjutkan
        </Button>
      </div>
    </main>
  )
}

export default function PilihPeranPage() {
  return (
    <ToastProvider>
      <PilihPeranContent />
    </ToastProvider>
  )
}
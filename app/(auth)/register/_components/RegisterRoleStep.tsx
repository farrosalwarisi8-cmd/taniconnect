'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { RegisterStep3Input } from '@/lib/validations'
import { useToast } from '@/components/ui/Toast'

type SelectableRole = 'petani' | 'pembeli' | 'penyedia_alat'

const ROLES: Array<{
  value: SelectableRole
  emoji: string
  title: string
  description: string
  gradient: string
}> = [
  {
    value: 'petani',
    emoji: '🌾',
    title: 'Petani',
    description: 'Jual hasil panen, catat keuangan, sewa alat.',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    value: 'pembeli',
    emoji: '🛒',
    title: 'Pembeli',
    description: 'Beli hasil panen segar langsung dari petani.',
    gradient: 'from-orange-400 to-amber-500',
  },
  {
    value: 'penyedia_alat',
    emoji: '🚜',
    title: 'Penyedia Alat',
    description: 'Sewakan atau jual alat pertanian ke petani.',
    gradient: 'from-blue-500 to-cyan-600',
  },
]

interface RegisterRoleStepProps {
  onBack: () => void
  onComplete: (data: RegisterStep3Input) => void
  loading?: boolean
}

export function RegisterRoleStep({ onBack, onComplete, loading }: RegisterRoleStepProps) {
  const { toast } = useToast()
  // Secara default tidak ada role yang terpilih, atau pembeli default
  const [selectedRoles, setSelectedRoles] = useState<Set<SelectableRole>>(new Set(['pembeli']))

  const toggleRole = (role: SelectableRole) => {
    setSelectedRoles(prev => {
      const next = new Set(prev)
      if (next.has(role)) {
        if (next.size === 1) {
          toast('Kamu harus punya minimal 1 peran', 'warning')
          return prev
        }
        next.delete(role)
      } else {
        next.add(role)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRoles.size === 0) {
      toast('Pilih minimal 1 peran', 'warning')
      return
    }
    const rolesArray = Array.from(selectedRoles)
    const activeRole = rolesArray[0]
    onComplete({ roles: rolesArray, activeRole })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-fg-dark mb-2 leading-tight">
          Pilih Peranmu 🎭
        </h1>
        <p className="text-body text-fg/70">
          Pilih satu atau lebih peran untuk pengalaman yang paling sesuai di TaniConnect.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {ROLES.map(role => {
          const isSelected = selectedRoles.has(role.value)
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => toggleRole(role.value)}
              aria-pressed={isSelected}
              className={cn(
                'text-left rounded-xl transition-all duration-200 border-2 relative overflow-hidden',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary bg-white shadow-md'
                  : 'border-border bg-white hover:border-primary/40',
              )}
            >
              <div className="p-4 flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 bg-gradient-to-br text-white',
                  role.gradient
                )}>
                  {role.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-fg-dark">{role.title}</h3>
                  <p className="text-sm text-fg/70 line-clamp-1">{role.description}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  isSelected
                    ? 'border-primary-dark bg-primary-dark text-white'
                    : 'border-border'
                )}>
                  {isSelected && <span className="text-[10px]">✓</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          leftIcon={<span>←</span>}
          disabled={loading}
        >
          Kembali
        </Button>
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          disabled={selectedRoles.size === 0}
        >
          Selesai & Daftar
        </Button>
      </div>
    </form>
  )
}

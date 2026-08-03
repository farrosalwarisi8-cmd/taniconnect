'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { cn, normalizeUserRole } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/client'

type SelectableRole = 'petani' | 'pembeli' | 'penyedia_alat'

const ROLES: Array<{
  value: SelectableRole
  emoji: string
  title: string
  description: string
  gradient: string
  features: string[]
}> = [
    {
      value: 'petani',
      emoji: '🌾',
      title: 'Petani',
      description: 'Jual hasil panen, catat keuangan, sewa alat, dan dapat insight AI pertanian.',
      gradient: 'from-green-500 to-emerald-600',
      features: ['Jual hasil panen', 'Catat keuangan', 'Sewa alat tani', 'Konsultasi AI'],
    },
    {
      value: 'pembeli',
      emoji: '🛒',
      title: 'Pembeli',
      description: 'Beli hasil panen segar langsung dari petani, tanpa perantara.',
      gradient: 'from-orange-400 to-amber-500',
      features: ['Beli langsung petani', 'Harga lebih murah', 'Chat dengan penjual', 'Lacak pesanan'],
    },
    {
      value: 'penyedia_alat',
      emoji: '🚜',
      title: 'Penyedia Alat & Bahan',
      description: 'Sewakan atau jual alat dan bahan pertanian ke petani se-Indonesia.',
      gradient: 'from-blue-500 to-cyan-600',
      features: ['Sewakan alat', 'Jual bahan tani', 'Kelola booking', 'Pantau pendapatan'],
    },
  ]

const ROLE_DESTINATIONS: Record<SelectableRole, string> = {
  petani: '/petani/dashboard',
  pembeli: '/pembeli/marketplace',
  penyedia_alat: '/penyedia/dashboard',
}

// ─── Helper: update roles + role aktif tanpa TypeScript never error ───────────
// Root cause: @supabase/ssr tidak selalu resolve Update<'profiles'> type
// dari Database generic — menghasilkan `never` untuk argumen .update().
// Fix: cast .from() result ke `any` secara terlokalisir.
async function updateProfileRoles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  roles: SelectableRole[],
  activeRole: SelectableRole,
): Promise<{ error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update({ roles, role: activeRole })
      .eq('id', userId)

    return { error: error ?? null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

// ─── Main content ─────────────────────────────────────────────────────────────
function PilihPeranContent() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingRoles, setExistingRoles] = useState<SelectableRole[]>([])
  const [selectedRoles, setSelectedRoles] = useState<Set<SelectableRole>>(new Set())
  const [activeRole, setActiveRole] = useState<SelectableRole | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast('Sesi habis, silakan login ulang', 'warning')
        setTimeout(() => router.push('/login'), 1000)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, roles')
        .eq('id', user.id)
        .maybeSingle()

      const profileAny = profile as any
      const currentRole = normalizeUserRole(profileAny?.role) as SelectableRole | null
      const currentRoles: SelectableRole[] =
        (profileAny?.roles as SelectableRole[] | undefined ?? [])
          .map(role => normalizeUserRole(role) as SelectableRole | null)
          .filter((role): role is SelectableRole => Boolean(role))

      if (currentRoles.length === 0 && currentRole) {
        currentRoles.push(currentRole)
      }

      setUserId(user.id)
      setExistingRoles(currentRoles)
      setSelectedRoles(new Set(currentRoles))
      setActiveRole(currentRole ?? null)
      setChecking(false)
    }
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleContinue = async () => {
    if (selectedRoles.size === 0) {
      toast('Pilih minimal satu peran', 'warning')
      return
    }

    if (!userId) {
      toast('Sesi tidak ditemukan, silakan login ulang', 'error')
      setTimeout(() => router.push('/login'), 1000)
      return
    }

    setLoading(true)
    try {
      const rolesArray = Array.from(selectedRoles)

      // Tentukan active role
      let newActiveRole: SelectableRole
      if (activeRole && selectedRoles.has(activeRole)) {
        newActiveRole = activeRole
      } else if (rolesArray.length > 0) {
        const addedRole = rolesArray.find(r => !existingRoles.includes(r))
        newActiveRole = addedRole ?? rolesArray[0]
      } else {
        newActiveRole = 'pembeli'
      }

      // ── Update roles + role aktif di profile ─────────────────────────────
      const { error: profileError } = await updateProfileRoles(
        supabase,
        userId,
        rolesArray,
        newActiveRole,
      )

      if (profileError) throw profileError

      // ── Update auth metadata ──────────────────────────────────────────────
      await supabase.auth.updateUser({
        data: { role: newActiveRole, roles: rolesArray },
      })

      const roleTitles = rolesArray
        .map(r => ROLES.find(x => x.value === r)?.title ?? r)
        .join(' & ')
      toast(`Peran berhasil disimpan: ${roleTitles}!`, 'success')

      setTimeout(() => {
        window.location.href = ROLE_DESTINATIONS[newActiveRole]
      }, 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan peran'
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-float">🌿</div>
          <p className="text-fg/70 font-medium">Memeriksa sesi...</p>
        </div>
      </main>
    )
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-extrabold text-primary-dark text-lg min-h-0"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            🌿 TaniConnect
          </Link>
          {existingRoles.length > 0 && (
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-fg/60 hover:text-fg transition-colors min-h-0"
            >
              ← Kembali
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1
            className="text-[42px] sm:text-[56px] font-extrabold text-fg-dark leading-tight mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            {existingRoles.length > 0 ? 'Kelola Peranmu' : 'Kamu siapa?'}
          </h1>
          <p className="text-body text-fg/60 max-w-md mx-auto">
            {existingRoles.length > 0
              ? 'Tambah atau hapus peran. Kamu bisa punya lebih dari satu peran sekaligus.'
              : 'Pilih satu atau lebih peran untuk pengalaman yang paling sesuai.'}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-2 rounded-full">
            ✨ Kamu bisa pilih lebih dari satu peran sekaligus!
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {ROLES.map(role => {
            const isSelected = selectedRoles.has(role.value)
            const isExisting = existingRoles.includes(role.value)
            const isActive = activeRole === role.value

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => toggleRole(role.value)}
                aria-pressed={isSelected}
                className={cn(
                  'text-left rounded-2xl transition-all duration-200 border-2 relative overflow-hidden',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-white shadow-lg scale-[1.02]'
                    : 'border-border bg-white hover:border-primary/40 hover:shadow-md',
                )}
              >
                {/* Gradient header */}
                <div className={cn('p-5 bg-gradient-to-br text-white relative', role.gradient)}>
                  {isActive && (
                    <span className="absolute top-3 right-3 bg-white/30 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      AKTIF
                    </span>
                  )}
                  {isExisting && !isActive && (
                    <span className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      PUNYA
                    </span>
                  )}
                  <div className="text-4xl mb-2">{role.emoji}</div>
                  <h3 className="text-lg font-bold leading-tight">{role.title}</h3>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <p className="text-sm text-fg/70 leading-relaxed mb-3">{role.description}</p>
                  <ul className="space-y-1">
                    {role.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-fg/60">
                        <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] shrink-0">
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Selection indicator */}
                  <div className={cn(
                    'mt-4 flex items-center gap-2 text-sm font-semibold transition-all',
                    isSelected ? 'text-primary-dark' : 'text-fg/40',
                  )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      isSelected
                        ? 'border-primary-dark bg-primary-dark text-white'
                        : 'border-border',
                    )}>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </div>
                    {isSelected ? 'Dipilih' : 'Pilih'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Selection summary */}
        {selectedRoles.size > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm font-semibold text-green-700 mb-1">
              ✓ Peran yang dipilih ({selectedRoles.size}):
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedRoles).map(role => {
                const r = ROLES.find(x => x.value === role)!
                return (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 bg-white border border-green-300 text-green-700 text-sm font-medium px-3 py-1 rounded-full"
                  >
                    {r.emoji} {r.title}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="max-w-sm mx-auto">
          <Button
            onClick={handleContinue}
            fullWidth
            size="lg"
            disabled={selectedRoles.size === 0}
            loading={loading}
          >
            {selectedRoles.size === 0
              ? 'Pilih minimal 1 peran'
              : `Lanjutkan dengan ${selectedRoles.size} peran`}
          </Button>

          {existingRoles.length > 0 && (
            <p className="text-center text-xs text-fg/50 mt-3">
              Role aktif akan disesuaikan otomatis
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function PilihPeranPage() {
  return (
    <ToastProvider>
      <PilihPeranContent />
    </ToastProvider>
  )
}
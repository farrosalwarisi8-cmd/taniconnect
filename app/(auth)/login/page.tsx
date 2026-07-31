'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { normalizePhoneID } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/client'

// ─── Role Selector Modal ──────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, { emoji: string; label: string; href: string }> = {
  petani: { emoji: '🌾', label: 'Petani', href: '/petani/dashboard' },
  pembeli: { emoji: '🛒', label: 'Pembeli', href: '/pembeli/marketplace' },
  penyedia_alat: { emoji: '🚜', label: 'Penyedia Alat', href: '/penyedia/dashboard' },
  admin: { emoji: '🔐', label: 'Administrator', href: '/admin/dashboard' },
}

interface RoleSelectorModalProps {
  roles: UserRole[]
  onSelect: (role: UserRole) => void
}

function RoleSelectorModal({ roles, onSelect }: RoleSelectorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-modal w-full max-w-sm p-6 animate-scale-in">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-dark to-primary mx-auto mb-4 flex items-center justify-center text-3xl">
          🌿
        </div>

        <h2 className="text-xl font-bold text-fg-dark text-center mb-1">
          Masuk sebagai siapa?
        </h2>
        <p className="text-sm text-fg/60 text-center mb-6">
          Kamu punya {roles.length} peran. Pilih dashboard yang ingin kamu buka sekarang.
        </p>

        <div className="space-y-2">
          {roles.map(role => {
            const config = ROLE_CONFIG[role]
            if (!config) return null
            return (
              <button
                key={role}
                type="button"
                onClick={() => onSelect(role)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-green-50 transition-all text-left group min-h-0"
              >
                <span className="text-2xl">{config.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-fg-dark">{config.label}</p>
                  <p className="text-xs text-fg/50">{config.href}</p>
                </div>
                <span className="text-primary-dark opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Login Form ───────────────────────────────────────────────
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([])
  const [activeRole, setActiveRole] = useState<UserRole | null>(null)

  const redirectTo = searchParams.get('redirect') ?? null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const handleRoleSelect = async (selectedRole: UserRole) => {
    setShowRoleSelector(false)

    // Update role aktif di profile dan auth metadata
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ role: selectedRole }).eq('id', user.id)
      await supabase.auth.updateUser({ data: { role: selectedRole } })
    }

    const destination = redirectTo ?? ROLE_CONFIG[selectedRole]?.href ?? '/pembeli/marketplace'
    window.location.href = destination
  }

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const phone = normalizePhoneID(data.phone)

      // ─── 1. Cari email berdasarkan phone ─────────────────────
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('email, role, roles')
        .eq('phone', phone)
        .limit(1)

      if (profileError) {
        toast('Terjadi kesalahan sistem, coba lagi', 'error')
        return
      }

      if (!profiles || profiles.length === 0) {
        // Pesan generik untuk cegah user enumeration
        toast('Nomor HP atau password salah', 'error')
        return
      }

      const profile = profiles[0] as { email: string | null; role: UserRole; roles: UserRole[] | null }

      if (!profile.email) {
        toast('Data akun tidak lengkap. Hubungi admin.', 'error')
        return
      }

      // ─── 2. Login dengan email + password ────────────────────
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: data.password,
      })

      if (signInError || !authData.user || !authData.session) {
        toast('Nomor HP atau password salah', 'error')
        return
      }

      toast('Berhasil masuk! Mengalihkan...', 'success', 2000)

      // ─── 3. Tentukan redirect berdasarkan role ────────────────
      // Normalisasi roles — support user lama yang belum punya kolom roles
      const userRoles: UserRole[] = (profile.roles && profile.roles.length > 0)
        ? profile.roles
        : [profile.role ?? 'pembeli']

      // Kalau ada explicit redirect, langsung navigasi
      if (redirectTo) {
        setTimeout(() => { window.location.href = redirectTo }, 800)
        return
      }

      // Kalau punya >1 role, tampilkan modal pilih role
      if (userRoles.length > 1) {
        setAvailableRoles(userRoles)
        setActiveRole(profile.role)
        setLoading(false)
        setTimeout(() => setShowRoleSelector(true), 800)
        return
      }

      // Single role: langsung redirect
      const destination = ROLE_CONFIG[userRoles[0]]?.href ?? '/pembeli/marketplace'
      setTimeout(() => { window.location.href = destination }, 800)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'coba lagi nanti'
      toast(`Gagal masuk: ${message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showRoleSelector && (
        <RoleSelectorModal
          roles={availableRoles}
          onSelect={handleRoleSelect}
        />
      )}

      <main className="min-h-screen bg-white flex flex-col">
        <header className="px-6 py-4 border-b border-border">
          <Link
            href="/"
            className="text-primary-dark font-semibold text-lg inline-flex items-center gap-2 min-h-0"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            🌿 TaniConnect
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-[32px] font-bold text-fg-dark leading-tight mb-2">
                Masuk ke TaniConnect
              </h1>
              <p className="text-body text-fg/70">Selamat datang kembali 👋</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Nomor HP"
                leftAddon="+62"
                placeholder="8123456789"
                type="tel"
                inputMode="tel"
                {...register('phone')}
                error={errors.phone?.message}
                autoComplete="tel"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Password kamu"
                {...register('password')}
                error={errors.password?.message}
                autoComplete="current-password"
              />

              <div className="flex justify-end">
                <Link href="#" className="text-btn-sm text-primary-dark hover:underline min-h-0">
                  Lupa password?
                </Link>
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Masuk
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-caption text-fg/60">atau</span>
              </div>
            </div>

            <Link href="/register" className="block">
              <Button variant="secondary" fullWidth size="lg">
                Daftar Akun Baru
              </Button>
            </Link>

            <p className="text-caption text-fg/60 text-center">
              Dengan masuk, kamu setuju dengan{' '}
              <a href="#" className="text-primary-dark underline">Syarat &amp; Ketentuan</a>{' '}
              TaniConnect.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}

// ─── Loading Fallback saat Suspense boundary aktif ───────────
function LoginLoadingFallback() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-3 animate-pulse">🌿</div>
        <p className="text-fg/70">Memuat halaman login...</p>
      </div>
    </main>
  )
}

// ─── Page export dengan Suspense wrapper ─────────────────────
export default function LoginPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<LoginLoadingFallback />}>
        <LoginForm />
      </Suspense>
    </ToastProvider>
  )
}
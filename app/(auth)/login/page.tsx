'use client'

import { useState } from 'react'
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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const redirectTo = searchParams.get('redirect') ?? null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const phone = normalizePhoneID(data.phone)
      const pseudoEmail = `${phone.replace('+', '')}@taniconnect.local`

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email:    pseudoEmail,
        password: data.password,
      })

      if (error) {
        // Pesan generik untuk mencegah user enumeration
        toast('Nomor HP atau password salah', 'error')
        return
      }

      if (!authData.user) {
        toast('Login gagal, coba lagi', 'error')
        return
      }

      toast('Berhasil masuk! Mengalihkan…', 'success', 2000)

      // Redirect berdasarkan role user
      const userRole = authData.user.user_metadata?.role as string | undefined
      const roleRedirects: Record<string, string> = {
        petani:        '/petani/dashboard',
        pembeli:       '/pembeli/marketplace',
        penyedia_alat: '/penyedia/dashboard',
        admin:         '/admin/dashboard',
      }

      const destination = redirectTo ?? roleRedirects[userRole ?? ''] ?? '/pilih-peran'

      // Force reload untuk trigger middleware refresh session
      setTimeout(() => {
        window.location.href = destination
      }, 800)
    } catch (err: any) {
      toast(`Error: ${err.message ?? 'coba lagi nanti'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border">
        <Link
          href="/"
          className="text-primary-dark font-semibold text-lg inline-flex items-center min-h-0"
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
            <a href="#" className="text-primary-dark underline">Syarat & Ketentuan</a>{' '}
            TaniConnect.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  )
}
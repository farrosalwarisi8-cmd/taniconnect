// app/(auth)/reset-password/page.tsx
//
// Halaman yang dibuka user setelah klik link reset password di email.
// Supabase mengirim token via query param `code` (PKCE flow).
// @supabase/ssr otomatis membaca token dari URL dan membuat session sementara.
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations'

type TokenStatus = 'checking' | 'valid' | 'invalid'

function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toast }    = useToast()
  const supabase     = createClient()

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('checking')
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Validasi token saat mount
  useEffect(() => {
    const validateToken = async () => {
      const code       = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDesc  = searchParams.get('error_description')

      if (errorParam) {
        console.error('[reset-password] URL error:', errorParam, errorDesc)
        setTokenStatus('invalid')
        return
      }

      if (code) {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          try {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) {
              setTokenStatus('invalid')
              return
            }
            setTokenStatus('valid')
          } catch {
            setTokenStatus('invalid')
          }
          return
        }

        setTokenStatus('valid')
        return
      }

      // Tidak ada `code` dan tidak ada `error` — URL tidak lengkap
      setTokenStatus('invalid')
    }

    validateToken()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        if (error.message.includes('same password')) {
          toast('Password baru tidak boleh sama dengan password lama', 'error')
        } else if (error.message.includes('session')) {
          toast('Sesi expired. Minta link reset password baru.', 'error')
        } else {
          toast(`Gagal reset password: ${error.message}`, 'error')
        }
        return
      }

      setSuccess(true)
      toast('Password berhasil diubah!', 'success', 2000)

      // Logout semua sesi lain untuk keamanan
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.auth as any).signOut({ scope: 'others' })

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'coba lagi nanti'
      toast(`Gagal: ${message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (tokenStatus === 'checking') {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🔑</div>
        <p className="text-fg/70">Memverifikasi link reset...</p>
      </div>
    )
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl mx-auto mb-6">
          ⛔
        </div>
        <h2 className="text-2xl font-bold text-fg-dark mb-3">
          Link Tidak Valid
        </h2>
        <p className="text-body text-fg/70 mb-8">
          Link reset password sudah expired atau tidak valid. Link hanya berlaku selama{' '}
          <strong>1 jam</strong> setelah dikirim.
        </p>
        <div className="space-y-3">
          <Link
            href="/forgot-password"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 min-h-[48px] bg-primary hover:bg-primary-dark text-white font-medium rounded-2xl transition-colors"
          >
            Minta Link Baru
          </Link>
          <Link
            href="/login"
            className="block text-center text-sm text-fg/60 hover:text-fg/80 transition-colors py-2"
          >
            ← Kembali ke Login
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mx-auto mb-6">
          ✅
        </div>
        <h2 className="text-2xl font-bold text-fg-dark mb-3">
          Password Berhasil Diubah!
        </h2>
        <p className="text-body text-fg/70 mb-2">
          Mengalihkan ke halaman login...
        </p>
        <div className="mt-2 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">
          🔐
        </div>
        <h1 className="text-[28px] font-bold text-fg-dark mb-2">
          Buat Password Baru
        </h1>
        <p className="text-body text-fg/70">
          Pilih password baru yang kuat untuk akunmu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Password Baru"
          type="password"
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
          hint="Kombinasi huruf besar, kecil, dan angka"
        />

        <Input
          label="Konfirmasi Password Baru"
          type="password"
          placeholder="Ketik ulang password baru"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
        >
          Simpan Password Baru
        </Button>
      </form>
    </>
  )
}

function ResetPasswordLoading() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-3 animate-pulse">🌿</div>
        <p className="text-fg/70">Memuat...</p>
      </div>
    </main>
  )
}

function ResetPasswordPage() {
  return (
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
        <div className="w-full max-w-md">
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  )
}

export default function ResetPassword() {
  return (
    <ToastProvider>
      <Suspense fallback={<ResetPasswordLoading />}>
        <ResetPasswordPage />
      </Suspense>
    </ToastProvider>
  )
}
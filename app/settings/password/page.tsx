'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}

function ChangePasswordContent() {
  const router   = useRouter()
  const { toast } = useToast()
  const supabase  = createClient()

  const [checkingSession, setCheckingSession] = useState(true)
  const [email,           setEmail]           = useState<string | null>(null)
  const [sendingCode,     setSendingCode]     = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [codeSent,        setCodeSent]        = useState(false)
  const [cooldown,        setCooldown]        = useState(0)

  const maskedEmail = useMemo(() => {
    return email ? maskEmail(email) : null
  }, [email])

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  // ─── Cek session user ───────────────────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/settings/password')
        return
      }

      if (!user.email) {
        toast('Akunmu belum punya email valid untuk verifikasi password.', 'error', 6000)
        router.push('/')
        return
      }

      setEmail(user.email)
      setCheckingSession(false)
    }

    checkUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cooldown timer untuk tombol kirim ulang kode ──────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  // ─── Kirim kode verifikasi ke email ────────────────────────────────────────
  const handleSendCode = async () => {
    if (!email || sendingCode || cooldown > 0) return

    setSendingCode(true)
    try {
      // supabase.auth.reauthenticate() — kirim nonce/kode ke email user
      // yang sedang login. Tipe tidak selalu ter-export di versi lama,
      // cast ke any untuk bypass type check.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.auth as any).reauthenticate()

      if (error) {
        const msg = String(error.message ?? '').toLowerCase()
        if (msg.includes('rate')) {
          toast('Terlalu sering mengirim kode. Tunggu sebentar lalu coba lagi.', 'error', 6000)
        } else {
          toast(`Gagal mengirim kode verifikasi: ${error.message}`, 'error', 6000)
        }
        return
      }

      setCodeSent(true)
      setCooldown(60)
      resetField('nonce')
      toast(`Kode verifikasi dikirim ke ${maskedEmail ?? 'email kamu'}`, 'success', 5000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'coba lagi nanti'
      toast(`Gagal mengirim kode: ${message}`, 'error')
    } finally {
      setSendingCode(false)
    }
  }

  // ─── Submit password baru + nonce ──────────────────────────────────────────
  const onSubmit = async (data: ChangePasswordInput) => {
    if (!codeSent) {
      toast('Kirim kode verifikasi ke email dulu sebelum ubah password.', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast('Sesi habis. Silakan login ulang.', 'error')
        router.push('/login?redirect=/settings/password')
        return
      }

      // updateUser() menerima { password } sebagai arg pertama dan
      // { nonce } sebagai arg kedua — tapi arg kedua belum ada di
      // beberapa versi type definition @supabase/ssr.
      // Cast arg kedua ke `any` supaya type check tidak error.
      const { error } = await supabase.auth.updateUser(
        { password: data.password },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { nonce: data.nonce } as any
      )

      if (error) {
        const msg = error.message.toLowerCase()

        if (
          msg.includes('nonce')     ||
          msg.includes('otp')       ||
          msg.includes('token')     ||
          msg.includes('expired')   ||
          msg.includes('invalid')
        ) {
          toast(
            'Kode verifikasi salah atau sudah kedaluwarsa. Kirim kode baru lalu coba lagi.',
            'error',
            7000
          )
          return
        }

        if (msg.includes('same password')) {
          toast('Password baru tidak boleh sama dengan password lama.', 'error')
          return
        }

        if (msg.includes('weak') || msg.includes('password should')) {
          toast('Password baru tidak memenuhi syarat keamanan.', 'error')
          return
        }

        toast(`Gagal mengubah password: ${error.message}`, 'error', 7000)
        return
      }

      toast('Password berhasil diubah. Untuk keamanan, silakan login ulang.', 'success', 4000)

      // Logout semua sesi agar password baru berlaku bersih di semua device
      await supabase.auth.signOut({ scope: 'global' })

      setTimeout(() => {
        window.location.href = '/login'
      }, 1200)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'coba lagi nanti'
      toast(`Gagal mengubah password: ${message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Checking session state ─────────────────────────────────────────────────
  if (checkingSession) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-3 animate-pulse">🔐</div>
          <p className="text-fg/70">Memeriksa sesi...</p>
        </div>
      </main>
    )
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-4 border-b border-border">
        <div className="max-w-md mx-auto w-full flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-primary-dark font-semibold text-lg inline-flex items-center gap-2 min-h-0"
            style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
          >
            🌿 TaniConnect
          </Link>
          <Link
            href="/"
            className="text-sm text-fg/60 hover:text-fg/80 min-h-0"
          >
            ← Kembali
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">

          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>
            <h1 className="text-[30px] font-bold text-fg-dark leading-tight mb-2">
              Ubah Password
            </h1>
            <p className="text-body text-fg/70">
              Demi keamanan, kami akan kirim kode verifikasi ke emailmu sebelum password diubah.
            </p>
          </div>

          {/* Email + tombol kirim kode */}
          <div className="p-4 rounded-2xl border border-border bg-surface-light">
            <p className="text-sm text-fg/60 mb-1">Email verifikasi</p>
            <p className="font-semibold text-fg-dark">{maskedEmail ?? '-'}</p>

            <div className="mt-4">
              <Button
                type="button"
                fullWidth
                variant="secondary"
                loading={sendingCode}
                disabled={cooldown > 0}
                onClick={handleSendCode}
              >
                {cooldown > 0
                  ? `Kirim Ulang dalam ${cooldown} dtk`
                  : codeSent
                    ? 'Kirim Ulang Kode'
                    : 'Kirim Kode Verifikasi'}
              </Button>
            </div>

            <p className="text-xs text-fg/50 mt-3">
              Kode hanya dikirim ke email akun yang sedang login. Berlaku{' '}
              <strong>10 menit</strong>.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Kode Verifikasi Email"
              placeholder="6 digit kode"
              inputMode="numeric"
              autoComplete="one-time-code"
              {...register('nonce')}
              error={errors.nonce?.message}
              hint="Masukkan kode yang dikirim ke email"
            />

            <Input
              label="Password Baru"
              type="password"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
              hint="Harus mengandung huruf besar, kecil, dan angka"
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
              loading={submitting}
            >
              Simpan Password Baru
            </Button>
          </form>

          <p className="text-caption text-fg/50 text-center">
            Setelah password berhasil diubah, semua sesi akan dikeluarkan dan kamu perlu login ulang.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function ChangePasswordPage() {
  return (
    <ToastProvider>
      <ChangePasswordContent />
    </ToastProvider>
  )
}
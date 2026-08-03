'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations'

function ForgotPasswordForm() {
  const { toast } = useToast()
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: data.email }),
      })

      const result: unknown = await res.json()

      // Apapun responsenya (email ada / tidak ada / rate limited),
      // tampilkan success state supaya tidak reveal apakah email terdaftar.
      // Pengecualian: pesan rate limit yang eksplisit.
      if (
        result !== null &&
        typeof result === 'object' &&
        'message' in result &&
        typeof (result as { message: unknown }).message === 'string'
      ) {
        const message = (result as { message: string }).message
        if (message.includes('Terlalu banyak')) {
          toast(message, 'error', 6000)
          return
        }
      }

      setSubmitted(true)
    } catch {
      // Network error — tetap tampilkan success state
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mx-auto mb-6">
          📬
        </div>
        <h2 className="text-2xl font-bold text-fg-dark mb-3">
          Cek emailmu!
        </h2>
        <p className="text-body text-fg/70 mb-2">
          Kalau email{' '}
          <span className="font-semibold text-fg-dark">{getValues('email')}</span>{' '}
          terdaftar di TaniConnect, kami sudah mengirimkan link reset password.
        </p>
        <p className="text-sm text-fg/50 mb-8">
          Tidak ada email? Cek folder <strong>Spam</strong> atau tunggu beberapa menit.
          Link berlaku selama <strong>1 jam</strong>.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="w-full text-sm text-fg/60 hover:text-fg/80 transition-colors py-2"
          >
            Coba dengan email lain
          </button>
          <Link
            href="/login"
            className="block w-full text-center text-sm font-medium text-primary-dark hover:underline py-2"
          >
            ← Kembali ke Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">
          🔑
        </div>
        <h1 className="text-[28px] font-bold text-fg-dark mb-2">
          Lupa Password?
        </h1>
        <p className="text-body text-fg/70">
          Masukkan emailmu dan kami akan kirim link untuk reset password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="email"
          inputMode="email"
          placeholder="contoh@email.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
        >
          Kirim Link Reset Password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-fg/60 hover:text-fg/80 transition-colors"
        >
          ← Kembali ke Login
        </Link>
      </div>
    </>
  )
}

function ForgotPasswordPage() {
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
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  )
}

export default function ForgotPassword() {
  return (
    <ToastProvider>
      <ForgotPasswordPage />
    </ToastProvider>
  )
}
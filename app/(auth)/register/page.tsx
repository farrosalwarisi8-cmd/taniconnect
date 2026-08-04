'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegisterStep1 } from './_components/RegisterStep1'
import { RegisterStep2 } from './_components/RegisterStep2'
import { RegisterRoleStep } from './_components/RegisterRoleStep'
import { StepIndicator } from './_components/StepIndicator'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import type { RegisterStep1Input, RegisterStep2Input, RegisterStep3Input } from '@/lib/validations'
import { normalizePhoneID, normalizeUserRole } from '@/lib/utils'

const ROLE_DESTINATIONS: Record<string, string> = {
  petani: '/petani/dashboard',
  pembeli: '/pembeli/marketplace',
  penyedia_alat: '/penyedia/dashboard',
}

interface RegisterState {
  step1?: RegisterStep1Input
  step2?: RegisterStep2Input
}

function RegisterFlow() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [state, setState] = useState<RegisterState>({})
  const [loading, setLoading] = useState(false)

  const handleStep1Complete = (data: RegisterStep1Input) => {
    setState(prev => ({ ...prev, step1: data }))
    setCurrentStep(2)
  }

  const handleStep2Complete = (data: RegisterStep2Input) => {
    setState(prev => ({ ...prev, step2: data }))
    setCurrentStep(3)
  }

  const handleStep3Complete = async (data: RegisterStep3Input) => {
    if (!state.step1 || !state.step2) {
      toast('Data tidak lengkap, silakan ulangi dari awal', 'error')
      setCurrentStep(1)
      return
    }

    setLoading(true)
    try {
      const fullName = state.step1.fullName?.trim() || 'User'
      const email = state.step1.email.trim().toLowerCase()
      const phone = state.step1.phone ? normalizePhoneID(state.step1.phone) : ''

      // ─── 1. SIGN UP ─────────────────────────────────────────
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: state.step1.password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: data.activeRole,
            roles: data.roles,
          },
        },
      })

      if (authError) {
        throw authError
      }
      if (!authData.user) throw new Error('Gagal membuat akun')

      // ─── 2. CEK SESSION — kalau belum ada, LOGIN MANUAL ─────
      if (!authData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: state.step1.password,
        })

        if (signInError) {
          throw new Error('Akun berhasil dibuat, tapi gagal login. Silakan login manual.')
        }
      }

      // ─── 3. SETUP PROFILE via API (bypass RLS) ───────────────
      const setupRes = await fetch('/api/auth/setup-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          province: state.step2.province,
          city: state.step2.city,
          district: state.step2.district,
          address: state.step2.address,
          roles: data.roles,
          activeRole: data.activeRole,
        }),
      })

      if (!setupRes.ok) {
        const errData = await setupRes.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Gagal setup profil')
      }

      // Refresh Session agar metadata lokal terupdate langsung
      await supabase.auth.updateUser({
        data: { role: data.activeRole, roles: data.roles, full_name: fullName }
      })
      await supabase.auth.refreshSession()

      toast('Registrasi berhasil! Mengalihkan ke dashboard...', 'success', 2000)

      // ─── 4. Redirect langsung ke dashboard role aktif ─
      setTimeout(() => {
        const dest = ROLE_DESTINATIONS[data.activeRole] || '/pembeli/marketplace'
        window.location.href = dest
      }, 500)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error tidak diketahui'

      let displayMsg = `Gagal daftar: ${errorMsg}`

      if (errorMsg.includes('already registered') || errorMsg.includes('already been registered')) {
        displayMsg = 'Nomor HP sudah terdaftar. Silakan login.'
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('ERR_NAME_NOT_RESOLVED')) {
        displayMsg = 'Koneksi ke server gagal. Cek URL Supabase di .env.local'
      } else if (errorMsg.includes('Email address') && errorMsg.includes('invalid')) {
        displayMsg = 'Format email tidak valid.'
      } else if (errorMsg.includes('email rate limit') || errorMsg.includes('rate limit exceeded')) {
        displayMsg = '⏳ Terlalu banyak percobaan. Tunggu 5-10 menit lalu coba lagi.'
      } else if (errorMsg.includes('Too Many Requests')) {
        displayMsg = '⏳ Server sibuk. Tunggu sebentar dan coba lagi.'
      }

      toast(displayMsg, 'error', 8000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between">
        <Link
          href="/"
          className="text-primary-dark font-semibold text-lg min-h-0"
          style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}
        >
          🌿 TaniConnect
        </Link>
        <Link href="/login" className="text-btn-sm text-primary-dark hover:underline min-h-0">
          Sudah punya akun?
        </Link>
      </header>

      <div className="px-6 py-6 border-b border-border bg-surface-light">
        <StepIndicator currentStep={currentStep} totalSteps={3} />
      </div>

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        {currentStep === 1 && (
          <RegisterStep1
            defaultValues={state.step1}
            onComplete={handleStep1Complete}
          />
        )}
        {currentStep === 2 && (
          <RegisterStep2
            defaultValues={state.step2}
            onBack={() => setCurrentStep(1)}
            onComplete={handleStep2Complete}
          />
        )}
        {currentStep === 3 && (
          <RegisterRoleStep
            onBack={() => setCurrentStep(2)}
            onComplete={handleStep3Complete}
            loading={loading}
          />
        )}
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <ToastProvider>
      <RegisterFlow />
    </ToastProvider>
  )
}
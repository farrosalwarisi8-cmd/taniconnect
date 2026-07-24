'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegisterStep1 } from './_components/RegisterStep1'
import { RegisterStep2 } from './_components/RegisterStep2'
import { StepIndicator } from './_components/StepIndicator'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import type { RegisterStep1Input, RegisterStep2Input } from '@/lib/validations'
import { normalizePhoneID } from '@/lib/utils'

interface RegisterState {
  step1?: RegisterStep1Input
}

function RegisterFlow() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [state, setState] = useState<RegisterState>({})
  const [loading, setLoading] = useState(false)

  const handleStep1Complete = (data: RegisterStep1Input) => {
    setState(prev => ({ ...prev, step1: data }))
    setCurrentStep(2)
  }

  const handleStep2Complete = async (data: RegisterStep2Input) => {
    if (!state.step1) {
      toast('Data tidak lengkap, silakan ulangi dari awal', 'error')
      setCurrentStep(1)
      return
    }

    setLoading(true)
    try {
      const phone = normalizePhoneID(state.step1.phone)

      // Pakai gmail.com dengan email tag "+" agar valid & unik
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const pseudoEmail = `taniconnect+${phone.replace('+', '')}_${randomSuffix}@gmail.com`

      console.log('DEBUG registrasi:', { phone, pseudoEmail })

      // ─── 1. SIGN UP ─────────────────────────────────────────
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: state.step1.password,
        options: {
          data: {
            full_name: state.step1.fullName,
            phone,
            role: 'pembeli',
          },
        },
      })

      if (authError) {
        console.error('Auth Error:', authError)
        throw authError
      }
      if (!authData.user) throw new Error('Gagal membuat akun')

      console.log('User created:', authData.user.id)

      // ─── 2. CEK SESSION — kalau belum ada, LOGIN MANUAL ─────
      if (!authData.session) {
        console.log('Session belum ada, coba sign in manual...')

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: pseudoEmail,
          password: state.step1.password,
        })

        if (signInError) {
          console.error('Sign In Error:', signInError)
          throw new Error('Akun berhasil dibuat, tapi gagal login. Silakan login manual.')
        }

        console.log('Session created:', !!signInData.session)
      }

      // ─── 3. UPDATE PROFILE dengan data lokasi ────────────────
      const profileUpdate = {
        province: data.province,
        city:     data.city,
        district: data.district,
        address:  data.address,
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Profile Update Error (non-critical):', profileError)
      }

      toast('Registrasi berhasil! Silakan pilih peranmu', 'success', 3000)

      // ─── 4. Redirect + Force reload supaya middleware baca session baru ─
      setTimeout(() => {
        window.location.href = '/pilih-peran'
      }, 500)
    } catch (err: any) {
      console.error('Registration failed:', err)
      const errorMsg = err.message || 'Error tidak diketahui'

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
        <StepIndicator currentStep={currentStep} totalSteps={2} />
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
            defaultValues={undefined}
            onBack={() => setCurrentStep(1)}
            onComplete={handleStep2Complete}
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
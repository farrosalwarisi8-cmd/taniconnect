'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegisterStep1 } from './_components/RegisterStep1'
import { RegisterStep2 } from './_components/RegisterStep2'
import { RegisterStep3 } from './_components/RegisterStep3'
import { StepIndicator } from './_components/StepIndicator'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import type { RegisterStep1Input, RegisterStep2Input } from '@/lib/validations'
import { normalizePhoneID } from '@/lib/utils'

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

  const handleStep3Complete = async (ktpFile: File, landPhotoFile: File | null) => {
    if (!state.step1 || !state.step2) {
      toast('Data tidak lengkap, silakan ulangi dari awal', 'error')
      return
    }

    setLoading(true)
    try {
      const phone = normalizePhoneID(state.step1.phone)
      const pseudoEmail = `${phone.replace('+', '')}@taniconnect.local`

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

      if (authError) throw authError
      if (!authData.user) throw new Error('Gagal membuat akun')

      const userId = authData.user.id

      // Upload KTP
      const ktpExt = ktpFile.name.split('.').pop()
      const ktpPath = `${userId}/ktp-${Date.now()}.${ktpExt}`
      const { error: ktpUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(ktpPath, ktpFile, {
          contentType: ktpFile.type,
          upsert: false,
        })
      if (ktpUploadError) throw ktpUploadError

      let landPath: string | null = null
      if (landPhotoFile) {
        const landExt = landPhotoFile.name.split('.').pop()
        landPath = `${userId}/land-${Date.now()}.${landExt}`
        await supabase.storage
          .from('kyc-documents')
          .upload(landPath, landPhotoFile, {
            contentType: landPhotoFile.type,
            upsert: false,
          })
      }

      // Update profile
      const profileUpdate = {
        province:                state.step2.province,
        city:                    state.step2.city,
        district:                state.step2.district,
        address:                 state.step2.address,
        ktp_storage_path:        ktpPath,
        land_photo_storage_path: landPath,
        kyc_submitted_at:        new Date().toISOString(),
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)

      if (profileError) throw profileError

      toast('Registrasi berhasil! Silakan pilih peranmu', 'success', 5000)
      router.push('/pilih-peran')
    } catch (err: any) {
      console.error(err)
      toast(
        err.message === 'User already registered'
          ? 'Nomor HP sudah terdaftar. Silakan login.'
          : `Gagal daftar: ${err.message ?? 'error tidak diketahui'}`,
        'error',
        6000
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="text-primary-dark font-semibold text-lg min-h-0" style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif" }}>
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
          <RegisterStep3
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
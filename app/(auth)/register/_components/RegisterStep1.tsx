'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { registerStep1Schema, type RegisterStep1Input } from '@/lib/validations'

interface RegisterStep1Props {
  defaultValues?: RegisterStep1Input
  onComplete: (data: RegisterStep1Input) => void
}

export function RegisterStep1({ defaultValues, onComplete }: RegisterStep1Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterStep1Input>({
    resolver: zodResolver(registerStep1Schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-fg-dark mb-2 leading-tight">
          Bikin akun baru 👋
        </h1>
        <p className="text-body text-fg/70">
          Data ini kami butuhkan untuk keamanan akun & transaksi.
        </p>
      </div>

      <Input
        label="Nama Lengkap"
        placeholder="Contoh: Budi Santoso"
        {...register('fullName')}
        error={errors.fullName?.message}
        required
      />

      <Input
        label="Nomor HP"
        leftAddon="+62"
        placeholder="8123456789"
        type="tel"
        inputMode="tel"
        {...register('phone')}
        error={errors.phone?.message}
        hint="Pakai nomor HP aktif — kami akan kirim OTP jika perlu"
        required
      />

      <Input
        label="Password"
        type="password"
        placeholder="Minimal 8 karakter"
        {...register('password')}
        error={errors.password?.message}
        hint="Kombinasi huruf besar, kecil, dan angka"
        required
      />

      <Input
        label="Konfirmasi Password"
        type="password"
        placeholder="Ketik ulang password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
        required
      />

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={isSubmitting}
        rightIcon={<span>→</span>}
      >
        Lanjut
      </Button>

      <p className="text-caption text-fg/60 text-center">
        Dengan lanjut, kamu setuju dengan{' '}
        <a href="#" className="text-primary-dark underline">Syarat & Ketentuan</a>{' '}
        serta{' '}
        <a href="#" className="text-primary-dark underline">Kebijakan Privasi (UU PDP)</a>.
      </p>
    </form>
  )
}
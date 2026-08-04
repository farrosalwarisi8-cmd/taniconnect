'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { registerStep2Schema, type RegisterStep2Input } from '@/lib/validations'

const PROVINCES = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Banten', 'Bali', 'Sumatera Utara', 'Sumatera Barat', 'Riau',
  'Sumatera Selatan', 'Lampung', 'Kalimantan Barat', 'Kalimantan Timur',
  'Sulawesi Selatan', 'Sulawesi Utara', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur', 'Papua',
]

interface RegisterStep2Props {
  defaultValues?: RegisterStep2Input
  onBack:     () => void
  onComplete: (data: RegisterStep2Input) => void
  loading?:   boolean
}

export function RegisterStep2({ defaultValues, onBack, onComplete, loading }: RegisterStep2Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterStep2Input>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-fg-dark mb-2 leading-tight">
          Kamu tinggal di mana? 📍
        </h1>
        <p className="text-body text-fg/70">
          Lokasi membantu kami menampilkan produk terdekat & hitung ongkir.
        </p>
      </div>

      {/* Provinsi */}
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor="province" className="text-sm font-semibold text-fg">
          Provinsi <span className="text-error">*</span>
        </label>
        <select
          id="province"
          {...register('province')}
          className="bg-white border border-border rounded-sm px-4 py-3 text-base min-h-[48px] focus:outline-none focus:border-primary focus:shadow-focus"
          defaultValue=""
        >
          <option value="" disabled>Pilih provinsi</option>
          {PROVINCES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {errors.province && (
          <p className="text-caption text-error">⚠ {errors.province.message}</p>
        )}
      </div>

      <Input
        label="Kabupaten/Kota"
        placeholder="Contoh: Kabupaten Brebes"
        {...register('city')}
        error={errors.city?.message}
        required
      />

      <Input
        label="Kecamatan"
        placeholder="Contoh: Larangan"
        {...register('district')}
        error={errors.district?.message}
        required
      />

      <div className="flex flex-col gap-2 w-full">
        <label htmlFor="address" className="text-sm font-semibold text-fg">
          Alamat Lengkap <span className="text-error">*</span>
        </label>
        <textarea
          id="address"
          {...register('address')}
          placeholder="Nama desa, RT/RW, patokan..."
          rows={3}
          className="bg-white border border-border rounded-sm px-4 py-3 text-base min-h-[100px] focus:outline-none focus:border-primary focus:shadow-focus resize-y"
        />
        {errors.address && (
          <p className="text-caption text-error">⚠ {errors.address.message}</p>
        )}
      </div>

      {/* Info verifikasi KTP nanti */}
      <Badge variant="info" size="md" icon={<span>ℹ️</span>}>
        Verifikasi KTP bisa dilakukan setelah login dari halaman profil
      </Badge>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          leftIcon={<span>←</span>}
          disabled={loading}
        >
          Kembali
        </Button>
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
        >
          Lanjut
        </Button>
      </div>

      <p className="text-caption text-fg/60 text-center">
        Dengan mendaftar, kamu setuju dengan{' '}
        <a href="#" className="text-primary-dark underline">Syarat & Ketentuan</a>{' '}
        serta{' '}
        <a href="#" className="text-primary-dark underline">Kebijakan Privasi</a>.
      </p>
    </form>
  )
}
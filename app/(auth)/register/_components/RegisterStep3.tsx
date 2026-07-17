'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { ktpUploadSchema } from '@/lib/validations'

interface RegisterStep3Props {
  onBack:     () => void
  onComplete: (ktpFile: File, landPhotoFile: File | null) => void
  loading:    boolean
}

export function RegisterStep3({ onBack, onComplete, loading }: RegisterStep3Props) {
  const { toast } = useToast()
  const [ktpFile, setKtpFile]     = useState<File | null>(null)
  const [landFile, setLandFile]   = useState<File | null>(null)
  const [ktpPreview, setKtpPreview]   = useState<string | null>(null)
  const [landPreview, setLandPreview] = useState<string | null>(null)

  const ktpInputRef  = useRef<HTMLInputElement>(null)
  const landInputRef = useRef<HTMLInputElement>(null)

  const validateAndSetFile = (
    file: File,
    setFile: (f: File) => void,
    setPreview: (url: string) => void
  ): boolean => {
    const result = ktpUploadSchema.safeParse({ file })
    if (!result.success) {
      toast(result.error.errors[0].message, 'error')
      return false
    }

    setFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    return true
  }

  const handleKtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file, setKtpFile, setKtpPreview)
  }

  const handleLandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file, setLandFile, setLandPreview)
  }

  const handleSubmit = () => {
    if (!ktpFile) {
      toast('Foto KTP wajib diunggah', 'error')
      return
    }
    onComplete(ktpFile, landFile)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-fg-dark mb-2 leading-tight">
          Verifikasi Identitas 🪪
        </h1>
        <p className="text-body text-fg/70">
          Unggah foto KTP agar akunmu bisa dipakai bertransaksi dengan aman.
        </p>
      </div>

      {/* Upload KTP */}
      <div>
        <label className="text-sm font-semibold text-fg mb-3 block">
          Foto KTP <span className="text-error">*</span>
        </label>

        <button
          type="button"
          onClick={() => ktpInputRef.current?.click()}
          className={cn(
            'w-full rounded-DEFAULT p-8 flex flex-col items-center justify-center gap-3 transition-all',
            'border-2 border-dashed cursor-pointer',
            ktpPreview
              ? 'border-primary bg-green-50'
              : 'border-primary-light bg-green-50/40 hover:bg-green-50 hover:border-primary',
          )}
          style={{ minHeight: 200 }}
        >
          {ktpPreview ? (
            <>
              <img
                src={ktpPreview}
                alt="Preview KTP"
                className="max-h-40 rounded-lg object-contain"
              />
              <div className="flex items-center gap-2">
                <span className="text-primary-dark font-semibold">✓ Foto KTP terunggah</span>
              </div>
              <p className="text-caption text-fg/60">Ketuk untuk ganti foto</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary-dark text-3xl">📷</span>
              </div>
              <h3 className="text-h3 text-fg-dark">Ketuk untuk upload foto KTP</h3>
              <p className="text-caption text-fg/60">JPG/PNG/WEBP, maksimal 5MB</p>
            </>
          )}
        </button>

        <input
          ref={ktpInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleKtpChange}
          className="hidden"
        />
      </div>

      {/* Upload Foto Lahan (opsional) */}
      <div>
        <label className="text-sm font-semibold text-fg mb-3 block">
          Foto Lahan <span className="text-fg/50 font-normal">(opsional, untuk petani)</span>
        </label>

        <button
          type="button"
          onClick={() => landInputRef.current?.click()}
          className={cn(
            'w-full rounded-DEFAULT p-6 flex flex-col items-center justify-center gap-2 transition-all',
            'border-2 border-dashed cursor-pointer',
            landPreview
              ? 'border-primary bg-green-50'
              : 'border-border bg-surface-light hover:border-primary-light',
          )}
          style={{ minHeight: 140 }}
        >
          {landPreview ? (
            <>
              <img
                src={landPreview}
                alt="Preview Lahan"
                className="max-h-28 rounded-lg object-contain"
              />
              <span className="text-primary-dark text-sm">✓ Foto lahan terunggah</span>
            </>
          ) : (
            <>
              <span className="text-3xl">🏞️</span>
              <p className="text-body text-fg/70">Tambah foto lahan</p>
            </>
          )}
        </button>

        <input
          ref={landInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLandChange}
          className="hidden"
        />
      </div>

      {/* Info keamanan */}
      <Badge variant="verified" size="md" icon={<span>🔒</span>}>
        Data kamu terenkripsi & disimpan di storage privat
      </Badge>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} leftIcon={<span>←</span>} disabled={loading}>
          Kembali
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          fullWidth
          size="lg"
          loading={loading}
        >
          Selesai & Daftar
        </Button>
      </div>

      <p className="text-caption text-fg/60 text-center">
        Verifikasi biasanya membutuhkan 1×24 jam kerja. Kamu tetap bisa jelajah marketplace sambil menunggu.
      </p>
    </div>
  )
}
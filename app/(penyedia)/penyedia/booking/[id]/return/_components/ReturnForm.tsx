'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import {
  bookingReturnSchema,
  bookingPhotoUploadSchema,
  type BookingReturnInput,
} from '@/lib/validations'
import { formatRupiah, cn } from '@/lib/utils'

interface Props {
  bookingId: string
  equipmentName: string
  depositAmount: number
  userId: string
}

interface PhotoPreview {
  file: File
  url: string
}

function ReturnFormInner({ bookingId, equipmentName, depositAmount, userId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [photo, setPhoto] = useState<PhotoPreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingReturnInput>({
    resolver: zodResolver(bookingReturnSchema),
    defaultValues: {
      deposit_decision: 'released',
      deposit_refund_amount: depositAmount,
      return_notes: '',
    },
  })

  const depositDecision = watch('deposit_decision')
  const refundAmount = watch('deposit_refund_amount') ?? 0
  const depositWithheld = depositAmount - refundAmount

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = bookingPhotoUploadSchema.safeParse({ file })
    if (!result.success) {
      toast(result.error.issues[0].message, 'error')
      return
    }

    // Revoke URL lama kalau ada
    if (photo) URL.revokeObjectURL(photo.url)

    setPhoto({
      file,
      url: URL.createObjectURL(file),
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = () => {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
  }

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photo) return null

    setUploading(true)
    try {
      const ext = photo.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/bookings/${bookingId}-after-${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('booking-photos')
        .upload(path, photo.file, {
          contentType: photo.file.type,
          upsert: false,
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Gagal upload foto: ${error.message}`)
      }

      // Return public URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      return `${supabaseUrl}/storage/v1/object/public/booking-photos/${path}`
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: BookingReturnInput) => {
    try {
      // Upload foto dulu (kalau ada)
      let photoUrl: string | null = null
      if (photo) {
        toast('📤 Mengunggah foto kondisi...', 'info', 2000)
        photoUrl = await uploadPhoto()
      }

      // Call API return
      const res = await fetch(`/api/rental-bookings/${bookingId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_decision: data.deposit_decision,
          deposit_refund_amount:
            data.deposit_decision === 'released'
              ? depositAmount
              : data.deposit_refund_amount ?? 0,
          return_notes: data.return_notes || undefined,
          photo_after_url: photoUrl || undefined,
        }),
      })

      const responseData = await res.json()
      if (!res.ok) {
        throw new Error(responseData.error || 'Gagal konfirmasi pengembalian')
      }

      toast(
        data.deposit_decision === 'released'
          ? `✅ Pengembalian dikonfirmasi! Deposit Rp ${depositAmount.toLocaleString('id-ID')} dikembalikan penuh.`
          : `✅ Pengembalian dikonfirmasi! Deposit dipotong Rp ${(depositAmount - (data.deposit_refund_amount ?? 0)).toLocaleString('id-ID')}.`,
        'success',
        5000
      )

      setTimeout(() => {
        router.push('/penyedia/booking')
      }, 1500)
    } catch (err: any) {
      console.error('Submit error:', err)
      toast(err.message ?? 'Gagal konfirmasi', 'error', 6000)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Upload Foto */}
      <Card variant="standard" padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h4 text-fg-dark font-bold">
            📸 Foto Kondisi Setelah Sewa
          </h2>
          <Badge variant={photo ? 'success' : 'neutral'} size="sm">
            {photo ? '1 foto' : 'Belum ada'}
          </Badge>
        </div>
        <p className="text-caption text-fg/60 mb-4">
          Upload 1 foto kondisi alat saat dikembalikan. Foto ini menjadi bukti
          jika ada dispute tentang deposit. Maks 5MB.
        </p>

        {photo ? (
          <div className="relative w-full sm:w-72 aspect-video rounded-btn overflow-hidden border-2 border-border bg-surface group">
            <img
              src={photo.url}
              alt="Kondisi setelah sewa"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-error text-white flex items-center justify-center min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Hapus foto"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-72 aspect-video rounded-btn border-2 border-dashed border-blue-500 bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center transition-colors min-h-0"
            disabled={uploading}
          >
            <span className="text-4xl mb-2">📷</span>
            <span className="text-body text-blue-700 font-semibold">
              Klik untuk Upload Foto
            </span>
            <span className="text-caption text-blue-600 mt-1">
              JPG/PNG/WEBP · Maks 5MB
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </Card>

      {/* Keputusan Deposit */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-2">
          💰 Keputusan Deposit
        </h2>
        <p className="text-caption text-fg/60 mb-4">
          Deposit ditahan sebesar <strong className="text-amber">{formatRupiah(depositAmount)}</strong>.
          Pilih apakah deposit dikembalikan penuh atau ditahan sebagian.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() =>
              setValue('deposit_decision', 'released', { shouldValidate: true })
            }
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              depositDecision === 'released'
                ? 'border-success bg-success/10'
                : 'border-border hover:border-success/50'
            )}
          >
            <div className="text-3xl mb-2">✅</div>
            <p className="font-bold text-fg-dark">Alat Kembali Baik</p>
            <p className="text-caption text-fg/60 mt-1">
              Deposit dikembalikan <strong className="text-success">100%</strong>
            </p>
            <p className="text-caption text-success font-semibold mt-1">
              → Refund: {formatRupiah(depositAmount)}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setValue('deposit_decision', 'refunded', { shouldValidate: true })
            }
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              depositDecision === 'refunded'
                ? 'border-amber bg-amber/10'
                : 'border-border hover:border-amber/50'
            )}
          >
            <div className="text-3xl mb-2">⚠️</div>
            <p className="font-bold text-fg-dark">Ada Kerusakan/Kelambatan</p>
            <p className="text-caption text-fg/60 mt-1">
              Deposit dipotong sebagian atau full
            </p>
            <p className="text-caption text-error font-semibold mt-1">
              → Refund: bisa 0 sampai penuh
            </p>
          </button>
        </div>

        {/* Input refund amount (kalau refunded) */}
        {depositDecision === 'refunded' && (
          <div className="p-4 bg-amber/5 rounded-btn border border-amber/30 space-y-4">
            <Controller
              control={control}
              name="deposit_refund_amount"
              render={({ field }) => (
                <Input
                  label={`Jumlah Refund (max ${formatRupiah(depositAmount)})`}
                  type="number"
                  leftAddon="Rp"
                  placeholder="0"
                  hint={`Sisanya (${formatRupiah(depositWithheld)}) akan ditahan sebagai kompensasi`}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(Number(e.target.value) || 0)
                  }
                  error={errors.deposit_refund_amount?.message}
                  required
                />
              )}
            />

            <div className="p-3 bg-white rounded-btn border border-border grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-caption text-fg/60">Refund ke Penyewa</p>
                <p className="font-bold text-success">
                  {formatRupiah(refundAmount)}
                </p>
              </div>
              <div>
                <p className="text-caption text-fg/60">Ditahan Kamu</p>
                <p className="font-bold text-error">
                  {formatRupiah(depositWithheld)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Catatan */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-2">
          📝 Catatan Pengembalian
        </h2>
        <p className="text-caption text-fg/60 mb-3">
          {depositDecision === 'refunded'
            ? 'Jelaskan alasan pemotongan deposit (contoh: baret di body, oli bocor, dll)'
            : 'Catatan tambahan (opsional)'}
        </p>
        <textarea
          {...register('return_notes')}
          placeholder="Contoh: Alat kembali dalam kondisi baik, tidak ada kerusakan."
          rows={4}
          className="w-full bg-white border border-border rounded-btn px-4 py-3 text-base focus:outline-none focus:border-primary resize-y"
          maxLength={1000}
        />
        {errors.return_notes && (
          <p className="text-caption text-error mt-1">
            ⚠ {errors.return_notes.message}
          </p>
        )}
      </Card>

      {/* Summary Card */}
      <Card variant="standard" padding="lg" className="!bg-primary/5">
        <h3 className="text-h4 text-fg-dark font-bold mb-3">
          📋 Ringkasan
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-fg/70">Alat:</span>
            <span className="font-semibold text-fg-dark">{equipmentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg/70">Deposit Awal:</span>
            <span className="font-semibold text-amber">
              {formatRupiah(depositAmount)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-fg/70">Refund ke Penyewa:</span>
            <span className="font-bold text-success text-base">
              {formatRupiah(
                depositDecision === 'released' ? depositAmount : refundAmount
              )}
            </span>
          </div>
          {depositDecision === 'refunded' && depositWithheld > 0 && (
            <div className="flex justify-between">
              <span className="text-fg/70">Ditahan Kamu:</span>
              <span className="font-bold text-error">
                {formatRupiah(depositWithheld)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Submit */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sticky bottom-0 bg-surface pt-2 pb-4 sm:static">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting || uploading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isSubmitting || uploading}
        >
          {uploading
            ? '📤 Mengunggah foto...'
            : '✅ Konfirmasi Pengembalian'}
        </Button>
      </div>
    </form>
  )
}

export function ReturnForm(props: Props) {
  return (
    <ToastProvider>
      <ReturnFormInner {...props} />
    </ToastProvider>
  )
}
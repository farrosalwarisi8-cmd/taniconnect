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
  equipmentFormSchema,
  equipmentImageUploadSchema,
  type EquipmentFormInput,
} from '@/lib/validations'
import { formatRupiah, cn } from '@/lib/utils'

interface ExistingImage {
  path: string
  url: string
}

interface InitialEquipmentData {
  id: string
  name: string
  category: string
  description: string | null
  price_rent: number | null
  price_sell: number | null
  deposit_amount: number | null
  stock: number
  province: string
  city: string
  condition_note: string | null
  image_paths: string[]
}

interface Props {
  userId: string
  defaultProvince: string
  defaultCity: string
  initialData?: InitialEquipmentData | null
}

const CATEGORIES = [
  { value: 'traktor',      label: '🚜 Traktor' },
  { value: 'mesin_panen',  label: '🌾 Mesin Panen' },
  { value: 'pompa_air',    label: '💧 Pompa Air' },
  { value: 'drone',        label: '🚁 Drone' },
  { value: 'pupuk',        label: '💊 Pupuk' },
  { value: 'bibit',        label: '🌱 Bibit' },
  { value: 'pestisida',    label: '🧪 Pestisida' },
  { value: 'lainnya',      label: '📦 Lainnya' },
] as const

const PROVINCES = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Banten', 'Bali', 'Sumatera Utara', 'Sumatera Barat', 'Riau',
  'Sumatera Selatan', 'Lampung', 'Kalimantan Barat', 'Kalimantan Timur',
  'Sulawesi Selatan', 'Sulawesi Utara', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur', 'Papua',
]

interface ImagePreview {
  file: File
  url: string
  id: string
}

function AlatFormInner({ userId, defaultProvince, defaultCity, initialData }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const isEditMode = !!initialData

  // ─── Detect initial offer_type dari initialData ─────────────
  const getInitialOfferType = (): 'rent' | 'sell' | 'both' => {
    if (!initialData) return 'rent'
    const hasRent = !!initialData.price_rent
    const hasSell = !!initialData.price_sell
    if (hasRent && hasSell) return 'both'
    if (hasSell) return 'sell'
    return 'rent'
  }

  const [images, setImages] = useState<ImagePreview[]>([])
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(
    initialData?.image_paths
      ? initialData.image_paths.map((path) => ({
          path,
          url: path.startsWith('http')
            ? path
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/equipment-images/${path}`,
        }))
      : []
  )
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormInput>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          category: initialData.category as any,
          description: initialData.description ?? '',
          offer_type: getInitialOfferType(),
          price_rent: initialData.price_rent ? Number(initialData.price_rent) : undefined,
          price_sell: initialData.price_sell ? Number(initialData.price_sell) : undefined,
          deposit_amount: initialData.deposit_amount ? Number(initialData.deposit_amount) : undefined,
          stock: Number(initialData.stock),
          province: initialData.province,
          city: initialData.city,
          condition_note: initialData.condition_note ?? '',
        }
      : {
          name: '',
          category: 'traktor',
          description: '',
          offer_type: 'rent',
          stock: 1,
          province: defaultProvince,
          city: defaultCity,
          deposit_amount: 0,
          condition_note: '',
        },
  })

  const offerType = watch('offer_type')
  const isRentMode = offerType === 'rent' || offerType === 'both'
  const isSellMode = offerType === 'sell' || offerType === 'both'

  const removeExistingImage = (path: string) => {
    setExistingImages((prev) => prev.filter((i) => i.path !== path))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])

    const totalImages = images.length + existingImages.length + files.length
    if (totalImages > 5) {
      toast('Maksimal 5 foto per alat', 'warning')
      return
    }

    const validImages: ImagePreview[] = []
    for (const file of files) {
      const result = equipmentImageUploadSchema.safeParse({ file })
      if (!result.success) {
        toast(`${file.name}: ${result.error.issues[0].message}`, 'error')
        continue
      }
      validImages.push({
        file,
        url: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
    }

    setImages((prev) => [...prev, ...validImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return []

    setUploading(true)
    const uploadedPaths: string[] = []

    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const ext = img.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${userId}/equipment/${Date.now()}-${i}.${ext}`

        const { error } = await supabase.storage
          .from('equipment-images')
          .upload(path, img.file, {
            contentType: img.file.type,
            upsert: false,
          })

        if (error) {
          console.error('Upload error:', error)
          throw new Error(`Gagal upload foto ${i + 1}: ${error.message}`)
        }

        uploadedPaths.push(path)
      }
    } finally {
      setUploading(false)
    }

    return uploadedPaths
  }

  const onSubmit = async (data: EquipmentFormInput) => {
    try {
      let newImagePaths: string[] = []
      if (images.length > 0) {
        toast(`Mengunggah ${images.length} foto...`, 'info', 2000)
        newImagePaths = await uploadImages()
      }

      const allImagePaths = [
        ...existingImages.map((i) => i.path),
        ...newImagePaths,
      ]

      // Handle price sesuai offer_type
      const finalPriceRent = isRentMode ? data.price_rent ?? null : null
      const finalPriceSell = isSellMode ? data.price_sell ?? null : null
      const finalDeposit = isRentMode ? data.deposit_amount ?? 0 : null

      const equipmentPayload = {
        name: data.name.trim(),
        category: data.category,
        description: data.description?.trim() || null,
        price_rent: finalPriceRent,
        price_sell: finalPriceSell,
        deposit_amount: finalDeposit,
        stock: data.stock,
        province: data.province,
        city: data.city,
        condition_note: data.condition_note?.trim() || null,
        image_paths: allImagePaths,
      }

      let equipmentId: string | undefined = initialData?.id

      if (isEditMode && initialData) {
        // MODE EDIT
        const res = await fetch(`/api/equipment/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(equipmentPayload),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Gagal update alat')
        }

        toast('✅ Alat berhasil diperbarui!', 'success', 3000)
        equipmentId = initialData.id
      } else {
        // MODE CREATE
        const insertPayload = {
          ...equipmentPayload,
          owner_id: userId,
          is_available: true,
        }

        const { data: inserted, error: insertError } = await supabase
          .from('equipment')
          .insert(insertPayload)
          .select('id')
          .maybeSingle()

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error(insertError.message || 'Gagal menyimpan alat')
        }

        equipmentId = (inserted as { id: string } | null)?.id

        // Audit log
        if (equipmentId) {
          try {
            await fetch('/api/equipment/log-created', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                equipment_id: equipmentId,
                equipment_name: data.name,
                offer_type: data.offer_type,
              }),
            })
          } catch (err) {
            console.warn('Audit log failed:', err)
          }
        }

        toast('✅ Alat berhasil didaftarkan!', 'success', 3000)
      }

      setTimeout(() => {
        router.push('/penyedia/alat')
      }, 800)
    } catch (err: any) {
      console.error('Submit error:', err)
      toast(err.message ?? 'Gagal menyimpan alat', 'error', 6000)
    }
  }

  const totalImages = existingImages.length + images.length

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* Foto Alat */}
      <Card variant="standard" padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h4 text-fg-dark font-bold">📸 Foto Alat/Bahan</h2>
          <Badge variant={totalImages > 0 ? 'success' : 'neutral'} size="sm">
            {totalImages}/5
          </Badge>
        </div>
        <p className="text-caption text-fg/60 mb-4">
          Upload 1-5 foto alat dari berbagai sudut. Foto berkualitas meningkatkan
          kepercayaan penyewa. Maks 5MB per foto.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {/* Foto Existing */}
          {existingImages.map((img, idx) => (
            <div
              key={img.path}
              className="relative aspect-square rounded-btn overflow-hidden border-2 border-border bg-surface group"
            >
              <img src={img.url} alt={`Foto lama ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && images.length === 0 && (
                <div className="absolute top-2 left-2">
                  <Badge variant="success" size="sm">🌟 Utama</Badge>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="info" size="sm">Tersimpan</Badge>
              </div>
              <button
                type="button"
                onClick={() => removeExistingImage(img.path)}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-error text-white flex items-center justify-center min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Hapus foto"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Foto Baru */}
          {images.map((img, idx) => {
            const isFirst = existingImages.length === 0 && idx === 0
            return (
              <div
                key={img.id}
                className="relative aspect-square rounded-btn overflow-hidden border-2 border-border bg-surface group"
              >
                <img src={img.url} alt={`Foto baru ${idx + 1}`} className="w-full h-full object-cover" />
                {isFirst && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="success" size="sm">🌟 Utama</Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant="warning" size="sm">Baru</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-error text-white flex items-center justify-center min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Hapus foto"
                >
                  ✕
                </button>
              </div>
            )
          })}

          {/* Tombol Tambah */}
          {totalImages < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-btn border-2 border-dashed border-blue-500 bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center transition-colors min-h-0"
              disabled={uploading}
            >
              <span className="text-3xl mb-1">📷</span>
              <span className="text-caption text-blue-700 font-semibold">
                Tambah Foto
              </span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleImageChange}
          className="hidden"
        />
      </Card>

      {/* Info Dasar */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">📋 Informasi Alat/Bahan</h2>

        <div className="space-y-4">
          <Input
            label="Nama Alat/Bahan"
            placeholder="Contoh: Traktor Mini Kubota B2140"
            {...register('name')}
            error={errors.name?.message}
            required
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-sm font-semibold text-fg">
              Kategori <span className="text-error">*</span>
            </label>
            <select
              id="category"
              {...register('category')}
              className="bg-white border border-border rounded-btn px-4 py-3 text-base min-h-[48px] focus:outline-none focus:border-primary focus:shadow-focus"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-caption text-error">⚠ {errors.category.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-semibold text-fg">
              Deskripsi <span className="text-fg/50 font-normal">(opsional)</span>
            </label>
            <textarea
              id="description"
              {...register('description')}
              placeholder="Spesifikasi, kegunaan, cara pakai, dll..."
              rows={4}
              className="bg-white border border-border rounded-btn px-4 py-3 text-base focus:outline-none focus:border-primary focus:shadow-focus resize-y"
            />
            {errors.description && (
              <p className="text-caption text-error">⚠ {errors.description.message}</p>
            )}
          </div>

          <Controller
            control={control}
            name="stock"
            render={({ field }) => (
              <Input
                label="Jumlah Stok / Unit"
                type="number"
                placeholder="1"
                hint="Berapa unit alat/bahan yang tersedia"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                error={errors.stock?.message}
                required
              />
            )}
          />
        </div>
      </Card>

      {/* Tipe Penawaran */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">🏷️ Tipe Penawaran</h2>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setValue('offer_type', 'rent', { shouldValidate: true })}
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              offerType === 'rent'
                ? 'border-blue-500 bg-blue-50'
                : 'border-border hover:border-blue-300'
            )}
          >
            <div className="text-3xl mb-2">📅</div>
            <p className="font-bold text-fg-dark">Sewa Saja</p>
            <p className="text-caption text-fg/60 mt-1">
              Petani sewa harian
            </p>
          </button>

          <button
            type="button"
            onClick={() => setValue('offer_type', 'sell', { shouldValidate: true })}
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              offerType === 'sell'
                ? 'border-green-500 bg-green-50'
                : 'border-border hover:border-green-300'
            )}
          >
            <div className="text-3xl mb-2">💰</div>
            <p className="font-bold text-fg-dark">Jual Saja</p>
            <p className="text-caption text-fg/60 mt-1">
              Beli langsung
            </p>
          </button>

          <button
            type="button"
            onClick={() => setValue('offer_type', 'both', { shouldValidate: true })}
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              offerType === 'both'
                ? 'border-purple-500 bg-purple-50'
                : 'border-border hover:border-purple-300'
            )}
          >
            <div className="text-3xl mb-2">🔀</div>
            <p className="font-bold text-fg-dark">Sewa & Jual</p>
            <p className="text-caption text-fg/60 mt-1">
              Fleksibel keduanya
            </p>
          </button>
        </div>

        {/* Harga Sewa (kalau rent atau both) */}
        {isRentMode && (
          <div className="space-y-4 p-4 bg-blue-50/50 rounded-btn border border-blue-200 mb-4">
            <p className="text-sm text-fg-dark font-semibold flex items-center gap-2">
              📅 Konfigurasi Sewa
            </p>

            <Controller
              control={control}
              name="price_rent"
              render={({ field }) => (
                <Input
                  label="Harga Sewa per Hari"
                  type="number"
                  leftAddon="Rp"
                  placeholder="500000"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                  error={errors.price_rent?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="deposit_amount"
              render={({ field }) => (
                <Input
                  label="Uang Jaminan / Deposit"
                  type="number"
                  leftAddon="Rp"
                  placeholder="1000000"
                  hint="Ditahan saat sewa, dikembalikan setelah alat balik kondisi baik"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  error={errors.deposit_amount?.message}
                />
              )}
            />
          </div>
        )}

        {/* Harga Jual (kalau sell atau both) */}
        {isSellMode && (
          <div className="space-y-4 p-4 bg-green-50/50 rounded-btn border border-green-200">
            <p className="text-sm text-fg-dark font-semibold flex items-center gap-2">
              💰 Konfigurasi Jual
            </p>

            <Controller
              control={control}
              name="price_sell"
              render={({ field }) => (
                <Input
                  label="Harga Jual Satuan"
                  type="number"
                  leftAddon="Rp"
                  placeholder="25000000"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                  error={errors.price_sell?.message}
                  required
                />
              )}
            />
          </div>
        )}
      </Card>

      {/* Lokasi */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">📍 Lokasi Alat</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="province" className="text-sm font-semibold text-fg">
              Provinsi <span className="text-error">*</span>
            </label>
            <select
              id="province"
              {...register('province')}
              className="bg-white border border-border rounded-btn px-4 py-3 text-base min-h-[48px] focus:outline-none focus:border-primary focus:shadow-focus"
            >
              <option value="">Pilih provinsi</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.province && (
              <p className="text-caption text-error">⚠ {errors.province.message}</p>
            )}
          </div>

          <Input
            label="Kabupaten/Kota"
            placeholder="Kabupaten Sragen"
            {...register('city')}
            error={errors.city?.message}
            required
          />
        </div>
      </Card>

      {/* Kondisi Alat */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">🔧 Kondisi Alat</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="condition_note" className="text-sm font-semibold text-fg">
            Catatan Kondisi <span className="text-fg/50 font-normal">(opsional)</span>
          </label>
          <textarea
            id="condition_note"
            {...register('condition_note')}
            placeholder="Contoh: Traktor kondisi 90%, baru service, cat masih mengkilap, siap pakai untuk lahan 2-5 hektar."
            rows={3}
            className="bg-white border border-border rounded-btn px-4 py-3 text-base focus:outline-none focus:border-primary focus:shadow-focus resize-y"
          />
          {errors.condition_note && (
            <p className="text-caption text-error">⚠ {errors.condition_note.message}</p>
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
          className="!bg-gradient-to-r !from-blue-500 !to-cyan-600 hover:!from-blue-600 hover:!to-cyan-700"
        >
          {uploading
            ? '📤 Mengunggah foto...'
            : isEditMode
            ? '💾 Simpan Perubahan'
            : '✅ Daftarkan Alat'}
        </Button>
      </div>
    </form>
  )
}

export function AlatForm(props: Props) {
  return (
    <ToastProvider>
      <AlatFormInner {...props} />
    </ToastProvider>
  )
}
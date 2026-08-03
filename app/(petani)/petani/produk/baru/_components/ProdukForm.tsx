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
import { productFormSchema, productImageUploadSchema, type ProductFormInput } from '@/lib/validations'
import { formatRupiah, cn } from '@/lib/utils'

interface Props {
  userId: string
  defaultProvince: string
  defaultCity: string
}

const CATEGORIES = [
  { value: 'sayuran',    label: '🥬 Sayuran' },
  { value: 'buah',       label: '🍎 Buah' },
  { value: 'beras_padi', label: '🌾 Beras & Padi' },
  { value: 'rempah',     label: '🌶️ Rempah' },
  { value: 'lainnya',    label: '📦 Lainnya' },
] as const

const COMMON_UNITS = ['kg', 'gram', 'ikat', 'buah', 'pack', 'karung', 'liter']

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

function ProdukFormInner({ userId, defaultProvince, defaultCity }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [images, setImages] = useState<ImagePreview[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      category: 'sayuran',
      description: '',
      unit: 'kg',
      is_auction: false,
      province: defaultProvince,
      city: defaultCity,
      price_per_unit: 0,
      stock_quantity: 0,
    },
  })

  const isAuction = watch('is_auction')
  const priceValue = watch('price_per_unit')
  const stockValue = watch('stock_quantity')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])

    if (images.length + files.length > 5) {
      toast('Maksimal 5 foto per produk', 'warning')
      return
    }

    const validImages: ImagePreview[] = []
    for (const file of files) {
      const result = productImageUploadSchema.safeParse({ file })
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

    setImages(prev => [...prev, ...validImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter(i => i.id !== id)
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
        const path = `${userId}/products/${Date.now()}-${i}.${ext}`

        const { error } = await supabase.storage
          .from('product-images')
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

  const onSubmit = async (data: ProductFormInput) => {
    try {
      let imagePaths: string[] = []
      if (images.length > 0) {
        toast(`Mengunggah ${images.length} foto...`, 'info', 2000)
        imagePaths = await uploadImages()
      }

      if (!userId) {
        throw new Error('Session tidak valid. Silakan login ulang.')
      }

      const productInsert = {
        seller_id: userId,
        name: data.name.trim(),
        category: data.category,
        description: data.description?.trim() || null,
        price_per_unit: data.price_per_unit,
        unit: data.unit.trim(),
        stock_quantity: data.stock_quantity,
        image_paths: imagePaths,
        province: data.province,
        city: data.city,
        harvest_date: data.harvest_date || null,
        is_auction: data.is_auction,
        auction_end_time: data.is_auction ? data.auction_end_time : null,
        current_bid: data.is_auction ? data.price_per_unit : null,
        min_bid_increment: data.is_auction ? data.min_bid_increment : null,
        status: 'active' as const,
      }

      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert(productInsert)
        .select('id')
        .maybeSingle()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(insertError.message || 'Gagal menyimpan produk')
      }

      const productId = (inserted as { id: string } | null)?.id

      if (productId) {
        try {
          await fetch('/api/product/log-created', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: productId,
              product_name: data.name,
              is_auction: data.is_auction,
            }),
          })
        } catch (err) {
          console.warn('Audit log failed:', err)
        }
      }

      toast('✅ Produk berhasil dibuat!', 'success', 3000)

      setTimeout(() => {
        if (productId) {
          router.push(`/pembeli/produk/${productId}`)
        } else {
          router.push('/petani/produk')
        }
      }, 800)
    } catch (err: any) {
      console.error('Submit error:', err)
      toast(err.message ?? 'Gagal membuat produk', 'error', 6000)
    }
  }

  const totalValue = (priceValue || 0) * (stockValue || 0)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Upload Foto */}
      <Card variant="standard" padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h4 text-fg-dark font-bold">📸 Foto Produk</h2>
          <Badge variant={images.length > 0 ? 'success' : 'neutral'} size="sm">
            {images.length}/5
          </Badge>
        </div>
        <p className="text-caption text-fg/60 mb-4">
          Upload 1-5 foto produk. Foto pertama akan jadi thumbnail utama.
          Maks 3MB per foto (JPG/PNG/WEBP).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-btn overflow-hidden border-2 border-border bg-surface group"
            >
              <img src={img.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <div className="absolute top-2 left-2">
                  <Badge variant="success" size="sm">🌟 Utama</Badge>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-error text-white flex items-center justify-center min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Hapus foto"
              >
                ✕
              </button>
            </div>
          ))}

          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-btn border-2 border-dashed border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center transition-colors min-h-0"
              disabled={uploading}
            >
              <span className="text-3xl mb-1">📷</span>
              <span className="text-caption text-primary-dark font-semibold">
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
        <h2 className="text-h4 text-fg-dark font-bold mb-4">📋 Informasi Produk</h2>

        <div className="space-y-4">
          <Input
            label="Nama Produk"
            placeholder="Contoh: Cabai Merah Keriting Segar"
            {...register('name')}
            error={errors.name?.message}
            required
          />

          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="category" className="text-sm font-semibold text-fg">
              Kategori <span className="text-error">*</span>
            </label>
            <select
              id="category"
              {...register('category')}
              className="bg-white border border-border rounded-btn px-4 py-3 text-base min-h-[48px] focus:outline-none focus:border-primary focus:shadow-focus"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-caption text-error">⚠ {errors.category.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="description" className="text-sm font-semibold text-fg">
              Deskripsi <span className="text-fg/50 font-normal">(opsional)</span>
            </label>
            <textarea
              id="description"
              {...register('description')}
              placeholder="Ceritakan kualitas, asal, cara panen, dll..."
              rows={4}
              className="bg-white border border-border rounded-btn px-4 py-3 text-base focus:outline-none focus:border-primary focus:shadow-focus resize-y"
            />
            {errors.description && (
              <p className="text-caption text-error">⚠ {errors.description.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Harga & Stok */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">💰 Harga & Stok</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="price_per_unit"
            render={({ field }) => (
              <Input
                label="Harga per Satuan"
                type="number"
                leftAddon="Rp"
                placeholder="10000"
                value={field.value || ''}
                onChange={e => field.onChange(Number(e.target.value) || 0)}
                error={errors.price_per_unit?.message}
                required
              />
            )}
          />

          <Controller
            control={control}
            name="stock_quantity"
            render={({ field }) => (
              <Input
                label="Stok Tersedia"
                type="number"
                placeholder="50"
                value={field.value || ''}
                onChange={e => field.onChange(Number(e.target.value) || 0)}
                error={errors.stock_quantity?.message}
                required
              />
            )}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-fg mb-2 block">
            Satuan <span className="text-error">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_UNITS.map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setValue('unit', u, { shouldValidate: true })}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-sm transition-all min-h-0',
                  watch('unit') === u
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-border text-fg hover:border-primary-light'
                )}
              >
                {u}
              </button>
            ))}
          </div>
          <Input
            placeholder="Atau ketik satuan lain (contoh: peti)"
            {...register('unit')}
            error={errors.unit?.message}
          />
        </div>

        {totalValue > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-btn border border-primary-light">
            <p className="text-caption text-fg/60 mb-1">💵 Total Nilai Stok</p>
            <p className="text-h4 text-primary-dark font-bold">
              {formatRupiah(totalValue)}
            </p>
          </div>
        )}
      </Card>

      {/* Lokasi */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">📍 Lokasi Produk</h2>

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
            placeholder="Kabupaten Brebes"
            {...register('city')}
            error={errors.city?.message}
            required
          />
        </div>

        <div className="mt-4">
          <Input
            label="Tanggal Panen"
            hint="Opsional — bantu pembeli tahu seberapa segar produkmu"
            type="date"
            {...register('harvest_date')}
            error={errors.harvest_date?.message}
          />
        </div>
      </Card>

      {/* Tipe Penjualan */}
      <Card variant="standard" padding="lg">
        <h2 className="text-h4 text-fg-dark font-bold mb-4">🏷️ Tipe Penjualan</h2>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setValue('is_auction', false, { shouldValidate: true })}
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              !isAuction
                ? 'border-primary bg-green-50'
                : 'border-border hover:border-primary-light'
            )}
          >
            <div className="text-3xl mb-2">💵</div>
            <p className="font-bold text-fg-dark">Jual Langsung</p>
            <p className="text-caption text-fg/60 mt-1">
              Pembeli langsung beli di harga tetap
            </p>
          </button>

          <button
            type="button"
            onClick={() => setValue('is_auction', true, { shouldValidate: true })}
            className={cn(
              'p-4 rounded-btn border-2 text-left transition-all min-h-0',
              isAuction
                ? 'border-primary bg-green-50'
                : 'border-border hover:border-primary-light'
            )}
          >
            <div className="text-3xl mb-2">🔨</div>
            <p className="font-bold text-fg-dark">Lelang Mini</p>
            <p className="text-caption text-fg/60 mt-1">
              Pembeli tawar-menawar dengan batas waktu
            </p>
          </button>
        </div>

        {isAuction && (
          <div className="space-y-4 p-4 bg-amber/5 rounded-btn border border-amber/30">
            <p className="text-caption text-fg-dark">
              💡 <strong>Harga di atas akan jadi harga awal lelang.</strong>{' '}
              Pembeli hanya bisa menawar di atas harga ini.
            </p>

            <Input
              label="Tanggal & Waktu Berakhir Lelang"
              type="datetime-local"
              hint="Minimal 1 jam dari sekarang"
              {...register('auction_end_time')}
              error={errors.auction_end_time?.message}
              required
            />

            <Controller
              control={control}
              name="min_bid_increment"
              render={({ field }) => (
                <Input
                  label="Kelipatan Bid Minimum"
                  type="number"
                  leftAddon="Rp"
                  placeholder="1000"
                  hint="Berapa minimum tawaran naik dari bid sebelumnya"
                  value={field.value || ''}
                  onChange={e => field.onChange(Number(e.target.value) || undefined)}
                  error={errors.min_bid_increment?.message}
                />
              )}
            />
          </div>
        )}
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
          {uploading ? '📤 Mengunggah foto...' : '✅ Buat Listing Produk'}
        </Button>
      </div>
    </form>
  )
}

export function ProdukForm(props: Props) {
  return (
    <ToastProvider>
      <ProdukFormInner {...props} />
    </ToastProvider>
  )
}
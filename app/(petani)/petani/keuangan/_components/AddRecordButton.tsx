'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { financialRecordSchema, type FinancialRecordInput } from '@/lib/validations'
import { formatRupiah } from '@/lib/utils'

const EXPENSE_CATEGORIES = [
  { value: 'bibit',        label: '🌱 Bibit' },
  { value: 'pupuk',        label: '💊 Pupuk' },
  { value: 'pestisida',    label: '🧪 Pestisida' },
  { value: 'tenaga_kerja', label: '👷 Tenaga Kerja' },
  { value: 'sewa_lahan',   label: '🏞️ Sewa Lahan' },
  { value: 'lainnya',      label: '📝 Lainnya' },
]

function AddRecordForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FinancialRecordInput>({
    resolver: zodResolver(financialRecordSchema),
    defaultValues: {
      record_type:    'expense',
      category:       'bibit',
      season_label:   `Musim ${new Date().getFullYear()}`,
      season_year:    new Date().getFullYear(),
      quantity:       1,
      unit:           'karung',
      price_per_unit: 0,
      recorded_at:    new Date().toISOString().split('T')[0],
    },
  })

  const quantity = watch('quantity')
  const price = watch('price_per_unit')
  const total = (Number(quantity) || 0) * (Number(price) || 0)

  const onSubmit = async (data: FinancialRecordInput) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session tidak ditemukan')

      const { error } = await supabase.from('financial_records').insert({
        ...data,
        farmer_id: user.id,
        quantity:  Number(data.quantity),
        price_per_unit: Number(data.price_per_unit),
      } as any)

      if (error) throw error

      toast('Catatan berhasil disimpan!', 'success')
      onClose()
      router.refresh()
    } catch (err: any) {
      toast(err.message ?? 'Gagal simpan', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Kategori */}
      <div>
        <label className="text-sm font-semibold text-fg mb-2 block">Kategori</label>
        <select
          {...register('category')}
          className="w-full bg-white border border-border rounded-sm px-4 py-3 text-base min-h-[48px] focus:outline-none focus:border-primary focus:shadow-focus"
        >
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <Input
        label="Nama Item"
        placeholder="Contoh: Pupuk Urea"
        {...register('item_name')}
        error={errors.item_name?.message}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Jumlah"
          type="number"
          step="0.01"
          {...register('quantity', { valueAsNumber: true })}
          error={errors.quantity?.message}
          required
        />
        <Input
          label="Satuan"
          placeholder="karung / kg / liter"
          {...register('unit')}
          error={errors.unit?.message}
          required
        />
      </div>

      <Input
        label="Harga per Satuan"
        type="number"
        leftAddon="Rp"
        placeholder="0"
        {...register('price_per_unit', { valueAsNumber: true })}
        error={errors.price_per_unit?.message}
        required
      />

      {/* Total */}
      <div className="bg-green-50 rounded-sm p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-fg">Total</span>
        <span className="text-h2 text-primary-dark font-bold">{formatRupiah(total)}</span>
      </div>

      <Input
        label="Tanggal"
        type="date"
        {...register('recorded_at')}
        error={errors.recorded_at?.message}
        required
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading} fullWidth>
          Batal
        </Button>
        <Button type="submit" loading={loading} fullWidth>
          Simpan
        </Button>
      </div>
    </form>
  )
}

function AddButton({ label = '➕ Tambah Pengeluaran' }: { label?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>{label}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Catat Pengeluaran"
        size="md"
      >
        <AddRecordForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  )
}

export function AddRecordButton(props: { label?: string }) {
  return (
    <ToastProvider>
      <AddButton {...props} />
    </ToastProvider>
  )
}
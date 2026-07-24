'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EditPembeliProfileModalProps {
  profile: {
    full_name: string
    phone: string
    city: string | null
    province: string | null
    bio: string | null
  }
  onClose: () => void
  onSuccess: (updated: { full_name: string; phone: string; city: string | null; province: string | null; bio: string | null }) => void
}

export function EditPembeliProfileModal({ profile, onClose, onSuccess }: EditPembeliProfileModalProps) {
  const supabase = createClient()
  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    city: profile.city ?? '',
    province: profile.province ?? '',
    bio: profile.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesi habis, silakan login ulang.'); setSaving(false); return }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        bio: form.bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      setError('Gagal menyimpan perubahan. Coba lagi.')
      setSaving(false)
      return
    }

    onSuccess({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      bio: form.bio.trim() || null,
    })
    onClose()
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">Edit Profil</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">Perbarui informasi akun kamu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-semibold transition-colors min-h-0 touch-target-exempt"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2" htmlFor="pb-full-name">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input id="pb-full-name" name="full_name" type="text" required value={form.full_name} onChange={handleChange} className="input-premium" placeholder="Nama lengkap kamu" />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2" htmlFor="pb-phone">
              Nomor Telepon <span className="text-red-500">*</span>
            </label>
            <input id="pb-phone" name="phone" type="tel" required value={form.phone} onChange={handleChange} className="input-premium" placeholder="08xxxxxxxxxx" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2" htmlFor="pb-city">Kota</label>
              <input id="pb-city" name="city" type="text" value={form.city} onChange={handleChange} className="input-premium" placeholder="Kota" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2" htmlFor="pb-province">Provinsi</label>
              <input id="pb-province" name="province" type="text" value={form.province} onChange={handleChange} className="input-premium" placeholder="Provinsi" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors min-h-[48px]">
              Batal
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-60 min-h-[48px]">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

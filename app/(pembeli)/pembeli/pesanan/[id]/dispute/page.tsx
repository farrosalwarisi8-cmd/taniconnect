'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

export default function DisputePage({ params }: { params: { id: string } }) {
  const [desc, setDesc] = useState('')
  const { toast } = useToast()

  const submitDispute = async () => {
    // Logic: Insert ke tabel disputes + set status tx ke 'disputed'
    toast('Laporan diterima. Admin akan meninjau dalam 1x24 jam.', 'success')
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-h2 text-error">Laporkan Masalah ⚠️</h1>
      <p className="text-body text-fg/70">Dana akan kami tahan lebih lama sampai masalah ini selesai.</p>
      
      <div>
        <label className="text-sm font-bold">Apa masalahnya?</label>
        <select className="w-full border p-3 rounded-sm mt-2">
          <option>Barang rusak/busuk</option>
          <option>Jumlah tidak sesuai</option>
          <option>Barang tidak sampai</option>
          <option>Lainnya</option>
        </select>
      </div>

      <textarea 
        className="w-full border p-4 rounded-sm min-h-[150px]" 
        placeholder="Jelaskan secara detail..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      
      <Button variant="danger" fullWidth onClick={submitDispute}>Kirim Laporan</Button>
    </main>
  )
}
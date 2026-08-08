// app/(pembeli)/pembeli/produk/[id]/_components/ChatWithSellerButton.tsx
//
// Tombol "Chat" untuk memulai percakapan dengan penjual.
// Ketika diklik:
//   1. POST ke /api/chat/conversations untuk find-or-create
//   2. Redirect ke /chat/{conversation_id}
//
// Bisa dipakai di 2 konteks:
//   1. Halaman detail produk — dengan productId (chat terkait produk spesifik)
//   2. Halaman toko/penjual — tanpa productId (chat umum ke penjual)

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  sellerId:   string
  productId?: string   // ← Optional: undefined kalau chat dari halaman toko
}

export function ChatWithSellerButton({ sellerId, productId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          // Kirim null (bukan undefined atau string kosong) supaya Zod schema
          // `.optional().nullable()` di API lolos validasi, dan matching
          // conversation existing pakai IS NULL, bukan = NULL.
          product_id: productId || null,
        }),
      })

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Gagal membuka chat: ${err.error ?? 'coba lagi'}`)
        return
      }

      const data = await res.json()
      if (data.conversation_id) {
        router.push(`/chat/${data.conversation_id}`)
      } else {
        alert('Conversation ID tidak diterima dari server')
      }
    } catch {
      alert('Gagal menghubungi server. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 border border-[#ee4d2d] text-[#ee4d2d] text-sm font-medium rounded-sm hover:bg-orange-50 disabled:opacity-50 transition-colors min-h-0"
    >
      {loading ? '...' : '💬 Chat'}
    </button>
  )
}
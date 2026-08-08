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
//
// Ini menggantikan pola sebelumnya (<Link href={`/pembeli/chat/${seller.id}`}>)
// yang menyebabkan semua pembeli masuk thread yang sama dengan seller.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  sellerId:   string
  productId?: string   // ← Optional: undefined kalau chat dari halaman toko
  /**
   * Optional: override styling tombol.
   * Kalau tidak diisi, pakai style default (border orange, teks orange).
   */
  className?: string
  /**
   * Optional: override label tombol.
   * Default: "💬 Chat"
   */
  label?: string
}

export function ChatWithSellerButton({
  sellerId,
  productId,
  className,
  label,
}: Props) {
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
          // Kirim null (bukan undefined) supaya Zod schema
          // `.optional().nullable()` lolos validasi.
          // API akan handle NULL dengan IS NULL matching.
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

  const defaultClassName =
    'px-4 py-2 border border-[#ee4d2d] text-[#ee4d2d] text-sm font-medium rounded-sm hover:bg-orange-50 disabled:opacity-50 transition-colors min-h-0'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className ?? defaultClassName}
    >
      {loading ? '...' : (label ?? '💬 Chat')}
    </button>
  )
}
// app/(pembeli)/pembeli/chat/[id]/page.tsx
//
// ⚠️  ROUTE INI SUDAH TIDAK AKTIF — JANGAN TAMBAH FITUR DI SINI
//
// Riwayat:
//   Route ini adalah sistem chat versi lama yang menggunakan seller_id
//   langsung sebagai "conversation id". Akibatnya semua pembeli yang chat
//   ke penjual yang sama akan masuk thread yang sama — bug privasi serius.
//
// Pengganti:
//   Sistem chat yang benar ada di /chat/[conversation_id] dimana
//   conversation_id adalah UUID unik dari tabel `conversations`
//   (satu row per kombinasi buyer + seller + product).
//
// Entry point yang benar:
//   Tombol "💬 Chat" di halaman produk (/pembeli/produk/[id]) sekarang
//   memakai <ChatWithSellerButton> yang POST ke /api/chat/conversations
//   untuk find-or-create, lalu redirect ke /chat/{conversation_id}.
//
// Kenapa tidak dihapus:
//   Redirect dipertahankan untuk backward compatibility — kalau ada user
//   yang punya bookmark URL lama atau menerima link lama via notifikasi,
//   mereka tidak akan kena halaman 404 mentah.
//
// Kapan boleh dihapus:
//   Setelah dipastikan tidak ada traffic organik ke route ini
//   (cek Supabase Analytics / Vercel logs selama 30 hari).

import { redirect } from 'next/navigation'

// Params masih diterima agar Next.js tidak error saat build,
// tapi tidak dipakai karena kita tidak bisa resolve conversation_id
// yang valid dari seller_id tanpa tahu siapa buyernya
// (info buyer hanya tersedia di client via session, bukan di server component ini).
export default function OldChatRedirectPage() {
  // Arahkan ke marketplace. User bisa mulai chat yang benar dari
  // halaman detail produk manapun menggunakan tombol "💬 Chat".
  redirect('/pembeli/marketplace')
}
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn — utility untuk merge Tailwind classes dengan aman.
 * clsx: conditional class
 * twMerge: override class Tailwind yang konflik
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format rupiah — contoh: 4250000 → "Rp 4.250.000"
 */
export function formatRupiah(amount: number, withPrefix = true): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  return withPrefix ? `Rp ${formatted}` : formatted
}

/**
 * Format tanggal Indonesia
 */
export function formatDateID(
  date: string | Date,
  variant: 'short' | 'long' | 'full' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const formats: Record<typeof variant, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: 'short', year: 'numeric' },
    long:  { day: 'numeric', month: 'long', year: 'numeric' },
    full:  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }

  return new Intl.DateTimeFormat('id-ID', formats[variant]).format(d)
}

/**
 * Format nomor HP Indonesia — normalisasi ke format +62
 */
export function normalizePhoneID(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('0'))    cleaned = '+62' + cleaned.slice(1)
  if (cleaned.startsWith('62'))   cleaned = '+' + cleaned
  if (!cleaned.startsWith('+62')) cleaned = '+62' + cleaned
  return cleaned
}

/**
 * Truncate teks dengan ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

/**
 * Ambil nama tampilan aman dari kolom profil.
 */
export function getDisplayName(value?: string | null, fallback = 'User'): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

/**
 * Ambil inisial dari nama pengguna dengan fallback aman.
 */
export function getInitials(value?: string | null, fallback = 'A'): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback

  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('')
}

/**
 * Ambil nama depan aman dari profil.
 */
export function getFirstName(value?: string | null, fallback = 'User'): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback

  return trimmed.split(/\s+/).filter(Boolean)[0] ?? fallback
}

/**
 * Ambil label aman untuk item yang belum punya nama.
 */
export function getEntityLabel(value?: string | null, fallback = 'Item'): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

/**
 * Normalisasi role pengguna dengan fallback aman.
 */
export function normalizeUserRole(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized === 'penyedia' ? 'penyedia_alat' : normalized
}

/**
 * Sleep helper (untuk debounce, dev testing)
 */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Generate idempotency key
 */
export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Kategori produk ke label Indonesia
 */
export const CATEGORY_LABELS: Record<string, string> = {
  sayuran:    'Sayuran',
  buah:       'Buah',
  beras_padi: 'Beras & Padi',
  rempah:     'Rempah',
  lainnya:    'Lainnya',
}

/**
 * Status transaksi ke label + varian badge
 */
export const TRANSACTION_STATUS_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'neutral' }
> = {
  pending:   { label: 'Menunggu Bayar',    variant: 'warning' },
  paid:      { label: 'Sudah Dibayar',     variant: 'info'    },
  processed: { label: 'Diproses',           variant: 'warning' },
  shipped:   { label: 'Dikirim',            variant: 'info'    },
  delivered: { label: 'Menunggu Konfirmasi', variant: 'warning' },
  completed: { label: 'Selesai',            variant: 'success' },
  disputed:  { label: 'Dispute',            variant: 'error'   },
  cancelled: { label: 'Dibatalkan',         variant: 'neutral' },
}
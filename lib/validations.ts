import { z } from 'zod'

// ─── AUTH ─────────────────────────────────────────────────────

export const registerStep1Schema = z.object({
  fullName: z
    .string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s'.-]+$/, 'Nama hanya boleh huruf & spasi'),
  phone: z
    .string()
    .regex(
      /^(\+62|62|0)[0-9]{9,13}$/,
      'Nomor HP tidak valid (contoh: 08123456789)'
    ),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

export const registerStep2Schema = z.object({
  province: z.string().min(1, 'Pilih provinsi'),
  city:     z.string().min(1, 'Pilih kabupaten/kota'),
  district: z.string().min(1, 'Pilih kecamatan'),
  address:  z.string().min(10, 'Alamat lengkap minimal 10 karakter').max(500),
})

export const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,13}$/, 'Nomor HP tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const roleSchema = z.object({
  role: z.enum(['petani', 'pembeli', 'penyedia_alat'], {
    errorMap: () => ({ message: 'Pilih peran' }),
  }),
})

// ─── PRODUCT ──────────────────────────────────────────────────

export const productCreateSchema = z.object({
  name:           z.string().min(3, 'Nama produk minimal 3 karakter').max(120),
  category:       z.enum(['sayuran', 'buah', 'beras_padi', 'rempah', 'lainnya']),
  description:    z.string().max(2000).optional(),
  price_per_unit: z.number().positive('Harga harus lebih dari 0'),
  unit:           z.string().min(1).max(20).default('kg'),
  stock_quantity: z.number().nonnegative('Stok tidak boleh negatif'),
  province:       z.string().min(1),
  city:           z.string().min(1),
  harvest_date:   z.string().optional(),
  is_auction:     z.boolean().default(false),
  auction_end_time: z.string().optional().nullable(),
})

// ─── TRANSACTION ──────────────────────────────────────────────

export const createTransactionSchema = z.object({
  product_id:      z.string().uuid('ID produk tidak valid'),
  quantity:        z.number().positive('Jumlah harus lebih dari 0'),
  shipping_method: z.enum(['jne', 'sicepat', 'ambil_sendiri']),
  shipping_address: z.object({
    recipient_name: z.string().min(3),
    phone:          z.string(),
    province:       z.string().min(1),
    city:           z.string().min(1),
    district:       z.string().min(1),
    address:        z.string().min(10),
    postal_code:    z.string().optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
})

// ─── FINANCIAL RECORD ─────────────────────────────────────────

export const financialRecordSchema = z.object({
  season_label:   z.string().min(3),
  season_year:    z.number().int().min(2020).max(2100),
  record_type:    z.enum(['expense', 'income']),
  category:       z.enum([
    'bibit', 'pupuk', 'pestisida', 'tenaga_kerja',
    'sewa_lahan', 'lainnya', 'penjualan',
  ]),
  item_name:      z.string().min(2, 'Nama item minimal 2 karakter').max(120),
  quantity:       z.number().positive(),
  unit:           z.string().min(1).max(20),
  price_per_unit: z.number().positive(),
  recorded_at:    z.string(),
  notes:          z.string().max(500).optional().nullable(),
})

// ─── FILE UPLOAD ──────────────────────────────────────────────

export const ktpUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(f => f.size <= 5 * 1024 * 1024, 'Ukuran maksimal 5MB')
    .refine(
      f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
      'Format harus JPG, PNG, atau WEBP'
    ),
})

export type RegisterStep1Input   = z.infer<typeof registerStep1Schema>
export type RegisterStep2Input   = z.infer<typeof registerStep2Schema>
export type LoginInput           = z.infer<typeof loginSchema>
export type ProductCreateInput   = z.infer<typeof productCreateSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type FinancialRecordInput = z.infer<typeof financialRecordSchema>
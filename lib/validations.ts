import { z } from 'zod'

// ─── AUTH ─────────────────────────────────────────────────────

export const registerStep1Schema = z.object({
  fullName: z
    .string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s'.-]+$/, 'Nama hanya boleh huruf & spasi'),
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(254, 'Email terlalu panjang'),
  // Phone opsional — kalau diisi harus valid, kalau kosong skip validasi
  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,13}$/, 'Nomor HP tidak valid (contoh: 08123456789)')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string(),
}).refine(
  data => data.password === data.confirmPassword,
  { message: 'Password tidak cocok', path: ['confirmPassword'] }
)

export const registerStep2Schema = z.object({
  province: z.string().min(1, 'Pilih provinsi'),
  city:     z.string().min(1, 'Pilih kabupaten/kota'),
  district: z.string().min(1, 'Pilih kecamatan'),
  address:  z.string().min(10, 'Alamat lengkap minimal 10 karakter').max(500),
})

export const registerStep3Schema = z.object({
  roles: z.array(z.enum(['petani', 'pembeli', 'penyedia_alat'])).min(1, 'Pilih minimal 1 peran'),
  activeRole: z.enum(['petani', 'pembeli', 'penyedia_alat']),
})

export const loginSchema = z.object({
  email:    z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

// Kirim link reset password ke email (halaman /forgot-password)
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
})

// Set password baru dari link email (halaman /reset-password)
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string(),
}).refine(
  data => data.password === data.confirmPassword,
  { message: 'Password tidak cocok', path: ['confirmPassword'] }
)

// Ubah password saat sudah login, dengan verifikasi kode email dulu
// (halaman /settings/password)
export const changePasswordSchema = z.object({
  nonce: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Kode verifikasi harus 6 digit angka'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string(),
}).refine(
  data => data.password === data.confirmPassword,
  { message: 'Password tidak cocok', path: ['confirmPassword'] }
)

export const roleSchema = z.object({
  role: z.enum(['petani', 'pembeli', 'penyedia_alat'], { message: 'Pilih peran yang valid' }),
})

// ─── PRODUCT (schema lama) ────────────────────────────────────

export const productCreateSchema = z.object({
  name:             z.string().min(3).max(120),
  category:         z.enum(['sayuran', 'buah', 'beras_padi', 'rempah', 'lainnya']),
  description:      z.string().max(2000).optional(),
  price_per_unit:   z.number().positive('Harga harus lebih dari 0'),
  unit:             z.string().min(1).max(20).default('kg'),
  stock_quantity:   z.number().nonnegative('Stok tidak boleh negatif'),
  province:         z.string().min(1),
  city:             z.string().min(1),
  harvest_date:     z.string().optional(),
  is_auction:       z.boolean().default(false),
  auction_end_time: z.string().optional().nullable(),
})

// ─── PRODUCT FORM (Jual Hasil Panen) ──────────────────────────

export const productFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama produk minimal 3 karakter')
    .max(120, 'Nama produk maksimal 120 karakter'),
  category: z.enum(
    ['sayuran', 'buah', 'beras_padi', 'rempah', 'lainnya'],
    { message: 'Pilih kategori produk' }
  ),
  description:       z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().or(z.literal('')),
  price_per_unit:    z.number({ message: 'Harga harus diisi' }).positive('Harga harus lebih dari 0').max(999_999_999, 'Harga terlalu besar'),
  unit:              z.string().min(1, 'Satuan wajib diisi').max(20, 'Satuan maksimal 20 karakter'),
  stock_quantity:    z.number({ message: 'Stok harus diisi' }).nonnegative('Stok tidak boleh negatif').max(999_999, 'Stok terlalu besar'),
  province:          z.string().min(1, 'Provinsi wajib diisi'),
  city:              z.string().min(1, 'Kabupaten/Kota wajib diisi'),
  harvest_date:      z.string().optional().or(z.literal('')),
  is_auction:        z.boolean(),
  auction_end_time:  z.string().optional().or(z.literal('')),
  min_bid_increment: z.number().positive('Kelipatan bid harus > 0').optional(),
}).refine(
  data => { if (data.is_auction) { return !!data.auction_end_time && !!data.min_bid_increment } return true },
  { message: 'Lelang harus punya tanggal berakhir & kelipatan bid', path: ['auction_end_time'] }
).refine(
  data => { if (data.is_auction && data.auction_end_time) { return new Date(data.auction_end_time) > new Date() } return true },
  { message: 'Waktu berakhir lelang harus di masa depan', path: ['auction_end_time'] }
)

export const productImageUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 3 * 1024 * 1024, 'Ukuran foto maksimal 3MB')
    .refine(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type), 'Format harus JPG, PNG, atau WEBP'),
})

// ─── EQUIPMENT FORM (Tambah Alat/Bahan) ───────────────────────

export const equipmentFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama alat minimal 3 karakter')
    .max(120, 'Nama alat maksimal 120 karakter'),
  category: z.enum(
    ['traktor', 'mesin_panen', 'pompa_air', 'drone', 'pupuk', 'bibit', 'pestisida', 'lainnya'],
    { message: 'Pilih kategori alat/bahan' }
  ),
  description:    z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().or(z.literal('')),
  offer_type:     z.enum(['rent', 'sell', 'both'], { message: 'Pilih tipe penawaran' }),
  price_rent:     z.number().positive('Harga sewa harus > 0').max(999_999_999).optional(),
  price_sell:     z.number().positive('Harga jual harus > 0').max(999_999_999).optional(),
  deposit_amount: z.number().nonnegative('Deposit tidak boleh negatif').max(999_999_999).optional(),
  stock:          z.number({ message: 'Stok harus diisi' }).int('Stok harus bilangan bulat').min(1, 'Stok minimal 1').max(9_999),
  province:       z.string().min(1, 'Provinsi wajib diisi'),
  city:           z.string().min(1, 'Kabupaten/Kota wajib diisi'),
  condition_note: z.string().max(500, 'Catatan kondisi maksimal 500 karakter').optional().or(z.literal('')),
}).refine(
  data => { if (data.offer_type === 'rent' || data.offer_type === 'both') { return !!data.price_rent } return true },
  { message: 'Harga sewa wajib diisi untuk mode Sewa', path: ['price_rent'] }
).refine(
  data => { if (data.offer_type === 'sell' || data.offer_type === 'both') { return !!data.price_sell } return true },
  { message: 'Harga jual wajib diisi untuk mode Jual', path: ['price_sell'] }
)

export const equipmentImageUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 5 * 1024 * 1024, 'Ukuran foto maksimal 5MB')
    .refine(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type), 'Format harus JPG, PNG, atau WEBP'),
})

// ─── TRANSACTION ──────────────────────────────────────────────

export const createTransactionSchema = z.object({
  product_id:      z.string().uuid('ID produk tidak valid'),
  quantity:        z.number().positive('Jumlah harus lebih dari 0'),
  shipping_method: z.enum(['jne', 'sicepat', 'ambil_sendiri']),
  shipping_cost:   z.number().nonnegative(),
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
  category:       z.enum(['bibit', 'pupuk', 'pestisida', 'tenaga_kerja', 'sewa_lahan', 'lainnya', 'penjualan']),
  item_name:      z.string().min(2, 'Nama item minimal 2 karakter').max(120),
  quantity:       z.number().positive(),
  unit:           z.string().min(1).max(20),
  price_per_unit: z.number().positive(),
  recorded_at:    z.string(),
  notes:          z.string().max(500).optional().nullable(),
})

// ─── FILE UPLOAD ──────────────────────────────────────────────

export const ktpUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 5 * 1024 * 1024, 'Ukuran maksimal 5MB')
    .refine(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type), 'Format harus JPG, PNG, atau WEBP'),
})

// ─── BOOKING RETURN ───────────────────────────────────────────

export const bookingReturnSchema = z.object({
  deposit_decision:      z.enum(['released', 'refunded'], { message: 'Pilih keputusan deposit' }),
  deposit_refund_amount: z.number().nonnegative('Jumlah refund tidak boleh negatif').optional(),
  return_notes:          z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().or(z.literal('')),
}).refine(
  data => {
    if (data.deposit_decision === 'refunded') {
      return data.deposit_refund_amount !== undefined && data.deposit_refund_amount >= 0
    }
    return true
  },
  { message: 'Isi jumlah refund untuk deposit dipotong', path: ['deposit_refund_amount'] }
)

export const bookingPhotoUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 5 * 1024 * 1024, 'Ukuran foto maksimal 5MB')
    .refine(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type), 'Format harus JPG, PNG, atau WEBP'),
})

// ─── TYPE EXPORTS ─────────────────────────────────────────────

export type RegisterStep1Input  = z.infer<typeof registerStep1Schema>
export type RegisterStep2Input  = z.infer<typeof registerStep2Schema>
export type RegisterStep3Input  = z.infer<typeof registerStep3Schema>
export type LoginInput          = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ProductCreateInput  = z.infer<typeof productCreateSchema>
export type ProductFormInput    = z.infer<typeof productFormSchema>
export type EquipmentFormInput  = z.infer<typeof equipmentFormSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type FinancialRecordInput   = z.infer<typeof financialRecordSchema>
export type BookingReturnInput     = z.infer<typeof bookingReturnSchema>
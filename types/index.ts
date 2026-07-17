// types/index.ts

// ─── USER ROLES ─────────────────────────────────────────────────
export type UserRole = 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'

export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export type User = {
  id: string
  full_name: string
  phone: string
  role: UserRole
  province: string
  city: string
  district: string
  address: string
  verification_status: VerificationStatus
  ktp_url: string | null        // signed URL, bukan path langsung
  lahan_photo_url: string | null
  created_at: string
  updated_at: string
}

// ─── PRODUCT ────────────────────────────────────────────────────
export type ProductCategory =
  | 'sayuran'
  | 'buah'
  | 'beras_padi'
  | 'rempah'
  | 'palawija'
  | 'lainnya'

export type ProductStatus = 'aktif' | 'terjual' | 'draft' | 'dihapus'

export type ListingType = 'jual_langsung' | 'lelang'

export type Product = {
  id: string
  seller_id: string
  name: string
  category: ProductCategory
  description: string
  price: number
  stock_kg: number
  unit: string
  location_province: string
  location_city: string
  listing_type: ListingType
  auction_end_at: string | null
  auction_min_bid: number | null
  auction_current_bid: number | null
  auction_highest_bidder_id: string | null
  status: ProductStatus
  photos: string[]             // array of signed URLs
  created_at: string
  updated_at: string
  // Joined fields
  seller?: Partial<User>
  avg_rating?: number
  review_count?: number
}

// ─── TRANSACTION ────────────────────────────────────────────────
export type TransactionStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type Transaction = {
  id: string
  buyer_id: string
  seller_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  shipping_cost: number
  total: number
  status: TransactionStatus
  shipping_method: string | null
  shipping_tracking_number: string | null
  escrow_released: boolean
  idempotency_key: string
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  product?: Partial<Product>
  buyer?: Partial<User>
  seller?: Partial<User>
  payment?: Partial<Payment>
}

// ─── PAYMENT ────────────────────────────────────────────────────
export type PaymentStatus =
  | 'pending'
  | 'settlement'
  | 'capture'
  | 'deny'
  | 'cancel'
  | 'expire'
  | 'failure'
  | 'refund'

export type Payment = {
  id: string
  transaction_id: string
  midtrans_order_id: string
  midtrans_transaction_id: string | null
  payment_type: string | null
  gross_amount: number
  status: PaymentStatus
  snap_token: string | null
  snap_redirect_url: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

// ─── FINANCIAL RECORD ───────────────────────────────────────────
export type ExpenseCategory =
  | 'bibit'
  | 'pupuk'
  | 'pestisida'
  | 'tenaga_kerja'
  | 'sewa_lahan'
  | 'lainnya'

export type RecordType = 'modal' | 'pendapatan'

export type FinancialRecord = {
  id: string
  farmer_id: string
  season_label: string         // contoh: "April-Juli 2026"
  season_start: string
  season_end: string
  record_type: RecordType
  category: ExpenseCategory | null
  item_name: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total_amount: number
  notes: string | null
  transaction_id: string | null  // auto-link dari marketplace
  record_date: string
  created_at: string
}

// ─── EQUIPMENT (Alat & Bahan) ───────────────────────────────────
export type EquipmentType = 'sewa' | 'jual'

export type Equipment = {
  id: string
  provider_id: string
  name: string
  category: string
  description: string
  type: EquipmentType
  price_per_day: number | null   // untuk sewa
  sell_price: number | null      // untuk jual
  deposit_amount: number | null  // untuk sewa
  is_available: boolean
  location_city: string
  photos: string[]
  created_at: string
  updated_at: string
}

// ─── RENTAL BOOKING ─────────────────────────────────────────────
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'returned'
  | 'disputed'
  | 'cancelled'

export type RentalBooking = {
  id: string
  equipment_id: string
  renter_id: string
  provider_id: string
  start_date: string
  end_date: string
  total_days: number
  total_rental_cost: number
  deposit_amount: number
  deposit_status: 'held' | 'released' | 'forfeited'
  status: BookingStatus
  condition_before_photos: string[]
  condition_after_photos: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── AUDIT LOG ──────────────────────────────────────────────────
export type AuditLog = {
  id: string
  actor_id: string
  actor_role: UserRole
  action: string
  target_table: string
  target_id: string
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

// ─── API RESPONSE WRAPPER ───────────────────────────────────────
export type ApiResponse<T> = {
  data: T | null
  error: string | null
  message?: string
}

// ─── Supabase DB Type Placeholder (di-generate oleh Supabase CLI) ─
// Nanti di-generate: npx supabase gen types typescript --local > types/database.ts
export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> }
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      financial_records: { Row: FinancialRecord; Insert: Partial<FinancialRecord>; Update: Partial<FinancialRecord> }
      equipment: { Row: Equipment; Insert: Partial<Equipment>; Update: Partial<Equipment> }
      rental_bookings: { Row: RentalBooking; Insert: Partial<RentalBooking>; Update: Partial<RentalBooking> }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: never }
    }
  }
}
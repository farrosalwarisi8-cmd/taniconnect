import { createBrowserClient } from '@supabase/ssr'

// ─── DATABASE TYPES ──────────────────────────────────────────
export type UserRole = 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string
          phone: string
          email: string | null
          /** role aktif saat ini (dipakai untuk redirect & session) */
          role: UserRole
          /** semua role yang dimiliki user — support multi-role */
          roles: UserRole[]
          province: string | null
          city: string | null
          district: string | null
          address: string | null
          ktp_storage_path: string | null
          land_photo_storage_path: string | null
          is_verified: boolean
          kyc_submitted_at: string | null
          kyc_reviewed_at: string | null
          kyc_reviewer_id: string | null
          is_active: boolean
          avatar_storage_path: string | null
          bio: string | null
          rating_avg: number | null
          rating_count: number | null
        }
        Insert: {
          id: string
          full_name: string
          phone: string
          email?: string | null
          role?: UserRole
          roles?: UserRole[]
          province?: string | null
          city?: string | null
          district?: string | null
          address?: string | null
          ktp_storage_path?: string | null
          land_photo_storage_path?: string | null
          is_verified?: boolean
          is_active?: boolean
          avatar_storage_path?: string | null
          bio?: string | null
          kyc_submitted_at?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewer_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      products: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          seller_id: string
          name: string
          category: 'sayuran' | 'buah' | 'beras_padi' | 'rempah' | 'lainnya'
          description: string | null
          unit: string
          price_per_unit: number
          stock_quantity: number
          is_auction: boolean
          auction_end_time: string | null
          current_bid: number | null
          min_bid_increment: number | null
          image_paths: string[]
          province: string | null
          city: string | null
          harvest_date: string | null
          status: 'active' | 'sold' | 'draft'
          views_count: number
        }
        Insert: {
          seller_id: string
          name: string
          category: 'sayuran' | 'buah' | 'beras_padi' | 'rempah' | 'lainnya'
          description?: string | null
          unit?: string
          price_per_unit: number
          stock_quantity: number
          is_auction?: boolean
          auction_end_time?: string | null
          current_bid?: number | null
          min_bid_increment?: number | null
          image_paths?: string[]
          province?: string | null
          city?: string | null
          harvest_date?: string | null
          status?: 'active' | 'sold' | 'draft'
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          buyer_id: string
          seller_id: string
          product_id: string
          quantity: number
          price_per_unit: number
          subtotal: number
          shipping_cost: number
          total_amount: number
          shipping_method: string | null
          shipping_provider: string | null
          tracking_number: string | null
          shipping_address: Record<string, unknown> | null
          status:
          | 'pending' | 'paid' | 'processed' | 'shipped'
          | 'delivered' | 'completed' | 'disputed' | 'cancelled'
          escrow_status: 'held' | 'released' | 'refunded'
          escrow_released_at: string | null
          idempotency_key: string | null
          notes: string | null
          confirmed_at: string | null
        }
        Insert: {
          buyer_id: string
          seller_id: string
          product_id: string
          quantity: number
          price_per_unit: number
          subtotal: number
          shipping_cost?: number
          total_amount: number
          shipping_method?: string | null
          shipping_provider?: string | null
          tracking_number?: string | null
          shipping_address?: Record<string, unknown> | null
          status?:
          | 'pending' | 'paid' | 'processed' | 'shipped'
          | 'delivered' | 'completed' | 'disputed' | 'cancelled'
          escrow_status?: 'held' | 'released' | 'refunded'
          escrow_released_at?: string | null
          idempotency_key?: string | null
          notes?: string | null
          confirmed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      payments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          transaction_id: string
          midtrans_order_id: string
          midtrans_transaction_id: string | null
          payment_type: string | null
          amount: number
          status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'refund'
          snap_token: string | null
          paid_at: string | null
          raw_response: Record<string, unknown> | null
          webhook_processed_at: string | null
          webhook_idempotency_key: string | null
        }
        Insert: {
          transaction_id: string
          midtrans_order_id: string
          midtrans_transaction_id?: string | null
          payment_type?: string | null
          amount: number
          status?: 'pending' | 'settlement' | 'expire' | 'cancel' | 'refund'
          snap_token?: string | null
          paid_at?: string | null
          raw_response?: Record<string, unknown> | null
          webhook_processed_at?: string | null
          webhook_idempotency_key?: string | null
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      financial_records: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          farmer_id: string
          season_label: string
          season_year: number
          record_type: 'expense' | 'income'
          category:
          | 'bibit' | 'pupuk' | 'pestisida' | 'tenaga_kerja'
          | 'sewa_lahan' | 'lainnya' | 'penjualan'
          item_name: string
          quantity: number
          unit: string
          price_per_unit: number
          total_amount: number
          transaction_id: string | null
          recorded_at: string
          notes: string | null
        }
        Insert: {
          farmer_id: string
          season_label: string
          season_year: number
          record_type: 'expense' | 'income'
          category:
          | 'bibit' | 'pupuk' | 'pestisida' | 'tenaga_kerja'
          | 'sewa_lahan' | 'lainnya' | 'penjualan'
          item_name: string
          quantity: number
          unit: string
          price_per_unit: number
          transaction_id?: string | null
          recorded_at: string
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['financial_records']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          created_at: string
          actor_id: string | null
          actor_role: UserRole | null
          action: string
          resource_type: string
          resource_id: string | null
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          notes: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: UserRole | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      equipment: {
        Row: {
          id: string
          created_at: string
          owner_id: string
          name: string
          category: 'traktor' | 'mesin_panen' | 'pompa_air' | 'drone' | 'pupuk' | 'bibit' | 'pestisida' | 'lainnya'
          description: string | null
          price_sell: number | null
          price_rent: number | null
          deposit_amount: number | null
          stock: number
          is_available: boolean
          image_paths: string[]
          province: string | null
          city: string | null
          condition_note: string | null
        }
        Insert: {
          owner_id: string
          name: string
          category: 'traktor' | 'mesin_panen' | 'pompa_air' | 'drone' | 'pupuk' | 'bibit' | 'pestisida' | 'lainnya'
          description?: string | null
          price_sell?: number | null
          price_rent?: number | null
          deposit_amount?: number | null
          stock?: number
          is_available?: boolean
          image_paths?: string[]
          province?: string | null
          city?: string | null
          condition_note?: string | null
        }
        Update: Partial<Database['public']['Tables']['equipment']['Insert']>
      }
      rental_bookings: {
        Row: {
          id: string
          created_at: string
          equipment_id: string
          renter_id: string
          start_date: string
          end_date: string
          total_days: number
          total_price: number
          deposit_status: 'held' | 'released' | 'refunded'
          status: 'pending' | 'active' | 'completed' | 'late' | 'cancelled'
          photo_before_url: string | null
          photo_after_url: string | null
          return_notes: string | null
          returned_at: string | null
          deposit_refund_amount: number | null
        }
        Insert: {
          equipment_id: string
          renter_id: string
          start_date: string
          end_date: string
          total_days: number
          total_price: number
          deposit_status?: 'held' | 'released' | 'refunded'
          status?: 'pending' | 'active' | 'completed' | 'late' | 'cancelled'
          photo_before_url?: string | null
          photo_after_url?: string | null
          return_notes?: string | null
          returned_at?: string | null
          deposit_refund_amount?: number | null
        }
        Update: Partial<Database['public']['Tables']['rental_bookings']['Insert']>
      }
      shipping_services: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          owner_id: string
          owner_role: 'petani' | 'penyedia_alat'
          service_name: string
          description: string | null
          price_per_km: number
          minimum_cost: number
          estimated_delivery: string
          is_active: boolean
          max_coverage_km: number
        }
        Insert: {
          owner_id: string
          owner_role: 'petani' | 'penyedia_alat'
          service_name: string
          description?: string | null
          price_per_km: number
          minimum_cost?: number
          estimated_delivery?: string
          is_active?: boolean
          max_coverage_km?: number
        }
        Update: Partial<Database['public']['Tables']['shipping_services']['Insert']>
      }
      shipment_tracking: {
        Row: {
          id: string
          transaction_id: string
          status: 'diproses' | 'diambil' | 'dalam_perjalanan' | 'terkirim'
          location_notes: string
          updated_by: string | null
          created_at: string
        }
        Insert: {
          transaction_id: string
          status: 'diproses' | 'diambil' | 'dalam_perjalanan' | 'terkirim'
          location_notes: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['shipment_tracking']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      product_category: 'sayuran' | 'buah' | 'beras_padi' | 'rempah' | 'lainnya'
      product_status: 'active' | 'sold' | 'draft'
      transaction_status:
      | 'pending' | 'paid' | 'processed' | 'shipped'
      | 'delivered' | 'completed' | 'disputed' | 'cancelled'
      escrow_status: 'held' | 'released' | 'refunded'
      payment_status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'refund'
      record_type: 'expense' | 'income'
      expense_category:
      | 'bibit' | 'pupuk' | 'pestisida' | 'tenaga_kerja'
      | 'sewa_lahan' | 'lainnya' | 'penjualan'
      equipment_category:
      | 'traktor' | 'mesin_panen' | 'pompa_air' | 'drone'
      | 'pupuk' | 'bibit' | 'pestisida' | 'lainnya'
      rental_status:
      | 'pending' | 'active' | 'completed' | 'late' | 'cancelled'
    }
  }
}

// ─── TYPE HELPERS ────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type SupabaseDB = ReturnType<typeof createBrowserClient>

// ─── ENV VALIDATION ──────────────────────────────────────────
function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value || value.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIi')) {
    if (typeof window === 'undefined') {
      // Server-side: throw error
      throw new Error(`Missing required environment variable: ${key}`)
    }
    // Client-side: return empty (will fail gracefully at runtime)
    return ''
  }
  return value
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export function createClient(): SupabaseDB {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
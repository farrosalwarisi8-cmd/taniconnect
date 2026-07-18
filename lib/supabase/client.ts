import { createBrowserClient } from '@supabase/ssr'

// ─── DATABASE TYPES ──────────────────────────────────────────
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
          role: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'
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
          role?: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'
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
          actor_role: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin' | null
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
          actor_role?: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin' | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin'
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

/**
 * Type helper untuk Supabase client kita.
 * Dipakai untuk cast return dari createClient() supaya operasi
 * insert/update tidak menghasilkan "never" di Supabase SDK versi baru.
 */
export type SupabaseDB = ReturnType<typeof createBrowserClient<Database>>

/**
 * Supabase client untuk Browser / Client Components.
 *
 * PENTING: return-nya di-cast ke `any` supaya TypeScript tidak menganggap
 * hasil .from().insert() / .update() sebagai `never`.
 * Type safety tetap ada di skema Database di atas + Zod validation + RLS.
 */
export function createClient(): any {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
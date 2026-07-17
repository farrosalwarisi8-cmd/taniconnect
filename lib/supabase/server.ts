import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
// PENTING: import Database dari client.ts, bukan dari @/types/database
import type { Database } from './client'

/**
 * Supabase client untuk Server Components, Server Actions, dan Route Handlers.
 * Cookie dikelola oleh @supabase/ssr untuk session management.
 *
 * PENTING: Fungsi ini harus async karena cookies() di Next.js 15
 * mengembalikan Promise.
 */
export async function createServerSupabaseClient() {
  // Next.js 15: cookies() sekarang async — WAJIB di-await
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component tidak bisa set cookies —
            // middleware yang akan menangani refresh token
          }
        },
      },
    }
  )
}

/**
 * Supabase Admin client dengan Service Role Key.
 *
 * HANYA untuk operasi privileged di server-side:
 * - Approve/reject KYC
 * - Operasi escrow (release/refund)
 * - Insert ke audit_logs
 * - Webhook Midtrans handler
 *
 * ⚠️ JANGAN PERNAH panggil di client — service role key
 * memiliki akses penuh (bypass RLS).
 */
export function createAdminSupabaseClient() {
  // Guard: pastikan hanya jalan di server
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminSupabaseClient() hanya boleh dipanggil di server-side!'
    )
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
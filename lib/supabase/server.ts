import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './client'

/**
 * Supabase client untuk Server Components, Server Actions, dan Route Handlers.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  const client = createServerClient<Database>(
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
            // Server Component tidak bisa set cookies
          }
        },
      },
    }
  )

  // Cast ke any untuk menghindari masalah type inference dari Supabase SDK
  // yang kadang mengembalikan "never" pada insert/update.
  // Type safety tetap terjaga di skema Database (via lib/supabase/client.ts)
  // dan di runtime lewat RLS + validasi Zod.
  return client as any
}

/**
 * Supabase Admin client dengan Service Role Key.
 */
export function createAdminSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminSupabaseClient() hanya boleh dipanggil di server-side!'
    )
  }

  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return client as any
}
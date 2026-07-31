import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './client'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Environment variable ${key} is not set. ` +
      'Please configure it in .env.local before running the application.'
    )
  }
  return value
}

/**
 * Supabase client untuk Server Components, Server Actions, dan Route Handlers.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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
            // Server Component tidak bisa set cookies — handled by middleware
          }
        },
      },
    }
  )
}

/**
 * Supabase Admin client dengan Service Role Key.
 * HANYA boleh dipanggil di server-side (Route Handlers / Server Actions).
 */
export function createAdminSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminSupabaseClient() hanya boleh dipanggil di server-side!'
    )
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
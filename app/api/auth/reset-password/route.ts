// app/api/auth/reset-password/route.ts
//
// Server-side handler untuk request lupa password.
// Menerima email → kirim reset link via Supabase Auth.
//
// Keamanan:
// 1. Rate limiting per IP + per email
// 2. Response SELALU sama baik email ada maupun tidak (anti-enumeration)
// 3. Consistent delay supaya timing tidak jadi sinyal
// 4. Pakai Admin client supaya tidak perlu session
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

type ResetPasswordResponse = {
  message: string
}

const GENERIC_MESSAGE =
  'Kalau email tersebut terdaftar, link reset password sudah dikirim. Cek inbox & folder spam.'

async function consistentDelay(): Promise<void> {
  const BASE_MS   = 150
  const JITTER_MS = 50
  const jitter    = Math.floor(Math.random() * (JITTER_MS * 2 + 1)) - JITTER_MS
  await new Promise<void>(resolve => setTimeout(resolve, BASE_MS + jitter))
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let email: string

  try {
    const body = await request.json()
    email      = body?.email

    if (!email || typeof email !== 'string' || email.trim() === '') {
      await consistentDelay()
      return NextResponse.json(
        { message: GENERIC_MESSAGE } satisfies ResetPasswordResponse,
        { status: 200 }
      )
    }

    email = email.trim().toLowerCase()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      await consistentDelay()
      return NextResponse.json(
        { message: GENERIC_MESSAGE } satisfies ResetPasswordResponse,
        { status: 200 }
      )
    }
  } catch {
    await consistentDelay()
    return NextResponse.json(
      { message: GENERIC_MESSAGE } satisfies ResetPasswordResponse,
      { status: 200 }
    )
  }

  // ── 2. Rate limiting — dua layer ──────────────────────────────────────────
  const ip       = getClientIP(request)
  const ipKey    = `reset-password:ip:${ip}`
  const emailKey = `reset-password:email:${email}`

  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit({ key: ipKey,    maxRequests: 5, windowMs: 15 * 60 * 1000 }),
    checkRateLimit({ key: emailKey, maxRequests: 3, windowMs: 15 * 60 * 1000 }),
  ])

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const resetIn = Math.max(ipLimit.resetIn ?? 0, emailLimit.resetIn ?? 0)
    const minutes = Math.ceil(resetIn / 60_000)

    await consistentDelay()
    return NextResponse.json(
      { message: `Terlalu banyak permintaan. Coba lagi dalam ${minutes} menit.` } satisfies ResetPasswordResponse,
      { status: 200 }
    )
  }

  // ── 3. Kirim reset email via Supabase Admin ────────────────────────────────
  const adminSupabase = createAdminSupabaseClient()

  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? request.nextUrl.origin

  const { error } = await adminSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('/reset-password', origin).toString(),
  })

  await consistentDelay()

  if (error) {
    console.error('[reset-password] Supabase error:', error.message)
  }

  return NextResponse.json(
    { message: GENERIC_MESSAGE } satisfies ResetPasswordResponse,
    { status: 200 }
  )
}

export async function GET(): Promise<NextResponse> {
  await consistentDelay()
  return NextResponse.json(
    { message: GENERIC_MESSAGE } satisfies ResetPasswordResponse,
    { status: 200 }
  )
}
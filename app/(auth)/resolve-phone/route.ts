// app/api/auth/resolve-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizePhoneID } from '@/lib/utils'

// Shape response yang selalu identik — status HTTP selalu 200.
type ResolvePhoneResponse = {
    email: string | null
}

// Shape yang kita expect dari hasil query DB.
// Didefinisikan eksplisit supaya TypeScript tidak infer `never`
// ketika generated Database type tidak persis match kolom yang di-select.
interface ProfileEmailRow {
    email: string | null
}

// Delay buatan ~100ms ± 20ms jitter untuk menyamarkan perbedaan
// latency DB antara "ada baris" vs "tidak ada baris".
async function consistentDelay(): Promise<void> {
    const BASE_MS = 100
    const JITTER_MS = 20
    const jitter = Math.floor(Math.random() * (JITTER_MS * 2 + 1)) - JITTER_MS
    await new Promise<void>((resolve) => setTimeout(resolve, BASE_MS + jitter))
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
    let rawPhone: string

    try {
        const body = await request.json()
        rawPhone = body?.phone

        if (!rawPhone || typeof rawPhone !== 'string' || rawPhone.trim() === '') {
            await consistentDelay()
            return NextResponse.json(
                { email: null } satisfies ResolvePhoneResponse,
                { status: 200 }
            )
        }
    } catch {
        await consistentDelay()
        return NextResponse.json(
            { email: null } satisfies ResolvePhoneResponse,
            { status: 200 }
        )
    }

    // ── 2. Normalisasi di server (defense-in-depth) ───────────────────────────
    let normalizedPhone: string
    try {
        normalizedPhone = normalizePhoneID(rawPhone)
    } catch {
        await consistentDelay()
        return NextResponse.json(
            { email: null } satisfies ResolvePhoneResponse,
            { status: 200 }
        )
    }

    // ── 3. Rate limiting — dua layer ──────────────────────────────────────────
    const ip = getClientIP(request)
    const ipKey = `resolve-phone:ip:${ip}`
    const phoneKey = `resolve-phone:phone:${normalizedPhone}`

    const [ipLimit, phoneLimit] = await Promise.all([
        checkRateLimit({ key: ipKey, maxRequests: 10, windowMs: 10 * 60 * 1000 }),
        checkRateLimit({ key: phoneKey, maxRequests: 5, windowMs: 10 * 60 * 1000 }),
    ])

    if (!ipLimit.allowed || !phoneLimit.allowed) {
        const resetIn = Math.max(ipLimit.resetIn ?? 0, phoneLimit.resetIn ?? 0)
        const headers = new Headers({ 'Retry-After': String(Math.ceil(resetIn / 1000)) })

        await consistentDelay()
        return NextResponse.json(
            { email: null } satisfies ResolvePhoneResponse,
            { status: 200, headers }
        )
    }

    // ── 4. Query DB via service role ───────────────────────────────────────────
    const adminSupabase = createAdminSupabaseClient()

    // Hasil query di-cast ke ProfileEmailRow setelah fetch, bukan lewat generic,
    // karena Supabase client generic tidak selalu resolve dengan benar ketika
    // generated types tidak sinkron dengan schema aktual.
    const { data: rawProfile, error } = await adminSupabase
        .from('profiles')
        .select('email')
        .eq('phone', normalizedPhone)
        .limit(1)
        .maybeSingle()

    // ── 5. Consistent delay setelah query ─────────────────────────────────────
    await consistentDelay()

    // ── 6. Response — selalu 200 ───────────────────────────────────────────────
    if (error || !rawProfile) {
        return NextResponse.json(
            { email: null } satisfies ResolvePhoneResponse,
            { status: 200 }
        )
    }

    // Cast ke ProfileEmailRow setelah validasi bahwa rawProfile tidak null.
    // Aman karena kita hanya select kolom 'email' dan interface kita
    // mencerminkan tepat itu.
    const profile = rawProfile as ProfileEmailRow

    return NextResponse.json(
        { email: profile.email ?? null } satisfies ResolvePhoneResponse,
        { status: 200 }
    )
}

export async function GET(): Promise<NextResponse> {
    await consistentDelay()
    return NextResponse.json(
        { email: null } satisfies ResolvePhoneResponse,
        { status: 200 }
    )
}
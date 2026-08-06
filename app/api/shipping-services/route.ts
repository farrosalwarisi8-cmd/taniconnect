import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { shippingServiceCreateSchema } from '@/lib/validations'

import { getCache, setCache, clearCacheKey } from '@/lib/cache'

const SELLER_ROLES = ['petani', 'penyedia_alat', 'penyedia_alat_bahan', 'penyedia_alat_berat']

/**
 * GET /api/shipping-services
 * Daftar semua layanan pengiriman aktif (publik).
 */
export async function GET() {
  try {
    const cacheKey = 'shipping_services_all_active'
    const cached = getCache<unknown[]>(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('shipping_services')
      .select('*, owner:profiles!shipping_services_owner_id_fkey(id, full_name, city)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API /api/shipping-services GET] DB Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    setCache(cacheKey, data ?? [], 15_000)

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    console.error('[API /api/shipping-services GET] Exception:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/shipping-services
 * Buat layanan pengiriman baru. Hanya petani/penyedia_alat.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 })
    }

    // Baca role dari DB — source of truth
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    const profileAny = profile as { role: string | null; roles: string[] | null } | null
    const activeRole = profileAny?.role?.trim().toLowerCase()
    const userRoles = (profileAny?.roles ?? []).map((r: string) => r.trim().toLowerCase())

    // Validasi: hanya seller roles yang boleh buat layanan pengiriman
    const hasSellRole = SELLER_ROLES.includes(activeRole ?? '') ||
      userRoles.some((r: string) => SELLER_ROLES.includes(r))

    if (!hasSellRole) {
      return NextResponse.json(
        { error: 'Hanya Petani dan Penyedia Alat yang dapat membuat layanan pengiriman' },
        { status: 403 }
      )
    }

    // Parse & validasi body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
    }

    const parsed = shippingServiceCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Validasi gagal'
      return NextResponse.json({ error: firstError, details: parsed.error.issues }, { status: 400 })
    }

    // Tentukan owner_role: gunakan activeRole jika seller, fallback ke role pertama yang seller
    const ownerRole = SELLER_ROLES.includes(activeRole ?? '')
      ? activeRole!
      : userRoles.find((r: string) => SELLER_ROLES.includes(r)) ?? 'petani'

    const { data: created, error: dbError } = await supabase
      .from('shipping_services')
      .insert({
        owner_id: user.id,
        owner_role: ownerRole,
        service_name: parsed.data.service_name,
        description: parsed.data.description || null,
        price_per_km: parsed.data.price_per_km,
        minimum_cost: parsed.data.minimum_cost,
        estimated_delivery: parsed.data.estimated_delivery,
        max_coverage_km: parsed.data.max_coverage_km ?? 50,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[API /api/shipping-services POST] DB Error:', dbError)
      return NextResponse.json({ error: `Gagal menyimpan: ${dbError.message}` }, { status: 500 })
    }

    clearCacheKey('shipping_services')

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    console.error('[API /api/shipping-services POST] Exception:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  is_auction: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Ambil role user untuk audit log
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as { role: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin' } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role,
      action: 'product.created',
      resource_type: 'product',
      resource_id: parsed.data.product_id,
      new_value: {
        name: parsed.data.product_name,
        is_auction: parsed.data.is_auction,
      },
      notes: `${role === 'petani' ? 'Petani' : 'User'} ${user.id.slice(0, 8)} membuat listing "${parsed.data.product_name}"${parsed.data.is_auction ? ' (LELANG)' : ''}`,
    })

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('[LOG CREATED ERROR]', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
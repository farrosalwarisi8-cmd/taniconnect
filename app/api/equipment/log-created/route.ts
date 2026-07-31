import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({
  equipment_id: z.string().uuid(),
  equipment_name: z.string(),
  offer_type: z.enum(['rent', 'sell', 'both']),
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

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as { role: 'petani' | 'pembeli' | 'penyedia_alat' | 'admin' } | null)?.role ?? null

    const offerLabel =
      parsed.data.offer_type === 'rent' ? 'SEWA' :
      parsed.data.offer_type === 'sell' ? 'JUAL' :
      'SEWA & JUAL'

    await logAudit({
      actor_id: user.id,
      actor_role: role,
      action: 'equipment.created',
      resource_type: 'equipment',
      resource_id: parsed.data.equipment_id,
      new_value: {
        name: parsed.data.equipment_name,
        offer_type: parsed.data.offer_type,
      },
      notes: `Penyedia ${user.id.slice(0, 8)} daftarkan alat "${parsed.data.equipment_name}" (${offerLabel})`,
    })

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('[LOG EQUIPMENT CREATED]', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
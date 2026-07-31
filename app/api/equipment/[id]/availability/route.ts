import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({
  is_available: z.boolean(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingData } = await supabase
      .from('equipment')
      .select('id, owner_id, name, is_available')
      .eq('id', equipmentId)
      .single()

    const existing = existingData as {
      owner_id: string
      name: string
      is_available: boolean
    } | null

    if (!existing) {
      return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Bukan alat milikmu' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('equipment')
      .update({ is_available: parsed.data.is_available })
      .eq('id', equipmentId)
      .eq('owner_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: 'equipment.availability_changed',
      resource_type: 'equipment',
      resource_id: equipmentId,
      old_value: { is_available: existing.is_available },
      new_value: { is_available: parsed.data.is_available },
      notes: `Alat "${existing.name}": ${existing.is_available ? 'available' : 'unavailable'} → ${parsed.data.is_available ? 'available' : 'unavailable'}`,
    })

    return NextResponse.json({ status: 'ok', is_available: parsed.data.is_available })
  } catch (err: any) {
    console.error('[PATCH equipment availability] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
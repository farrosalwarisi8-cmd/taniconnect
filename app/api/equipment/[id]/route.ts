import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  category: z.enum(['traktor', 'mesin_panen', 'pompa_air', 'drone', 'pupuk', 'bibit', 'pestisida', 'lainnya']).optional(),
  description: z.string().max(2000).nullable().optional(),
  price_rent: z.number().positive().nullable().optional(),
  price_sell: z.number().positive().nullable().optional(),
  deposit_amount: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().min(1).optional(),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  condition_note: z.string().max(500).nullable().optional(),
  image_paths: z.array(z.string()).optional(),
  is_available: z.boolean().optional(),
})

// PATCH: Update equipment
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

    // Ownership check
    const { data: existingData, error: fetchError } = await supabase
      .from('equipment')
      .select('id, owner_id, name')
      .eq('id', equipmentId)
      .maybeSingle()

    const existing = existingData as { id: string; owner_id: string; name: string } | null

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Bukan alat milikmu' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('equipment')
      .update(parsed.data)
      .eq('id', equipmentId)
      .eq('owner_id', user.id)

    if (updateError) {
      console.error('[PATCH equipment]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Audit log
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: 'equipment.updated',
      resource_type: 'equipment',
      resource_id: equipmentId,
      old_value: { name: existing.name },
      new_value: parsed.data,
      notes: `Penyedia update alat "${existing.name}"`,
    })

    return NextResponse.json({ status: 'ok', updated: parsed.data })
  } catch (err: any) {
    console.error('[PATCH equipment] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(
  _req: NextRequest,
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
      .select('id, owner_id, name, image_paths')
      .eq('id', equipmentId)
      .maybeSingle()

    const existing = existingData as { id: string; owner_id: string; name: string; image_paths: string[] } | null

    if (!existing) {
      return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Bukan alat milikmu' }, { status: 403 })
    }

    // Cek apakah ada booking aktif
    const { count: bookingCount } = await supabase
      .from('rental_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', equipmentId)
      .in('status', ['pending', 'active'])

    if (bookingCount && bookingCount > 0) {
      return NextResponse.json(
        {
          error: `Tidak bisa hapus. Ada ${bookingCount} booking aktif. Batalkan dulu atau tunggu selesai.`,
        },
        { status: 400 }
      )
    }

    // Hapus foto dari storage
    if (existing.image_paths && existing.image_paths.length > 0) {
      const pathsToDelete = existing.image_paths.filter((p) => !p.startsWith('http'))
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('equipment-images').remove(pathsToDelete)
      }
    }

    const { error: deleteError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', equipmentId)
      .eq('owner_id', user.id)

    if (deleteError) throw deleteError

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: 'equipment.deleted',
      resource_type: 'equipment',
      resource_id: equipmentId,
      old_value: { name: existing.name },
      notes: `Alat "${existing.name}" dihapus permanen`,
    })

    return NextResponse.json({ status: 'ok', action: 'deleted' })
  } catch (err: any) {
    console.error('[DELETE equipment] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
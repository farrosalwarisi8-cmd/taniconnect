import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled', 'late'], {
    message: 'Status tidak valid',
  }),
  reason: z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Ambil booking + equipment owner
    const { data: bookingData, error: fetchError } = await supabase
      .from('rental_bookings')
      .select('id, equipment_id, renter_id, status, total_price')
      .eq('id', bookingId)
      .single()

    const booking = bookingData as {
      id: string
      equipment_id: string
      renter_id: string
      status: string
      total_price: number
    } | null

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    // Cek equipment owner
    const { data: eqData } = await supabase
      .from('equipment')
      .select('owner_id, name')
      .eq('id', booking.equipment_id)
      .single()

    const equipment = eqData as { owner_id: string; name: string } | null

    if (!equipment) {
      return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })
    }

    const isOwner = equipment.owner_id === user.id
    const isRenter = booking.renter_id === user.id

    if (!isOwner && !isRenter) {
      return NextResponse.json({ error: 'Bukan booking-mu' }, { status: 403 })
    }

    // ─── Validasi transisi status ────────────────────────
    const newStatus = parsed.data.status

    // Renter hanya bisa cancel (kalau pending)
    if (isRenter && !isOwner) {
      if (newStatus !== 'cancelled') {
        return NextResponse.json(
          { error: 'Kamu hanya bisa membatalkan booking' },
          { status: 403 }
        )
      }
      if (booking.status !== 'pending') {
        return NextResponse.json(
          { error: `Tidak bisa cancel booking dengan status "${booking.status}"` },
          { status: 400 }
        )
      }
    }

    // Owner bisa transisi: pending → active/cancelled, active → completed/late
    if (isOwner) {
      const validTransitions: Record<string, string[]> = {
        pending: ['active', 'cancelled'],
        active: ['completed', 'late'],
        late: ['completed'],
      }

      const allowed = validTransitions[booking.status] ?? []
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Tidak bisa ubah status dari "${booking.status}" ke "${newStatus}"`,
          },
          { status: 400 }
        )
      }
    }

    // Update
    const { error: updateError } = await supabase
      .from('rental_bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)

    if (updateError) {
      console.error('[PATCH booking status]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Audit log
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: `rental_booking.status_${newStatus}`,
      resource_type: 'rental_booking',
      resource_id: bookingId,
      old_value: { status: booking.status },
      new_value: { status: newStatus, reason: parsed.data.reason },
      notes: `Booking "${equipment.name}": ${booking.status} → ${newStatus}${parsed.data.reason ? ` (${parsed.data.reason})` : ''}`,
    })

    return NextResponse.json({ status: 'ok', new_status: newStatus })
  } catch (err: any) {
    console.error('[PATCH booking status] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({
  deposit_decision: z.enum(['released', 'refunded']),
  deposit_refund_amount: z.number().nonnegative().optional(),
  return_notes: z.string().max(1000).optional(),
  photo_after_url: z.string().optional(),
})

export async function POST(
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

    // Ambil booking
    const { data: bookingData, error: fetchError } = await supabase
      .from('rental_bookings')
      .select('id, equipment_id, renter_id, status, deposit_status, total_price, total_days')
      .eq('id', bookingId)
      .single()

    const booking = bookingData as {
      id: string
      equipment_id: string
      renter_id: string
      status: string
      deposit_status: string
      total_price: number
      total_days: number
    } | null

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    // Cek owner alat (hanya owner yg bisa confirm return)
    const { data: eqData } = await supabase
      .from('equipment')
      .select('owner_id, name, price_rent, deposit_amount')
      .eq('id', booking.equipment_id)
      .single()

    const equipment = eqData as {
      owner_id: string
      name: string
      price_rent: number | null
      deposit_amount: number | null
    } | null

    if (!equipment) {
      return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })
    }

    if (equipment.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Hanya pemilik alat yang bisa konfirmasi pengembalian' },
        { status: 403 }
      )
    }

    // Validasi status: hanya booking active/late yg bisa di-return
    if (!['active', 'late'].includes(booking.status)) {
      return NextResponse.json(
        {
          error: `Booking dengan status "${booking.status}" tidak bisa dikonfirmasi pengembalian. Booking harus dalam status Aktif atau Terlambat.`,
        },
        { status: 400 }
      )
    }

    const depositAmount = Number(equipment.deposit_amount ?? 0)

    // Validasi refund amount kalau refunded
    if (parsed.data.deposit_decision === 'refunded') {
      const refundAmt = parsed.data.deposit_refund_amount ?? 0
      if (refundAmt > depositAmount) {
        return NextResponse.json(
          { error: `Refund tidak boleh > deposit (Rp ${depositAmount.toLocaleString('id-ID')})` },
          { status: 400 }
        )
      }
    }

    // Update booking (pakai admin biar bypass any RLS edge case)
    const admin = createAdminSupabaseClient()
    const now = new Date().toISOString()

    const finalRefundAmount =
      parsed.data.deposit_decision === 'released'
        ? depositAmount  // Return penuh
        : parsed.data.deposit_refund_amount ?? 0  // Partial refund

    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      deposit_status:
        parsed.data.deposit_decision === 'released' ? 'released' : 'refunded',
      deposit_refund_amount: finalRefundAmount,
      returned_at: now,
      return_notes: parsed.data.return_notes?.trim() || null,
    }

    if (parsed.data.photo_after_url) {
      updatePayload.photo_after_url = parsed.data.photo_after_url
    }

    const { error: updateError } = await admin
      .from('rental_bookings')
      .update(updatePayload)
      .eq('id', bookingId)

    if (updateError) {
      console.error('[Booking Return Update]', updateError)
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
      action: 'rental_booking.returned',
      resource_type: 'rental_booking',
      resource_id: bookingId,
      old_value: {
        status: booking.status,
        deposit_status: booking.deposit_status,
      },
      new_value: {
        status: 'completed',
        deposit_status: updatePayload.deposit_status,
        deposit_refund_amount: finalRefundAmount,
        return_notes: parsed.data.return_notes,
      },
      notes:
        parsed.data.deposit_decision === 'released'
          ? `Pengembalian "${equipment.name}" — deposit Rp ${depositAmount.toLocaleString('id-ID')} DIKEMBALIKAN PENUH`
          : `Pengembalian "${equipment.name}" — deposit DIPOTONG. Refund: Rp ${finalRefundAmount.toLocaleString('id-ID')} dari Rp ${depositAmount.toLocaleString('id-ID')}. Alasan: ${parsed.data.return_notes ?? '-'}`,
    })

    return NextResponse.json({
      status: 'ok',
      deposit_status: updatePayload.deposit_status,
      deposit_refund_amount: finalRefundAmount,
      returned_at: now,
    })
  } catch (err: any) {
    console.error('[POST booking return] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  idempotency_key: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Silakan login dulu untuk booking' }, { status: 401 })
    }

    // Rate limit: max 5 booking / menit per user
    const rate = checkRateLimit({
      key:         `booking:${user.id}`,
      maxRequests: 5,
      windowMs:    60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan booking. Tunggu 1 menit.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { start_date, end_date } = parsed.data

    // ─── Validasi tanggal ────────────────────────────────
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }

    if (startDate < today) {
      return NextResponse.json({ error: 'Tanggal mulai tidak boleh di masa lalu' }, { status: 400 })
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: 'Tanggal selesai harus setelah tanggal mulai' }, { status: 400 })
    }

    // Hitung total days (inklusif)
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    if (totalDays > 90) {
      return NextResponse.json({ error: 'Sewa maksimal 90 hari' }, { status: 400 })
    }

    // ─── Ambil data alat ─────────────────────────────────
    const { data: equipmentData, error: eqError } = await supabase
      .from('equipment')
      .select('id, owner_id, name, price_rent, deposit_amount, is_available, stock')
      .eq('id', equipmentId)
      .maybeSingle()

    const equipment = equipmentData as {
      id: string
      owner_id: string
      name: string
      price_rent: number | null
      deposit_amount: number | null
      is_available: boolean
      stock: number
    } | null

    if (eqError || !equipment) {
      return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })
    }

    if (!equipment.is_available) {
      return NextResponse.json({ error: 'Alat sedang tidak tersedia' }, { status: 400 })
    }

    if (!equipment.price_rent || equipment.price_rent <= 0) {
      return NextResponse.json({ error: 'Alat ini tidak untuk disewa' }, { status: 400 })
    }

    if (equipment.owner_id === user.id) {
      return NextResponse.json({ error: 'Tidak bisa booking alat milik sendiri' }, { status: 400 })
    }

    // ─── Cek konflik tanggal (booking aktif) ─────────────
    // Booking aktif = pending / active
    const { data: conflictData } = await supabase
      .from('rental_bookings')
      .select('id')
      .eq('equipment_id', equipmentId)
      .in('status', ['pending', 'active'])
      .or(
        // Ada tumpang tindih tanggal
        `and(start_date.lte.${end_date},end_date.gte.${start_date})`
      )
      .limit(1)

    if (conflictData && conflictData.length > 0) {
      return NextResponse.json(
        { error: 'Alat sudah dibooking di tanggal tersebut. Pilih tanggal lain.' },
        { status: 409 }
      )
    }

    // ─── Hitung total price ──────────────────────────────
    const totalRent = Number(equipment.price_rent) * totalDays
    const deposit = Number(equipment.deposit_amount ?? 0)
    const totalPrice = totalRent + deposit

    // ─── Insert booking pakai admin client (bypass RLS untuk memastikan
    // insert berjalan meski policy RLS ketat) ─────────────
    const admin = createAdminSupabaseClient()

    const { data: insertedData, error: insertError } = await admin
      .from('rental_bookings')
      .insert({
        equipment_id: equipmentId,
        renter_id: user.id,
        start_date,
        end_date,
        total_days: totalDays,
        total_price: totalPrice,
        deposit_status: 'held',
        status: 'pending',
      })
      .select('id')
      .maybeSingle()

    const inserted = insertedData as { id: string } | null

    if (insertError || !inserted) {
      console.error('[Booking Insert Error]', insertError)
      return NextResponse.json(
        { error: insertError?.message ?? 'Gagal membuat booking' },
        { status: 500 }
      )
    }

    // ─── Audit log ───────────────────────────────────────
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: 'rental_booking.created',
      resource_type: 'rental_booking',
      resource_id: inserted.id,
      new_value: {
        equipment_id: equipmentId,
        start_date,
        end_date,
        total_days: totalDays,
        total_price: totalPrice,
      },
      notes: `Booking sewa "${equipment.name}" (${totalDays} hari, ${totalPrice.toLocaleString('id-ID')} IDR)`,
    })

    return NextResponse.json({
      status: 'ok',
      booking_id: inserted.id,
      total_days: totalDays,
      total_rent: totalRent,
      deposit: deposit,
      total_price: totalPrice,
    })
  } catch (err: any) {
    console.error('[POST booking] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
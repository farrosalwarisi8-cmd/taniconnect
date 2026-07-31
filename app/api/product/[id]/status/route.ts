import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({
  status: z.enum(['active', 'draft']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existingData } = await supabase
      .from('products')
      .select('id, seller_id, name, status')
      .eq('id', productId)
      .single()

    const existing = existingData as { seller_id: string; name: string; status: string } | null

    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    if (existing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Bukan produk milikmu' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ status: parsed.data.status })
      .eq('id', productId)
      .eq('seller_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Ambil role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: 'product.status_changed',
      resource_type: 'product',
      resource_id: productId,
      old_value: { status: existing.status },
      new_value: { status: parsed.data.status },
      notes: `Produk "${existing.name}": ${existing.status} → ${parsed.data.status}`,
    })

    return NextResponse.json({ status: 'ok', new_status: parsed.data.status })
  } catch (err: any) {
    console.error('[PATCH product status] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
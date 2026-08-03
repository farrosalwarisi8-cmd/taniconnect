import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// Schema untuk PATCH (update partial)
const updateSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  category: z.enum(['sayuran', 'buah', 'beras_padi', 'rempah', 'lainnya']).optional(),
  description: z.string().max(2000).nullable().optional(),
  price_per_unit: z.number().positive().optional(),
  unit: z.string().min(1).max(20).optional(),
  stock_quantity: z.number().nonnegative().optional(),
  province: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  harvest_date: z.string().nullable().optional(),
  is_auction: z.boolean().optional(),
  auction_end_time: z.string().nullable().optional(),
  min_bid_increment: z.number().positive().nullable().optional(),
  image_paths: z.array(z.string()).optional(),
  status: z.enum(['active', 'sold', 'draft']).optional(),
})

// ─── PATCH: Update produk ─────────────────────────────────────
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

    // Verifikasi ownership: cari produk & cek seller_id
    const { data: existingData, error: fetchError } = await supabase
      .from('products')
      .select('id, seller_id, name, status')
      .eq('id', productId)
      .maybeSingle()

    const existing = existingData as { id: string; seller_id: string; name: string; status: string } | null

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    if (existing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Bukan produk milikmu' }, { status: 403 })
    }

    // Validate body
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Update
    const { error: updateError } = await supabase
      .from('products')
      .update(parsed.data)
      .eq('id', productId)
      .eq('seller_id', user.id) // Double check di query level

    if (updateError) {
      console.error('[PATCH product] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Ambil role user untuk audit
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profileData as { role: string } | null)?.role ?? null

    // Audit log
    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: 'product.updated',
      resource_type: 'product',
      resource_id: productId,
      old_value: { name: existing.name, status: existing.status },
      new_value: parsed.data,
      notes: `Petani update produk "${existing.name}"`,
    })

    return NextResponse.json({ status: 'ok', updated: parsed.data })
  } catch (err: any) {
    console.error('[PATCH product] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}

// ─── DELETE: Hapus produk (soft-delete via status='draft' kalau ada transaksi) ─
export async function DELETE(
  _req: NextRequest,
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
      .select('id, seller_id, name, image_paths')
      .eq('id', productId)
      .maybeSingle()

    const existing = existingData as { id: string; seller_id: string; name: string; image_paths: string[] } | null

    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    if (existing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Bukan produk milikmu' }, { status: 403 })
    }

    // Cek apakah ada transaksi yang terkait
    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)

    let action: 'deleted' | 'archived' = 'deleted'

    if (txCount && txCount > 0) {
      // Ada transaksi → soft delete (ubah status ke draft, sembunyikan dari marketplace)
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'draft' })
        .eq('id', productId)
        .eq('seller_id', user.id)

      if (updateError) throw updateError
      action = 'archived'
    } else {
      // Belum ada transaksi → hard delete
      // Hapus foto dari storage dulu
      if (existing.image_paths && existing.image_paths.length > 0) {
        const pathsToDelete = existing.image_paths.filter(p => !p.startsWith('http'))
        if (pathsToDelete.length > 0) {
          await supabase.storage.from('product-images').remove(pathsToDelete)
        }
      }

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', user.id)

      if (deleteError) throw deleteError
      action = 'deleted'
    }

    // Ambil role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profileData as { role: string } | null)?.role ?? null

    await logAudit({
      actor_id: user.id,
      actor_role: role as any,
      action: `product.${action}`,
      resource_type: 'product',
      resource_id: productId,
      old_value: { name: existing.name },
      notes: action === 'archived'
        ? `Produk "${existing.name}" diarsipkan (ada ${txCount} transaksi terkait)`
        : `Produk "${existing.name}" dihapus permanen`,
    })

    return NextResponse.json({ status: 'ok', action })
  } catch (err: any) {
    console.error('[DELETE product] error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
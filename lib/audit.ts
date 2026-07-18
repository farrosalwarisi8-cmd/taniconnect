import { createAdminSupabaseClient } from './supabase/server'
import { headers } from 'next/headers'
import type { TablesInsert } from './supabase/client'

interface AuditLogInput {
  actor_id?:      string | null
  actor_role?:    'petani' | 'pembeli' | 'penyedia_alat' | 'admin' | null
  action:         string
  resource_type:  string
  resource_id?:   string | null
  old_value?:     Record<string, unknown> | null
  new_value?:     Record<string, unknown> | null
  notes?:         string | null
}

/**
 * Insert audit log — WAJIB untuk aksi sensitif.
 */
export async function logAudit(input: AuditLogInput) {
  try {
    const supabase = createAdminSupabaseClient()
    const headersList = await headers()

    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
      headersList.get('x-real-ip') ??
      null

    const userAgent = headersList.get('user-agent') ?? null

    const insertData: TablesInsert<'audit_logs'> = {
      actor_id:      input.actor_id ?? null,
      actor_role:    input.actor_role ?? null,
      action:        input.action,
      resource_type: input.resource_type,
      resource_id:   input.resource_id ?? null,
      old_value:     input.old_value ?? null,
      new_value:     input.new_value ?? null,
      ip_address:    ip,
      user_agent:    userAgent,
      notes:         input.notes ?? null,
    }

    await supabase.from('audit_logs').insert(insertData)
  } catch (err) {
    console.error('[AUDIT LOG FAILED]', err)
  }
}
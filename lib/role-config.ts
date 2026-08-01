// lib/role-config.ts
//
// Single source of truth untuk mapping role → UI config (emoji, label, href).
// Dipakai di:
//   - app/(auth)/login/page.tsx        (RoleSelectorModal)
//   - app/unauthorized/page.tsx        (opsi switch dashboard)
//
// Kalau ada role baru ditambahkan ke UserRole, tambahkan entry di sini.
import type { UserRole } from '@/lib/supabase/client'

export interface RoleConfig {
    emoji: string
    label: string
    href: string
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
    petani: { emoji: '🌾', label: 'Petani', href: '/petani/dashboard' },
    pembeli: { emoji: '🛒', label: 'Pembeli', href: '/pembeli/marketplace' },
    penyedia_alat: { emoji: '🚜', label: 'Penyedia Alat', href: '/penyedia/dashboard' },
    admin: { emoji: '🔐', label: 'Administrator', href: '/admin/dashboard' },
}
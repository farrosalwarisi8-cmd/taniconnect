import { normalizeUserRole } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/client'

/** Role yang boleh dipilih user sendiri (bukan admin) */
export const SELF_ASSIGNABLE_ROLES: UserRole[] = ['petani', 'pembeli', 'penyedia_alat']

/** Prefix route → role yang diizinkan */
export const ROLE_REQUIRED: Record<string, UserRole[]> = {
  '/admin': ['admin'],
  '/petani': ['petani', 'admin'],
  '/penyedia': ['penyedia_alat', 'admin'],
  '/pembeli': ['pembeli', 'petani', 'penyedia_alat', 'admin'],
}

export interface ResolvedRoles {
  activeRole: UserRole | null
  roles: UserRole[]
}

export function resolveUserRoles(input: {
  dbRole?: string | null
  dbRoles?: string[] | null
  metaRole?: string | null
  metaRoles?: string[] | null
}): ResolvedRoles {
  const activeRole = normalizeUserRole(input.dbRole ?? input.metaRole) as UserRole | null

  const rawRoles = input.dbRoles ?? input.metaRoles ?? (activeRole ? [activeRole] : [])
  const normalized = rawRoles
    .map(r => normalizeUserRole(r) as UserRole | null)
    .filter((r): r is UserRole => Boolean(r))

  const roles: UserRole[] =
    normalized.length > 0
      ? [...new Set(normalized)]
      : activeRole
        ? [activeRole]
        : ['pembeli']

  return {
    activeRole: activeRole ?? roles[0] ?? 'pembeli',
    roles,
  }
}

export function getAllowedRolesForPath(pathname: string): UserRole[] | null {
  const matchedPrefix = Object.keys(ROLE_REQUIRED).find(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  return matchedPrefix ? ROLE_REQUIRED[matchedPrefix] : null
}

export function canAccessPath(pathname: string, resolved: ResolvedRoles): boolean {
  const allowedRoles = getAllowedRolesForPath(pathname)
  if (!allowedRoles) return true

  const { activeRole, roles } = resolved
  return (
    (activeRole !== null && allowedRoles.includes(activeRole)) ||
    roles.some(r => allowedRoles.includes(r))
  )
}

export function getDashboardForRole(role: UserRole): string {
  const map: Record<UserRole, string> = {
    petani: '/petani/dashboard',
    pembeli: '/pembeli/marketplace',
    penyedia_alat: '/penyedia/dashboard',
    admin: '/admin/dashboard',
  }
  return map[role] ?? '/pembeli/marketplace'
}

export function getSafeRedirectPath(
  redirectTo: string | null,
  resolved: ResolvedRoles
): string {
  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return getDashboardForRole(resolved.activeRole ?? resolved.roles[0] ?? 'pembeli')
  }

  if (canAccessPath(redirectTo, resolved)) {
    return redirectTo
  }

  return getDashboardForRole(resolved.activeRole ?? resolved.roles[0] ?? 'pembeli')
}

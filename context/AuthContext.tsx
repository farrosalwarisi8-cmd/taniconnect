'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, type UserRole } from '@/lib/supabase/client'
import { ROLE_CONFIG } from '@/lib/role-config'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export interface UserProfileInfo {
  id: string
  fullName: string
  email: string | null
  role: UserRole
  roles: UserRole[]
  initial: string
}

interface AuthContextType {
  user: UserProfileInfo | null
  activeRole: UserRole
  roles: UserRole[]
  loading: boolean
  switching: boolean
  switchRole: (newRole: UserRole) => Promise<boolean>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeRole: 'pembeli',
  roles: ['pembeli'],
  loading: true,
  switching: false,
  switchRole: async () => false,
  refreshProfile: async () => {},
})

const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<UserProfileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, role, roles')
        .eq('id', userId)
        .maybeSingle()

      if (profile) {
        const p = profile as { full_name: string | null; email: string | null; role: UserRole | null; roles: UserRole[] | null }
        const activeRole: UserRole = p.role ?? 'pembeli'
        const roles: UserRole[] = p.roles && p.roles.length > 0 ? p.roles : [activeRole]

        setUser({
          id: userId,
          fullName: p.full_name ?? 'Pengguna',
          email: p.email ?? null,
          role: activeRole,
          roles,
          initial: (p.full_name?.[0] ?? 'P').toUpperCase(),
        })
      } else {
        setUser({
          id: userId,
          fullName: 'Pengguna',
          email: null,
          role: 'pembeli',
          roles: ['pembeli'],
          initial: 'P',
        })
      }
    } catch (err) {
      console.error('[AuthProvider] Error fetching profile:', err)
      setUser(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      await fetchProfile(authUser.id)
    } else {
      setUser(null)
    }
  }, [fetchProfile])

  useEffect(() => {
    let isSubscribed = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isSubscribed) {
          if (session?.user) {
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
          }
        }
      } catch (err) {
        console.error('[AuthProvider] Init auth error:', err)
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (!isSubscribed) return
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      isSubscribed = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const switchRole = async (newRole: UserRole): Promise<boolean> => {
    if (!user || switching) return false
    setSwitching(true)

    try {
      const res = await fetch('/api/user/active-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_role: newRole }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[AuthProvider] Switch role error:', errData)
        setSwitching(false)
        return false
      }

      await supabase.auth.refreshSession()
      
      // Update local user state immediately
      setUser(prev => prev ? { ...prev, role: newRole } : null)

      const targetHref = ROLE_CONFIG[newRole]?.href ?? '/'
      window.location.href = targetHref
      return true
    } catch (err) {
      console.error('[AuthProvider] Exception during switchRole:', err)
      setSwitching(false)
      return false
    }
  }

  const activeRole: UserRole = user?.role ?? 'pembeli'
  const roles: UserRole[] = user?.roles ?? ['pembeli']

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        roles,
        loading,
        switching,
        switchRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

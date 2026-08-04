'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { getDisplayName, getInitials, formatDateID } from '@/lib/utils'

export interface UserProfileItem {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  roles: string[] | null
  is_verified: boolean | null
  city: string | null
  province: string | null
  created_at: string
}

interface Props {
  initialUsers: UserProfileItem[]
}

const AVAILABLE_ROLES = [
  { value: 'pembeli', label: '🛒 Pembeli', desc: 'Beli produk hasil panen', adminOnly: false },
  { value: 'petani', label: '🌾 Petani', desc: 'Jual hasil panen & catat keuangan', adminOnly: false },
  { value: 'penyedia_alat', label: '🚜 Penyedia Alat', desc: 'Sewakan / jual alat & bahan tani', adminOnly: false },
  { value: 'admin', label: '🔐 Administrator', desc: 'Akses penuh ke Admin Panel — hanya admin yang bisa assign', adminOnly: true },
]

export function UserRoleManager({ initialUsers }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserProfileItem[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserProfileItem | null>(null)
  const [newRole, setNewRole] = useState<string>('pembeli')
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState(false)

  const filteredUsers = users.filter((u) => {
    const nameMatch = (u.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const emailMatch = (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const phoneMatch = (u.phone ?? '').includes(searchTerm)
    const matchesSearch = nameMatch || emailMatch || phoneMatch

    if (roleFilter === 'all') return matchesSearch
    return matchesSearch && (u.role === roleFilter || (u.roles && u.roles.includes(roleFilter)))
  })

  const openEditModal = (userItem: UserProfileItem) => {
    setSelectedUser(userItem)
    const currentPrimary = userItem.role ?? 'pembeli'
    setNewRole(currentPrimary)

    const initialRolesSet = new Set<string>(
      userItem.roles && userItem.roles.length > 0
        ? userItem.roles
        : [currentPrimary]
    )
    setSelectedRoles(initialRolesSet)
  }

  const toggleRoleCheck = (roleVal: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(roleVal)) {
        if (next.size === 1) {
          toast('User harus memiliki minimal 1 role', 'warning')
          return prev
        }
        next.delete(roleVal)
      } else {
        next.add(roleVal)
      }
      return next
    })
  }

  const handleSaveRole = async () => {
    if (!selectedUser) return
    setUpdating(true)

    try {
      const rolesArray = Array.from(selectedRoles)
      const primary = selectedRoles.has(newRole) ? newRole : rolesArray[0]

      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          newRole: primary,
          newRoles: rolesArray,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Gagal memperbarui role')
      }

      toast(data.message ?? 'Role berhasil diperbarui!', 'success')

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, role: primary, roles: rolesArray }
            : u
        )
      )

      setSelectedUser(null)
      router.refresh()
    } catch (err: any) {
      toast(err.message ?? 'Gagal mengubah role', 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari nama, email, atau HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-light border border-border rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <span className="absolute left-3.5 top-3 text-fg/40 text-sm">🔍</span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-fg/60 uppercase shrink-0">Filter:</span>
          {['all', 'petani', 'pembeli', 'penyedia_alat', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all capitalize ${
                roleFilter === r
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-surface-light text-fg/70 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              {r === 'all' ? 'Semua Role' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-light border-b border-border text-fg/60 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Role Utama</th>
                <th className="px-6 py-4">Daftar Roles</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-fg/50">
                    Tidak ada data pengguna yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                          {getInitials(userItem.full_name, 'U')}
                        </div>
                        <div>
                          <p className="font-semibold text-fg-dark">
                            {getDisplayName(userItem.full_name, 'User')}
                          </p>
                          <p className="text-xs text-fg/50">
                            {userItem.city ? `📍 ${userItem.city}` : 'Lokasi -'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-fg-dark">{userItem.email ?? '-'}</p>
                      <p className="text-xs text-fg/50">{userItem.phone ?? '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          userItem.role === 'admin'
                            ? 'info'
                            : userItem.role === 'petani'
                            ? 'success'
                            : userItem.role === 'penyedia_alat'
                            ? 'neutral'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {userItem.role === 'admin'
                          ? '🔐 Admin'
                          : userItem.role === 'petani'
                          ? '🌾 Petani'
                          : userItem.role === 'penyedia_alat'
                          ? '🚜 Penyedia'
                          : '🛒 Pembeli'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(userItem.roles && userItem.roles.length > 0
                          ? userItem.roles
                          : [userItem.role ?? 'pembeli']
                        ).map((roleTag) => (
                          <span
                            key={roleTag}
                            className="bg-surface-light text-fg/70 border border-border text-[11px] font-medium px-2 py-0.5 rounded-md"
                          >
                            {roleTag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(userItem)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors min-h-0 touch-target-exempt"
                      >
                        Ubah Role ⚙️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-fg-dark">Ubah Role User</h3>
                <p className="text-xs text-fg/60 mt-0.5">
                  {selectedUser.full_name ?? selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-surface-light hover:bg-surface text-fg/50 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Checkbox multi-roles — admin role hanya tersedia di panel admin */}
            <div>
              <label className="block text-xs font-bold text-fg/70 uppercase tracking-wider mb-2">
                Pilih Role yang Dimiliki User
              </label>
              <p className="text-xs text-fg/50 mb-3">
                Role <strong>Administrator</strong> hanya bisa diberikan oleh admin melalui halaman ini.
              </p>
              <div className="space-y-2">
                {AVAILABLE_ROLES.map((r) => {
                  const isChecked = selectedRoles.has(r.value)
                  return (
                    <div
                      key={r.value}
                      onClick={() => toggleRoleCheck(r.value)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-purple-600 bg-purple-50/50'
                          : 'border-border bg-white hover:border-purple-200'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm text-fg-dark">{r.label}</p>
                        <p className="text-xs text-fg/60">{r.desc}</p>
                        {r.adminOnly && (
                          <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Khusus Admin</p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-5 h-5 accent-purple-600 rounded"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Radio role utama */}
            <div>
              <label className="block text-xs font-bold text-fg/70 uppercase tracking-wider mb-2">
                Role Utama (Primary Dashboard)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full p-3 bg-surface-light border border-border rounded-xl font-semibold text-sm focus:outline-none focus:border-purple-500"
              >
                {Array.from(selectedRoles).map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 rounded-xl border border-border font-semibold text-sm text-fg/70 hover:bg-surface"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={updating}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md disabled:opacity-50 transition-colors"
              >
                {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function UserRoleManagerWithToast(props: Props) {
  return (
    <ToastProvider>
      <UserRoleManager {...props} />
    </ToastProvider>
  )
}

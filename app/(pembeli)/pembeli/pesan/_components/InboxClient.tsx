'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface ConversationView {
  id:              string
  other_name:      string
  other_initial:   string
  role_label:      string
  last_message:    string | null
  last_message_at: string
  product_name:    string | null
  unread_count:    number
}

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}j`
  if (diffDay < 7) return `${diffDay}h`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function InboxClient({ conversations }: { conversations: ConversationView[] }) {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-[52px] z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/pembeli/marketplace" className="text-gray-500 hover:text-primary-dark text-sm min-h-0">
            ← Marketplace
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-base font-semibold text-gray-900">💬 Pesan Saya</h1>
          {conversations.length > 0 && (
            <span className="ml-auto text-xs text-gray-500">
              {conversations.length} percakapan
            </span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Belum ada percakapan</h2>
            <p className="text-sm text-gray-500 mb-6">
              Mulai chat dengan penjual dari halaman produk untuk bertanya tentang barang.
            </p>
            <Link
              href="/pembeli/marketplace"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors min-h-[48px]"
            >
              🛒 Ke Marketplace
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {conversations.map(c => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors min-h-0',
                  c.unread_count > 0 && 'bg-blue-50/30'
                )}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {c.other_initial}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'text-sm truncate',
                      c.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                    )}>
                      {c.other_name}
                    </p>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                      {c.role_label}
                    </span>
                  </div>
                  {c.product_name && (
                    <p className="text-[11px] text-gray-400 truncate">
                      📦 {c.product_name}
                    </p>
                  )}
                  <p className={cn(
                    'text-xs truncate mt-0.5',
                    c.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                  )}>
                    {c.last_message ?? 'Belum ada pesan'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {formatRelativeTime(c.last_message_at)}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {c.unread_count > 99 ? '99+' : c.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
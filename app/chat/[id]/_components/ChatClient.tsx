// app/chat/[id]/_components/ChatClient.tsx
//
// Client component untuk interaksi chat:
// - Realtime subscription ke messages
// - Send message via supabase insert (RLS jaga participant check)
// - Auto-scroll ke bawah saat message baru
// - Mark messages as read saat masuk (opsional, best effort)
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MessageView {
  id:              string
  created_at:      string
  conversation_id: string
  sender_id:       string
  text:            string
  image_url:       string | null
  is_read:         boolean
}

interface Props {
  conversationId:   string
  currentUserId:    string
  initialMessages:  MessageView[]
}

export function ChatClient({ conversationId, currentUserId, initialMessages }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<MessageView[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ─── Auto-scroll ke bawah ─────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ─── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: { new: any }) => {
          const newMsg = payload.new as MessageView
          setMessages(prev => {
            // Prevent duplicate (kalau pesan sudah ada dari optimistic insert)
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  // ─── Mark unread messages sebagai read (best effort) ──────────────────────
  useEffect(() => {
    const unreadFromOthers = messages.filter(
      m => !m.is_read && m.sender_id !== currentUserId
    )
    if (unreadFromOthers.length === 0) return

    const ids = unreadFromOthers.map(m => m.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('messages') as any)
      .update({ is_read: true })
      .in('id', ids)
      .then(() => {
        // Update local state
        setMessages(prev => prev.map(m =>
          ids.includes(m.id) ? { ...m, is_read: true } : m
        ))
      })
  }, [messages, currentUserId, supabase])

  // ─── Kirim pesan ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || sending) return

    if (text.length > 2000) {
      setError('Pesan terlalu panjang (max 2000 karakter)')
      return
    }

    setSending(true)
    setError(null)
    setInputText('')

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from('messages') as any)
        .insert({
          conversation_id: conversationId,
          sender_id:       currentUserId,
          text,
        })

      if (insertError) {
        setError(`Gagal kirim: ${insertError.message}`)
        // Restore input agar user bisa retry
        setInputText(text)
      }
      // Message akan muncul via realtime subscription — tidak perlu manual add
    } catch {
      setError('Koneksi terputus')
      setInputText(text)
    } finally {
      setSending(false)
    }
  }, [inputText, sending, conversationId, currentUserId, supabase])

  return (
    <>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl mx-auto w-full"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-sm">Belum ada pesan. Mulai percakapan!</p>
          </div>
        )}

        {messages.map(m => {
          const isMine = m.sender_id === currentUserId
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[75%] break-words shadow-sm ${
                  isMine
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 rounded-bl-sm text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                <p
                  className={`text-[10px] mt-1 flex items-center gap-1 ${
                    isMine ? 'text-white/70 justify-end' : 'text-gray-400'
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isMine && (
                    <span title={m.is_read ? 'Dibaca' : 'Terkirim'}>
                      {m.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={sendMessage}
        className="bg-white border-t border-gray-200 shadow-lg"
      >
        <div className="max-w-3xl mx-auto px-3 py-3">
          {error && (
            <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Tulis pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
              rows={1}
              maxLength={2000}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-2xl resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-0"
              style={{ maxHeight: '120px' }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold text-sm rounded-2xl disabled:opacity-50 transition-colors shrink-0 min-h-0"
            >
              {sending ? '...' : 'Kirim'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
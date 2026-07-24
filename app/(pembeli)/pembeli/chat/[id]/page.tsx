'use client'

import { useEffect, useState, useRef } from 'react'
import { use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Message {
  id: string
  created_at: string
  conversation_id: string
  sender_id: string
  text: string
  image_url: string | null
  is_read: boolean
}

interface Props {
  params: Promise<{ id: string }>
}

export default function ChatPage({ params }: Props) {
  const { id: conversationId } = use(params)
  const supabase = createClient()

  const [messages, setMessages]   = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [userId, setUserId]       = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 1. Get current user
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
    }
    loadUser()

    // 2. Fetch history
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      setMessages((data as Message[]) || [])
    }
    fetchMessages()

    // 3. Realtime Subscription
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
        (payload: { new: Message }) => {
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !userId) return

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id:       userId,
      text:            inputText.trim(),
    })
    setInputText('')
  }

  return (
    <main className="flex flex-col h-screen bg-surface-light">
      {/* Header */}
      <header className="p-4 bg-white border-b border-border">
        <h1 className="text-h4 font-semibold text-fg-dark">Chat</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-fg/60 py-8">
            <p className="text-body">Belum ada pesan. Mulai percakapan!</p>
          </div>
        )}

        {messages.map(m => {
          const isMine = m.sender_id === userId
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[70%] break-words ${
                  isMine
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-white border border-border rounded-bl-none'
                }`}
              >
                <p className="text-body">{m.text}</p>
                <p className={`text-caption mt-1 ${isMine ? 'text-white/70' : 'text-fg/50'}`}>
                  {new Date(m.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-border flex gap-2">
        <div className="flex-1">
          <Input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Tulis pesan..."
          />
        </div>
        <Button type="submit" disabled={!inputText.trim()}>
          Kirim
        </Button>
      </form>
    </main>
  )
}
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { VoiceInputButton } from './_components/VoiceInputButton'

interface Message {
  role:    'user' | 'assistant'
  content: string
  time:    string
}

const SUGGESTED_QUESTIONS = [
  { emoji: '🐛', text: 'Cara mengatasi hama wereng di padi?' },
  { emoji: '🌧️', text: 'Kapan waktu terbaik menanam padi?' },
  { emoji: '💊', text: 'Dosis pupuk urea yang tepat untuk cabai?' },
  { emoji: '🌿', text: 'Penyakit tanaman cabai dan solusinya?' },
]

function ChatbotFlow() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const getTime = () => new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  })

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: 'user', content: text.trim(), time: getTime() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputText('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        let message = 'Gagal mendapat jawaban'
        try {
          const err = await res.json()
          message = err.error || message
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      const data = await res.json()
      const reply = typeof data?.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : 'Maaf, saya belum bisa memberikan jawaban saat ini.'

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        time: getTime(),
      }])
    } catch (err: any) {
      toast(err.message, 'error')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Maaf, terjadi kendala. Silakan coba lagi sebentar lagi.',
        time: getTime(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/pembeli/marketplace"
            className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-surface min-h-0"
            aria-label="Kembali"
          >
            ←
          </Link>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg shrink-0">
            🌾
          </div>
          <div>
            <h1 className="text-h4 font-bold text-fg-dark">Pak Tani AI</h1>
            <p className="text-caption text-primary-dark">🟢 Online • Siap membantu</p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-card border border-border p-6 text-center">
                <div className="text-5xl mb-3">🌾</div>
                <h2 className="text-h2 text-fg-dark mb-2">Halo, Pak/Bu Tani! 👋</h2>
                <p className="text-body text-fg/70">
                  Saya siap menjawab pertanyaanmu seputar pertanian.
                  Tanya apa saja tentang hama, pupuk, cuaca, atau teknik tanam.
                </p>

                {/* Voice tips banner */}
                <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary-dark px-4 py-2 rounded-full text-caption">
                  <span className="text-lg">🎤</span>
                  <span className="font-semibold">Tips: Tekan tombol mic untuk bicara!</span>
                </div>
              </div>

              <p className="text-caption text-fg/60 text-center">💡 Contoh pertanyaan:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(q.text)}
                    className="text-left p-4 rounded-btn bg-white border border-border hover:border-primary-light hover:shadow-md transition-all min-h-0"
                  >
                    <span className="text-2xl mr-2">{q.emoji}</span>
                    <span className="text-sm text-fg-dark">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                m.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm shrink-0">
                  🌾
                </div>
              )}
              <div className="max-w-[75%]">
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl whitespace-pre-wrap break-words',
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-white border border-border text-fg rounded-bl-sm'
                  )}
                >
                  {m.content}
                </div>
                <p className={cn(
                  'text-caption text-fg/50 mt-1',
                  m.role === 'user' ? 'text-right' : 'text-left'
                )}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm shrink-0">
                🌾
              </div>
              <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input bar dengan Voice Input */}
      <div className="bg-white border-t border-border p-4 sticky bottom-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(inputText) }}
          className="max-w-3xl mx-auto flex gap-2 items-center"
        >
          {/* ⭐ Voice Input Button */}
          <VoiceInputButton
            onTranscript={(text) => setInputText(text)}
            onFinal={(text) => {
              // Auto-send setelah selesai bicara
              if (text.trim()) {
                setTimeout(() => sendMessage(text.trim()), 300)
              }
            }}
            disabled={loading}
          />

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Tulis atau tekan 🎤 untuk bicara..."
            disabled={loading}
            className="flex-1 bg-surface border border-border rounded-full px-5 py-3 text-base min-h-[48px] focus:outline-none focus:border-primary disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed shrink-0 min-h-0"
            aria-label="Kirim"
          >
            ➤
          </button>
        </form>

        {/* Hint text */}
        <p className="text-caption text-fg/50 text-center mt-2 max-w-3xl mx-auto">
          💡 <strong>Tips:</strong> Tekan tombol 🎤 dan bicara — cocok untuk yang tidak biasa mengetik
        </p>
      </div>
    </main>
  )
}

export default function TanyaAIPage() {
  return (
    <ToastProvider>
      <ChatbotFlow />
    </ToastProvider>
  )
}
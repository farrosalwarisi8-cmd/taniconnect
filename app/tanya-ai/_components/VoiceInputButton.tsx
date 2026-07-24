'use client'

import { useState, useEffect } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { cn } from '@/lib/utils'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  onFinal?: (text: string) => void
  disabled?: boolean
}

export function VoiceInputButton({
  onTranscript,
  onFinal,
  disabled = false,
}: VoiceInputButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [timer, setTimer] = useState(0)

  const {
    isListening,
    isSupported,
    interimTranscript,
    error,
    start,
    stop,
  } = useSpeechRecognition({
    lang: 'id-ID',
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      onTranscript(text)
      if (isFinal) onFinal?.(text)
    },
  })

  // Timer saat merekam
  useEffect(() => {
    if (!isListening) {
      setTimer(0)
      return
    }

    const interval = setInterval(() => {
      setTimer(t => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isListening])

  // Auto-stop kalau > 30 detik (biar ga infinite)
  useEffect(() => {
    if (timer >= 30) {
      stop()
    }
  }, [timer, stop])

  // Show tooltip pertama kali user visit
  useEffect(() => {
    if (typeof window === 'undefined') return

    const seenBefore = localStorage.getItem('taniconnect_voice_tip_seen')
    if (!seenBefore) {
      setShowTooltip(true)
      const timeout = setTimeout(() => {
        setShowTooltip(false)
        localStorage.setItem('taniconnect_voice_tip_seen', '1')
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [])

  const handleClick = () => {
    if (isListening) {
      stop()
    } else {
      setShowTooltip(false)
      localStorage.setItem('taniconnect_voice_tip_seen', '1')
      start()
    }
  }

  // Kalau browser ga support, kasih tombol disabled dengan tooltip
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="w-12 h-12 rounded-full bg-surface-light text-fg/40 flex items-center justify-center shrink-0 min-h-0 cursor-not-allowed"
        title="Voice input hanya di Chrome/Edge"
        aria-label="Voice input tidak didukung"
      >
        🎤
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Tooltip pertama kali */}
      {showTooltip && !isListening && (
        <div className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-50 animate-slide-in-right">
          <div className="bg-primary-dark text-white px-4 py-2 rounded-sm shadow-lg text-sm whitespace-nowrap">
            <span className="font-semibold">💡 Tekan mic untuk bicara!</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-primary-dark" />
          </div>
        </div>
      )}

      {/* Modal recording overlay */}
      {isListening && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
             onClick={stop}
        >
          <div
            className="bg-white rounded-DEFAULT p-8 max-w-md w-full text-center shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Waveform animation */}
            <div className="flex items-end justify-center gap-1 h-20 mb-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <div
                  key={i}
                  className="w-3 bg-primary rounded-full animate-pulse-dot"
                  style={{
                    height: `${20 + Math.abs(Math.sin(Date.now() / 200 + i)) * 60}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>

            <p className="text-h3 text-fg-dark font-bold mb-2">🎤 Sedang Mendengar...</p>
            <p className="text-caption text-fg/60 mb-4">Silakan bicara dalam Bahasa Indonesia</p>

            {/* Live transcript */}
            {interimTranscript && (
              <div className="bg-green-50 border border-primary-light rounded-sm p-3 mb-4 text-left">
                <p className="text-caption text-primary-dark font-semibold mb-1">Yang didengar:</p>
                <p className="text-body text-fg-dark italic">"{interimTranscript}"</p>
              </div>
            )}

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-caption text-fg/60 font-mono">
                {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')} / 00:30
              </span>
            </div>

            {/* Stop button */}
            <button
              type="button"
              onClick={stop}
              className="bg-error text-white font-semibold px-6 py-3 rounded-full min-h-[48px] hover:bg-red-600 transition-colors"
            >
              ⏹️ Selesai Bicara
            </button>

            <p className="text-caption text-fg/50 mt-4">
              Ketuk area gelap untuk membatalkan
            </p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && !isListening && (
        <div className="absolute bottom-full mb-3 right-0 z-50 max-w-xs">
          <div className="bg-error text-white px-4 py-2 rounded-sm shadow-lg text-sm">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Mic Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center shrink-0 min-h-0 transition-all relative',
          isListening
            ? 'bg-error text-white scale-110 shadow-lg'
            : 'bg-primary/10 text-primary-dark hover:bg-primary/20',
          disabled && 'opacity-40 cursor-not-allowed',
          !isListening && !disabled && 'animate-glow-pulse',
        )}
        aria-label={isListening ? 'Berhenti merekam' : 'Tekan untuk bicara'}
        title={isListening ? 'Ketuk untuk berhenti' : 'Tekan untuk bicara ke AI'}
      >
        <span className="text-xl">
          {isListening ? '⏹️' : '🎤'}
        </span>
      </button>
    </div>
  )
}
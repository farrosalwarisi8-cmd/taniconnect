'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

/**
 * Hook untuk Web Speech Recognition API.
 * Support di Chrome, Edge, Safari (butuh permission mic).
 *
 * Usage:
 *   const { isListening, transcript, start, stop } = useSpeechRecognition({
 *     lang: 'id-ID',
 *     onResult: (text, isFinal) => { ... },
 *   })
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'id-ID',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef<string>('')

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = lang
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = finalTranscriptRef.current

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          final += text + ' '
          finalTranscriptRef.current = final
          onResult?.(text.trim(), true)
        } else {
          interim += text
          onResult?.(text, false)
        }
      }

      setTranscript(final.trim())
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        'no-speech':       'Tidak ada suara terdeteksi. Coba lagi.',
        'audio-capture':   'Mikrofon tidak ditemukan.',
        'not-allowed':     'Akses mikrofon ditolak. Izinkan di setting browser.',
        'network':         'Koneksi bermasalah. Cek internet.',
        'aborted':         '',
        'language-not-supported': 'Bahasa tidak didukung.',
      }

      const message = errorMessages[event.error] ?? `Error: ${event.error}`
      if (message) {
        setError(message)
        onError?.(message)
      }
      setIsListening(false)
    }

    recognition.onstart = () => {
      setError(null)
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
      onEnd?.()
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.abort()
      } catch {
        // ignore
      }
    }
  }, [lang, continuous, interimResults, onResult, onError, onEnd])

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return

    setError(null)
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Sudah started, ignore
    }
  }, [isListening])

  const stop = useCallback(() => {
    if (!recognitionRef.current || !isListening) return

    try {
      recognitionRef.current.stop()
    } catch {
      // ignore
    }
  }, [isListening])

  const reset = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  }
}
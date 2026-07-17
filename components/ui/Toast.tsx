'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clsx } from 'clsx'

type ToastType    = 'success' | 'error' | 'info' | 'warning'
type ToastPosition = 'bottom-right' | 'top-center'

interface Toast {
  id:       string
  type:     ToastType
  message:  string
  duration: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-l-4 border-l-primary text-green-800',
  error:   'bg-red-50 border-l-4 border-l-error text-red-800',
  info:    'bg-blue-50 border-l-4 border-l-blue-500 text-blue-800',
  warning: 'bg-amber-50 border-l-4 border-l-amber text-amber-800',
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const [visible, setVisible] = useState(true)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(t.id), 300)
    }, t.duration)

    // Animasi progress bar
    if (progressRef.current) {
      progressRef.current.style.transition = `width ${t.duration}ms linear`
      progressRef.current.style.width = '0%'
    }

    return () => clearTimeout(timer)
  }, [t.id, t.duration, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'relative flex items-start gap-3 px-5 py-4 rounded-sm shadow-md',
        'min-w-[280px] max-w-[360px] overflow-hidden',
        'transition-all duration-300',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2',
        TOAST_STYLES[t.type],
      )}
    >
      {/* Ikon */}
      <span className="shrink-0 font-bold text-lg leading-none mt-0.5">
        {TOAST_ICONS[t.type]}
      </span>

      {/* Pesan */}
      <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>

      {/* Tombol dismiss */}
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity min-h-0 ml-2"
        aria-label="Tutup notifikasi"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="absolute bottom-0 left-0 h-[3px] bg-current opacity-20 w-full"
        style={{ transition: 'none' }}
        aria-hidden="true"
      />
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, type, message, duration }])
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Container toast — bottom-right desktop, top-center mobile */}
      <div
        aria-label="Notifikasi"
        className={clsx(
          'fixed z-50 flex flex-col gap-3 p-4',
          // Mobile: top center
          'top-4 left-1/2 -translate-x-1/2',
          // Desktop: bottom right
          'sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0',
        )}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus digunakan di dalam ToastProvider')
  return ctx
}
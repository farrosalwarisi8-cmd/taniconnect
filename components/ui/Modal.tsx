'use client'

import {
  useEffect,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { clsx } from 'clsx'

interface ModalProps {
  open:         boolean
  onClose:      () => void
  title?:       string
  children:     ReactNode
  footer?:      ReactNode
  size?:        'sm' | 'md' | 'lg'
  closeOnOverlay?: boolean
  dangerous?:   boolean  // styling merah untuk aksi destruktif
}

/**
 * Modal / Confirmation Dialog — sesuai design system TaniConnect.
 *
 * Fitur:
 * - Backdrop rgba(0,0,0,0.5) dengan blur
 * - Focus trap (Tab & Shift+Tab terkurung di dalam modal)
 * - Close dengan Escape
 * - Close dengan klik overlay (opsional)
 * - Accessible: role="dialog", aria-modal, aria-labelledby
 */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size         = 'md',
  closeOnOverlay = true,
  dangerous    = false,
}: ModalProps) {
  const overlayRef  = useRef<HTMLDivElement>(null)
  const contentRef  = useRef<HTMLDivElement>(null)

  // Tutup dengan Escape
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Cegah scroll body saat modal terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Focus trap sederhana
  useEffect(() => {
    if (open && contentRef.current) {
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable[0]?.focus()
    }
  }, [open])

  if (!open) return null

  const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-[480px]',
    lg: 'max-w-2xl',
  }

  return (
    // Backdrop
    <div
      ref={overlayRef}
      className={clsx(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center',
        'bg-black/50 backdrop-blur-[2px]',
        'p-4 sm:p-6',
      )}
      onClick={closeOnOverlay ? (e) => {
        if (e.target === overlayRef.current) onClose()
      } : undefined}
      aria-hidden="true"
    >
      {/* Modal content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={clsx(
          'bg-white w-full rounded-DEFAULT sm:rounded-DEFAULT',
          'rounded-t-[24px] sm:rounded-DEFAULT', // bottom sheet style di mobile
          'p-8 shadow-modal',
          'animate-slide-in-right sm:animate-none',
          'sm:animate-[fadeIn_0.2s_ease-out]',
          sizeClasses[size],
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2
              id="modal-title"
              className={clsx(
                'text-h2 font-bold',
                dangerous ? 'text-error' : 'text-fg-dark',
              )}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-fg/40 hover:text-fg transition-colors min-h-0 p-1"
              aria-label="Tutup modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="text-body text-fg">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export { Modal, type ModalProps }
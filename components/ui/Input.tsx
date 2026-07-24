'use client'

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { clsx } from 'clsx'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?:       string
  error?:       string
  success?:     boolean
  hint?:        string
  leftAddon?:   ReactNode
  rightAddon?:  ReactNode
  fullWidth?:   boolean
}

/**
 * Input — text field sesuai design system TaniConnect.
 *
 * FIX: Pakai React useId() supaya ID stable di server & client
 * (mencegah hydration mismatch dari Math.random()).
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      leftAddon,
      rightAddon,
      fullWidth = true,
      className,
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)

    // ⭐ useId() stable di SSR + CSR (tidak berubah antar render)
    const generatedId = useId()
    const inputId = id ?? generatedId

    const isPassword = type === 'password'

    const wrapperClass = clsx(
      'flex items-center gap-0',
      'bg-white border rounded-sm',
      'transition-all duration-150',
      'border-border',
      'focus-within:border-primary focus-within:shadow-focus',
      error && '!border-error',
      success && !error && '!border-success',
      props.disabled && 'opacity-60 cursor-not-allowed bg-surface-light',
    )

    return (
      <div className={clsx('flex flex-col gap-2', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-fg"
            style={{ fontSize: '14px', fontWeight: 600 }}
          >
            {label}
            {props.required && (
              <span className="text-error ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className={wrapperClass}>
          {/* Left addon (contoh: +62) */}
          {leftAddon && (
            <div className="flex items-center px-3 text-sm text-fg/70 border-r border-border bg-surface-light h-full min-h-[48px] rounded-l-sm shrink-0">
              {leftAddon}
            </div>
          )}

          {/* Input utama */}
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className={clsx(
              'flex-1 bg-transparent px-4 py-3',
              'text-fg placeholder:text-gray-400/70',
              'focus:outline-none',
              'text-base',
              'min-h-[48px]',
              leftAddon && 'pl-3',
              (rightAddon || isPassword) && 'pr-3',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              [
                error ? `${inputId}-error` : null,
                hint  ? `${inputId}-hint`  : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            {...props}
          />

          {/* Show/hide password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="px-3 text-fg/50 hover:text-fg transition-colors shrink-0 min-h-0"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          )}

          {/* Right addon kustom */}
          {rightAddon && !isPassword && (
            <div className="px-3 shrink-0">{rightAddon}</div>
          )}
        </div>

        {/* Pesan error */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-caption text-error flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="text-caption text-fg/60"
          >
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, type InputProps }
'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger'
type ButtonSize   = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  fullWidth?: boolean
  loading?:   boolean
  leftIcon?:  ReactNode
  rightIcon?: ReactNode
  children:   ReactNode
}

/**
 * Button — komponen dasar sesuai design system TaniConnect.
 *
 * Varian:
 * - primary:   bg #4ADE80, teks putih, shadow hijau (CTA utama per layar)
 * - secondary: bg putih, border abu, shadow md
 * - ghost:     bg transparan, pill shape, hover hijau transparan
 * - icon:      lingkaran 28×28px (touch target: wrapper 48×48px)
 * - danger:    bg #EF4444 untuk aksi destruktif (hapus, tolak)
 *
 * Touch target minimum 48px dipenuhi oleh min-height 48px di semua varian
 * kecuali 'icon' (yang punya wrapper 48×48 via padding).
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      fullWidth = false,
      loading   = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const base = clsx(
      // Fondasi
      'inline-flex items-center justify-center gap-2',
      'font-medium transition-all duration-150 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-primary focus-visible:ring-offset-2',
      'select-none cursor-pointer',
      'disabled:cursor-not-allowed disabled:opacity-60',
      // Full width
      fullWidth && 'w-full',
    )

    const variants: Record<ButtonVariant, string> = {
      primary: clsx(
        'bg-primary text-white rounded-sm',
        'shadow-btn-primary',
        'hover:bg-green-500 active:bg-success',
        'min-h-[48px]',
      ),
      secondary: clsx(
        'bg-white text-fg border border-border rounded-sm',
        'shadow-btn-secondary',
        'hover:bg-surface-light hover:border-teal',
        'min-h-[48px]',
      ),
      ghost: clsx(
        'bg-transparent text-fg rounded-full',
        'hover:bg-primary/10 hover:text-primary-dark',
        'min-h-[48px]',
      ),
      icon: clsx(
        // Icon button: 28×28 visual, tap area 48×48 via padding
        'bg-white border border-border rounded-full',
        'shadow-sm',
        'hover:bg-surface-light hover:border-primary-light',
        'p-[10px]', // (48 - 28) / 2 = 10px — touch area jadi 48px
        'w-12 h-12 !min-h-0', // override min-h untuk varian ini
      ),
      danger: clsx(
        'bg-error text-white rounded-sm',
        'hover:bg-red-600 active:bg-red-700',
        'min-h-[48px]',
      ),
    }

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-[14.4px] py-[7.2px] text-btn-sm',
      md: 'px-6 py-3 text-btn',
      lg: 'px-8 py-[14px] text-btn text-[17px]',
    }

    // Icon variant tidak pakai size classes
    const sizeClass = variant === 'icon' ? '' : sizes[size]

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={clsx(base, variants[variant], sizeClass, className)}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}

        {!loading && leftIcon && (
          <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
        )}

        <span>{children}</span>

        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, type ButtonProps, type ButtonVariant }
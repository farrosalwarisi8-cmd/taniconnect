import { type HTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

type CardVariant = 'standard' | 'elevated' | 'subtle'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?:  CardVariant
  hover?:    boolean
  children:  ReactNode
  padding?:  'sm' | 'md' | 'lg' | 'none'
}

/**
 * Card — tiga varian sesuai design system TaniConnect.
 *
 * - standard:  bg putih, border abu, shadow md. Hover: shadow lebih kuat + border teal.
 * - elevated:  bg putih, tanpa border, shadow lg (hijau). Untuk hero/fitur utama.
 * - subtle:    bg #F9FAFB, border abu, tanpa shadow. Untuk info sekunder.
 */
function Card({
  variant = 'standard',
  hover   = false,
  padding = 'md',
  children,
  className,
  ...props
}: CardProps) {

  const base = 'rounded-DEFAULT overflow-hidden'

  const variants: Record<CardVariant, string> = {
    standard: clsx(
      'bg-white border border-border shadow-md',
      hover && 'transition-all duration-200 hover:shadow-lg hover:border-primary-light cursor-pointer',
    ),
    elevated: clsx(
      'bg-white shadow-lg',
      hover && 'transition-all duration-200 hover:shadow-[0px_24px_56px_0px_rgba(15,118,67,0.28)] cursor-pointer',
    ),
    subtle: clsx(
      'bg-surface-light border border-border',
      hover && 'transition-all duration-200 hover:border-primary-light cursor-pointer',
    ),
  }

  const paddings: Record<NonNullable<CardProps['padding']>, string> = {
    none: '',
    sm:   'p-4',
    md:   'p-6',
    lg:   'p-8',
  }

  return (
    <div
      className={clsx(base, variants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card, type CardProps, type CardVariant }
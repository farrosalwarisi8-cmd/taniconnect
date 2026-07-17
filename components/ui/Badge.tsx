import { type HTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'success' | 'warning' | 'info' | 'error' | 'verified' | 'neutral'
type BadgeSize    = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?:    BadgeSize
  icon?:    ReactNode
  children: ReactNode
}

/**
 * Badge / Status Chip — sesuai design system TaniConnect.
 * Digunakan untuk status transaksi, label kategori, verifikasi, dll.
 */
function Badge({
  variant  = 'neutral',
  size     = 'sm',
  icon,
  children,
  className,
  ...props
}: BadgeProps) {

  const base = clsx(
    'inline-flex items-center gap-1 font-medium rounded-full',
    'whitespace-nowrap',
  )

  const variants: Record<BadgeVariant, string> = {
    success:  'bg-green-100 text-green-700',
    warning:  'bg-amber-light text-amber',
    info:     'bg-blue-50 text-blue-700',
    error:    'bg-red-50 text-red-600',
    verified: 'bg-green-50 text-green-700',
    neutral:  'bg-surface-light text-fg/70 border border-border',
  }

  const sizes: Record<BadgeSize, string> = {
    sm: 'px-[10px] py-1 text-[11px]',
    md: 'px-[14px] py-[6px] text-[13px]',
  }

  return (
    <span
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon && <span className="shrink-0 touch-target-exempt" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}

export { Badge, type BadgeProps, type BadgeVariant }
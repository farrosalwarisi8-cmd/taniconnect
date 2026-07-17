import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?:  string | number
  height?: string | number
  circle?: boolean
}

/**
 * Skeleton — loading placeholder dengan animasi shimmer.
 * Wajib digunakan di semua komponen yang mengambil data dari network.
 */
function Skeleton({
  width,
  height,
  circle = false,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Memuat..."
      className={clsx(
        'skeleton animate-shimmer',
        circle ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      style={{
        width:  width  ?? '100%',
        height: height ?? '1rem',
        ...style,
      }}
      {...props}
    />
  )
}

// Preset untuk pola umum
function SkeletonCard() {
  return (
    <div className="bg-white rounded-DEFAULT border border-border p-6 space-y-3">
      <Skeleton height={200} className="rounded-lg" />
      <Skeleton height={20} width="70%" />
      <Skeleton height={16} width="50%" />
      <div className="flex gap-2">
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={60} />
      </div>
      <Skeleton height={44} className="rounded-sm" />
    </div>
  )
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return <Skeleton width={size} height={size} circle />
}

export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar }
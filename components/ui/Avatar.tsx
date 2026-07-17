import { type ImgHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?:        string | null
  alt:         string
  size?:       AvatarSize
  verified?:   boolean
  initials?:   string  // fallback jika src tidak ada
}

const sizeMap: Record<AvatarSize, { outer: string; badge: string; text: string }> = {
  xs: { outer: 'w-8 h-8',   badge: 'w-3 h-3 border',     text: 'text-[10px]' },
  sm: { outer: 'w-10 h-10', badge: 'w-3.5 h-3.5 border', text: 'text-xs'     },
  md: { outer: 'w-12 h-12', badge: 'w-4 h-4 border-2',   text: 'text-sm'     },
  lg: { outer: 'w-16 h-16', badge: 'w-5 h-5 border-2',   text: 'text-base'   },
  xl: { outer: 'w-20 h-20', badge: 'w-6 h-6 border-2',   text: 'text-lg'     },
}

/**
 * Avatar — sesuai design system TaniConnect.
 * - Rounded 50%
 * - Badge verifikasi ✓ di pojok kanan bawah (jika verified=true)
 * - Fallback: bg #86EFAC + inisial nama #15803D jika src tidak ada
 */
function Avatar({
  src,
  alt,
  size     = 'md',
  verified = false,
  initials,
  className,
  ...props
}: AvatarProps) {
  const { outer, badge, text } = sizeMap[size]

  // Ambil inisial dari alt jika tidak disediakan
  const displayInitials = initials ??
    alt
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()

  return (
    <div className={clsx('relative inline-flex shrink-0', outer, className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full rounded-full object-cover"
          {...props}
        />
      ) : (
        // Fallback initials
        <div
          className={clsx(
            'w-full h-full rounded-full',
            'flex items-center justify-center',
            'bg-primary-light text-primary-dark font-semibold',
            text,
          )}
          aria-label={alt}
          role="img"
        >
          {displayInitials}
        </div>
      )}

      {/* Badge verifikasi */}
      {verified && (
        <span
          className={clsx(
            'absolute bottom-0 right-0',
            'bg-primary rounded-full border-white flex items-center justify-center',
            badge,
          )}
          aria-label="Terverifikasi"
          title="Pengguna Terverifikasi"
        >
          <svg
            viewBox="0 0 10 10"
            fill="none"
            className="w-[55%] h-[55%]"
            aria-hidden="true"
          >
            <path
              d="M2 5.5L4 7.5L8 3"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  )
}

export { Avatar, type AvatarProps, type AvatarSize }
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  images: string[]
  productName: string
}

export function ProductImageGallery({ images, productName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const displayImages = images.length > 0 ? images : []

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square bg-gray-50 border border-gray-100 rounded-sm overflow-hidden">
        {displayImages[activeIndex] ? (
          <img
            src={displayImages[activeIndex]}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl bg-gray-50">
            🌾
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'shrink-0 w-16 h-16 rounded-sm border-2 overflow-hidden transition-all',
                activeIndex === i
                  ? 'border-[#ee4d2d] ring-1 ring-[#ee4d2d]'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

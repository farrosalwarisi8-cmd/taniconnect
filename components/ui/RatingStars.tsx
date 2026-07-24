'use client'

import { useState } from 'react'

export function RatingStars({ initial = 0, onSelect }: { initial?: number, onSelect?: (val: number) => void }) {
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(initial)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`text-3xl transition-colors ${
            star <= (hover || rating) ? 'text-amber' : 'text-border'
          }`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => {
            setRating(star)
            onSelect?.(star)
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}
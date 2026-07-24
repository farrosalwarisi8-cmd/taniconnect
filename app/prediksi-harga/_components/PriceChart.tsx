'use client'

import { formatRupiah } from '@/lib/utils'

interface PriceChartProps {
  data: { date: string; price: number }[]
}

export function PriceChart({ data }: PriceChartProps) {
  if (!data || data.length === 0) return null

  const width = 800
  const height = 240
  const padding = { top: 20, right: 20, bottom: 40, left: 70 }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const prices = data.map(d => d.price)
  const minPrice = Math.min(...prices) * 0.95
  const maxPrice = Math.max(...prices) * 1.05
  const priceRange = maxPrice - minPrice

  const xStep = chartWidth / (data.length - 1)

  const getY = (price: number) =>
    padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight

  const getX = (index: number) => padding.left + index * xStep

  // Line path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.price)}`)
    .join(' ')

  // Area path (untuk gradient fill)
  const areaPath =
    `${linePath} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${getX(0)} ${padding.top + chartHeight} Z`

  // Y-axis labels (5 tick)
  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const value = minPrice + (priceRange * i) / (yTicks - 1)
    return {
      value,
      y: getY(value),
    }
  })

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {yLabels.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#E5E7EB"
              strokeDasharray="2 4"
            />
            <text
              x={padding.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="text-[10px] fill-gray-500"
            >
              {formatRupiah(Math.round(tick.value), false)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#priceGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#15803D"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points (only every 5th to avoid clutter) */}
        {data.map((d, i) => {
          if (i % 5 !== 0 && i !== data.length - 1) return null
          return (
            <g key={i}>
              <circle
                cx={getX(i)}
                cy={getY(d.price)}
                r="4"
                fill="#4ADE80"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          )
        })}

        {/* X-axis labels (5 label points) */}
        {[0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1].map(i => {
          const d = data[i]
          if (!d) return null
          const date = new Date(d.date)
          const label = `${date.getDate()}/${date.getMonth() + 1}`
          return (
            <text
              key={i}
              x={getX(i)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-[11px] fill-gray-500"
            >
              {label}
            </text>
          )
        })}

        {/* Last price indicator */}
        <g>
          <line
            x1={getX(data.length - 1)}
            y1={padding.top}
            x2={getX(data.length - 1)}
            y2={padding.top + chartHeight}
            stroke="#15803D"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <rect
            x={getX(data.length - 1) - 45}
            y={getY(data[data.length - 1].price) - 22}
            width="90"
            height="20"
            rx="4"
            fill="#15803D"
          />
          <text
            x={getX(data.length - 1)}
            y={getY(data[data.length - 1].price) - 8}
            textAnchor="middle"
            className="text-[11px] fill-white font-semibold"
          >
            {formatRupiah(data[data.length - 1].price)}
          </text>
        </g>
      </svg>
    </div>
  )
}
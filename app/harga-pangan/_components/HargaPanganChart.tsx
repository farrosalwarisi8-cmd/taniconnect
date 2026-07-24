'use client'

import { formatRupiah } from '@/lib/utils'

interface Region {
  region: string
  data: { date: string; price: number }[]
}

interface Props {
  regions: Region[]
}

const COLORS = ['#15803D', '#4ADE80', '#6EE7B7', '#F59E0B', '#EF4444']

export function HargaPanganChart({ regions }: Props) {
  if (!regions || regions.length === 0) return null

  const width = 800
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 80 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const allPrices = regions.flatMap(r => r.data.map(d => d.price))
  const minPrice = Math.min(...allPrices) * 0.95
  const maxPrice = Math.max(...allPrices) * 1.05
  const priceRange = maxPrice - minPrice

  const dataLength = regions[0]?.data.length ?? 30
  const xStep = chartWidth / (dataLength - 1)

  const getY = (price: number) =>
    padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight

  const getX = (index: number) => padding.left + index * xStep

  const buildPath = (data: { price: number }[]) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.price)}`).join(' ')

  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const value = minPrice + (priceRange * i) / (yTicks - 1)
    return { value, y: getY(value) }
  })

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3 mb-4">
        {regions.map((r, i) => (
          <div key={r.region} className="flex items-center gap-2 text-caption">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-fg font-medium">{r.region}</span>
          </div>
        ))}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
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

          {regions.map((r, i) => (
            <path
              key={r.region}
              d={buildPath(r.data)}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={i === 0 ? 1 : 0.7}
            />
          ))}

          {[0, Math.floor(dataLength / 4), Math.floor(dataLength / 2), Math.floor((dataLength * 3) / 4), dataLength - 1].map(i => {
            const d = regions[0]?.data[i]
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
        </svg>
      </div>
    </div>
  )
}
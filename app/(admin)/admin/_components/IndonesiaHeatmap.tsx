'use client'

import { useState } from 'react'

interface Region {
  province: string
  count: number
}

interface Props {
  regions: Region[]
}

// Simplified Indonesia provinces dengan koordinat rectangular untuk visualization
const PROVINCE_POSITIONS: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  'Aceh':                { x: 30,  y: 80,  w: 50, h: 40, label: 'Aceh' },
  'Sumatera Utara':      { x: 65,  y: 110, w: 55, h: 45, label: 'Sumut' },
  'Sumatera Barat':      { x: 90,  y: 155, w: 55, h: 40, label: 'Sumbar' },
  'Riau':                { x: 120, y: 130, w: 55, h: 40, label: 'Riau' },
  'Jambi':               { x: 140, y: 175, w: 55, h: 35, label: 'Jambi' },
  'Sumatera Selatan':    { x: 160, y: 205, w: 65, h: 40, label: 'Sumsel' },
  'Bengkulu':            { x: 130, y: 210, w: 30, h: 30, label: 'Beng' },
  'Lampung':             { x: 190, y: 240, w: 45, h: 30, label: 'Lampung' },
  'Banten':              { x: 230, y: 275, w: 30, h: 25, label: 'Banten' },
  'DKI Jakarta':         { x: 260, y: 270, w: 25, h: 20, label: 'DKI' },
  'Jawa Barat':          { x: 265, y: 285, w: 55, h: 30, label: 'Jabar' },
  'Jawa Tengah':         { x: 320, y: 285, w: 55, h: 30, label: 'Jateng' },
  'DI Yogyakarta':       { x: 355, y: 305, w: 25, h: 20, label: 'DIY' },
  'Jawa Timur':          { x: 375, y: 285, w: 60, h: 30, label: 'Jatim' },
  'Bali':                { x: 435, y: 305, w: 30, h: 20, label: 'Bali' },
  'Nusa Tenggara Barat': { x: 465, y: 305, w: 45, h: 25, label: 'NTB' },
  'Nusa Tenggara Timur': { x: 510, y: 305, w: 65, h: 30, label: 'NTT' },
  'Kalimantan Barat':    { x: 235, y: 160, w: 55, h: 65, label: 'Kalbar' },
  'Kalimantan Tengah':   { x: 290, y: 175, w: 55, h: 55, label: 'Kalteng' },
  'Kalimantan Selatan':  { x: 320, y: 235, w: 45, h: 30, label: 'Kalsel' },
  'Kalimantan Timur':    { x: 345, y: 145, w: 60, h: 70, label: 'Kaltim' },
  'Kalimantan Utara':    { x: 350, y: 110, w: 55, h: 40, label: 'Kaltara' },
  'Sulawesi Utara':      { x: 470, y: 145, w: 50, h: 35, label: 'Sulut' },
  'Gorontalo':           { x: 445, y: 175, w: 40, h: 25, label: 'Gorontalo' },
  'Sulawesi Tengah':     { x: 425, y: 195, w: 55, h: 45, label: 'Sulteng' },
  'Sulawesi Barat':      { x: 410, y: 235, w: 35, h: 30, label: 'Sulbar' },
  'Sulawesi Selatan':    { x: 425, y: 265, w: 50, h: 40, label: 'Sulsel' },
  'Sulawesi Tenggara':   { x: 475, y: 245, w: 45, h: 40, label: 'Sultra' },
  'Maluku':              { x: 555, y: 220, w: 50, h: 55, label: 'Maluku' },
  'Maluku Utara':        { x: 555, y: 165, w: 50, h: 45, label: 'Malut' },
  'Papua Barat':         { x: 620, y: 195, w: 55, h: 60, label: 'Papbar' },
  'Papua':               { x: 680, y: 195, w: 100, h: 90, label: 'Papua' },
}

const OCEAN_COLOR = '#DBEAFE'
const NO_DATA = '#E5E7EB'

// Warna hijau bertingkat berdasarkan jumlah user
function getColor(count: number, maxCount: number): string {
  if (count === 0) return NO_DATA
  const ratio = count / Math.max(maxCount, 1)
  if (ratio > 0.75) return '#15803D' // primary-dark
  if (ratio > 0.5)  return '#16A34A' // success
  if (ratio > 0.25) return '#4ADE80' // primary
  if (ratio > 0.1)  return '#86EFAC' // primary-light
  return '#BBF7D0' // very light
}

export function IndonesiaHeatmap({ regions }: Props) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null)

  const regionMap = new Map(regions.map(r => [r.province, r.count]))
  const maxCount = Math.max(...regions.map(r => r.count), 1)
  const totalUsers = regions.reduce((s, r) => s + r.count, 0)

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-caption">
        <span className="text-fg/60 font-semibold">Kepadatan:</span>
        {[
          { color: '#BBF7D0', label: 'Rendah' },
          { color: '#86EFAC', label: 'Sedang' },
          { color: '#4ADE80', label: 'Ramai' },
          { color: '#15803D', label: 'Sangat Ramai' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-fg">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: NO_DATA }} />
          <span className="text-fg/60">Belum ada data</span>
        </div>
      </div>

      {/* SVG Map */}
      <div className="w-full overflow-x-auto bg-surface rounded-card p-4">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: 600 }}
        >
          {/* Ocean background */}
          <rect x="0" y="0" width="800" height="400" fill={OCEAN_COLOR} opacity="0.3" />

          {/* Grid guide (very subtle) */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F3F4F6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#grid)" />

          {/* Provinces */}
          {Object.entries(PROVINCE_POSITIONS).map(([province, pos]) => {
            const count = regionMap.get(province) ?? 0
            const color = getColor(count, maxCount)
            const isHovered = hoveredProvince === province

            return (
              <g key={province}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.w}
                  height={pos.h}
                  rx="3"
                  fill={color}
                  stroke={isHovered ? '#15803D' : '#FFFFFF'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredProvince(province)}
                  onMouseLeave={() => setHoveredProvince(null)}
                  style={{ transformOrigin: `${pos.x + pos.w / 2}px ${pos.y + pos.h / 2}px` }}
                />
                {pos.w >= 40 && (
                  <text
                    x={pos.x + pos.w / 2}
                    y={pos.y + pos.h / 2 + 3}
                    textAnchor="middle"
                    className="text-[9px] fill-white font-semibold pointer-events-none select-none"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {pos.label}
                  </text>
                )}
                {count > 0 && (
                  <circle
                    cx={pos.x + pos.w - 6}
                    cy={pos.y + 6}
                    r="8"
                    fill="#EF4444"
                    className="pointer-events-none"
                  >
                    <animate
                      attributeName="r"
                      values="8;10;8"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {count > 0 && (
                  <text
                    x={pos.x + pos.w - 6}
                    y={pos.y + 10}
                    textAnchor="middle"
                    className="text-[9px] fill-white font-bold pointer-events-none select-none"
                  >
                    {count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Info box for hovered province */}
      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        <div className="p-3 bg-primary/5 rounded-btn border border-primary/20">
          <p className="text-caption text-fg/60 mb-1">📍 Provinsi Aktif</p>
          <p className="text-h4 font-bold text-primary-dark">{regions.length}</p>
        </div>
        <div className="p-3 bg-success/5 rounded-btn border border-success/20">
          <p className="text-caption text-fg/60 mb-1">👥 Total Pengguna</p>
          <p className="text-h4 font-bold text-success">{totalUsers}</p>
        </div>
        <div className="p-3 bg-teal/10 rounded-btn border border-teal/30">
          <p className="text-caption text-fg/60 mb-1">🏆 Terbanyak</p>
          <p className="text-h4 font-bold text-fg-dark">
            {regions[0]?.province.slice(0, 15) ?? '-'}
          </p>
        </div>
      </div>

      {hoveredProvince && (
        <div className="mt-3 p-4 bg-primary/10 border border-primary rounded-btn">
          <p className="text-body text-fg-dark">
            📍 <strong>{hoveredProvince}</strong> — <span className="text-primary-dark font-bold">{regionMap.get(hoveredProvince) ?? 0} pengguna</span>
          </p>
        </div>
      )}
    </div>
  )
}
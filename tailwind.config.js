// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── PALET WARNA TANICONNECT ───────────────────────────────
      colors: {
        // Primary Green
        'primary': {
          DEFAULT: '#4ADE80',
          dark:    '#15803D',
          light:   '#86EFAC',
        },
        // Teal aksen
        'teal': {
          DEFAULT: '#6EE7B7',
        },
        // Semantic
        'success':  '#16A34A',
        'error':    '#EF4444',
        // Foreground / Text
        'fg': {
          DEFAULT: '#374151',
          dark:    '#111827',
        },
        // Backgrounds
        'surface': {
          DEFAULT: '#F9FAFB',
          white:   '#FFFFFF',
        },
        // Border
        'border': {
          DEFAULT: '#D1D5DB',
          light:   '#E5E7EB',
        },
        // Status chip backgrounds
        'chip': {
          success: '#DCFCE7',
          warning: '#FEF3C7',
          info:    '#EFF6FF',
          error:   '#FEE2E2',
          neutral: '#F3F4F6',
        },
      },

      // ─── TIPOGRAFI ─────────────────────────────────────────────
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui'],
        sans:    ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Display/H1 — HANYA untuk hero
        'display': ['76px', { lineHeight: '83.6px', fontWeight: '800' }],
        'display-md': ['48px', { lineHeight: '52.8px', fontWeight: '800' }],
        'display-sm': ['40px', { lineHeight: '44px', fontWeight: '800' }],
        // Headings
        'h2': ['22px', { lineHeight: '28.6px', fontWeight: '700' }],
        'h3': ['15px', { lineHeight: '22.5px', fontWeight: '700' }],
        'h4': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        // Body
        'body': ['17px', { lineHeight: '28.9px', fontWeight: '400' }],
        'body-sm': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        // Button
        'btn': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'btn-sm': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        // Caption
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },

      // ─── BORDER RADIUS ─────────────────────────────────────────
      borderRadius: {
        'badge':  '6px',
        'btn':    '12px',
        'card':   '16px',
        'card-sm':'12px',
        'full':   '9999px',
        'circle': '50%',
      },

      // ─── SPACING (base 4px) ────────────────────────────────────
      spacing: {
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '8':  '32px',
        '12': '48px',
        '16': '64px',
      },

      // ─── SHADOW / ELEVATION ────────────────────────────────────
      boxShadow: {
        'flat':   '0 0 0 1px #D1D5DB',
        'sm':     '0px 4px 6px -1px rgba(0,0,0,0.1)',
        'md':     '0px 16px 44px 0px rgba(15,23,42,0.12)',
        'lg':     '0px 18px 46px 0px rgba(15,118,67,0.22)',
        'btn-primary':   '0px 8px 16px -2px rgba(74,222,128,0.25)',
        'btn-secondary': '0px 16px 44px 0px rgba(15,23,42,0.12)',
        'nav':    '0px 4px 18px -6px rgba(22,163,74,0.14), 0px 1px 4px 0px rgba(0,0,0,0.04), inset 0px 1px 0px 0px rgba(255,255,255,0.8)',
        'modal':  '0px 24px 64px 0px rgba(15,23,42,0.3)',
        'icon-btn': '0px 4px 6px -1px rgba(0,0,0,0.1)',
        'focus':  '0 0 0 3px rgba(74, 222, 128, 0.3)',
      },

      // ─── BREAKPOINTS ──────────────────────────────────────────
      screens: {
        'sm':   '640px',
        'md':   '768px',
        'lg':   '1024px',
        'xl':   '1280px',
        '2xl':  '1440px',
      },

      // ─── MAX WIDTH ────────────────────────────────────────────
      maxWidth: {
        'container': '1440px',
        'modal':     '480px',
      },

      // ─── ANIMASI ─────────────────────────────────────────────
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        'slide-out-right': {
          '0%':   { transform: 'translateX(0)',    opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'bounce-dot': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scaleY(0.4)', opacity: '0.6' },
          '50%':      { transform: 'scaleY(1)',   opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(74, 222, 128, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 8px rgba(74, 222, 128, 0)',
          },
        },
      },
      animation: {
        'shimmer':        'shimmer 1.5s infinite linear',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right':'slide-out-right 0.3s ease-in',
        'bounce-dot':     'bounce-dot 1s infinite',
        'pulse-dot':      'pulse-dot 1s ease-in-out infinite',
        'glow-pulse':     'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
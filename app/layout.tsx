import type { Metadata, Viewport } from 'next'
import { PWAProvider } from '@/components/PWAProvider'
import { Navbar } from '@/components/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TaniConnect — Platform Ekosistem Digital Pertanian Indonesia',
    template: '%s | TaniConnect',
  },
  description:
    'Platform digital yang menghubungkan petani langsung dengan pembeli. ' +
    'Jual hasil panen, sewa alat tani, catat keuangan, dan dapatkan insight AI pertanian.',
  keywords: [
    'pertanian digital', 'jual hasil panen', 'marketplace petani',
    'harga komoditas', 'sewa alat tani', 'TaniConnect',
    'AI penyuluh', 'prediksi harga cabai', 'Bapanas', 'PIHPS BI',
    'agrikultur Indonesia',
  ],
  authors: [{ name: 'TaniConnect Team' }],
  creator: 'TaniConnect',
  publisher: 'TaniConnect',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://taniconnect.id'
  ),

  // ⭐ PWA Manifest
  manifest: '/manifest.json',

  // Icons untuk berbagai device
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
  },

  // Apple-specific PWA meta (biar keliatan kayak native app di iOS)
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaniConnect',
  },

  openGraph: {
    type: 'website',
    locale: 'id_ID',
    title: 'TaniConnect — Platform Ekosistem Digital Pertanian Indonesia',
    description: 'Tani Lebih Mudah, Hasil Lebih Nyata.',
    siteName: 'TaniConnect',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'TaniConnect Logo',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'TaniConnect',
    description: 'Platform Ekosistem Digital Pertanian Indonesia',
    images: ['/icons/icon-512.png'],
  },

  // Robots: izinkan indexing halaman publik
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  // Cegah auto-format nomor telepon jadi link
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Boleh zoom sedikit (aksesibilitas)
  userScalable: true, // Aksesibilitas: user bisa zoom
  themeColor: '#15803D',
  colorScheme: 'light',
  viewportFit: 'cover', // Untuk iPhone dengan notch
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Preconnect ke Google Fonts untuk loading lebih cepat */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap"
          rel="stylesheet"
        />

        {/* Apple PWA meta — biar app keliatan native di iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaniConnect" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Microsoft tile untuk Windows */}
        <meta name="msapplication-TileColor" content="#15803D" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />

        {/* Format detection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased min-h-screen bg-white text-fg">
        <Navbar />
        {children}

        {/* ⭐ PWA Provider — register service worker + install prompt */}
        <PWAProvider />
      </body>
    </html>
  )
}
import type { Metadata, Viewport } from 'next'
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
  ],
  authors: [{ name: 'TaniConnect Team' }],
  creator: 'TaniConnect',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://taniconnect.id'
  ),
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    title: 'TaniConnect — Platform Ekosistem Digital Pertanian Indonesia',
    description: 'Tani Lebih Mudah, Hasil Lebih Nyata.',
    siteName: 'TaniConnect',
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Cegah zoom otomatis saat tap input (UX mobile)
  userScalable: false,
  themeColor: '#15803D',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/*
          Preconnect ke font Google untuk performa loading lebih cepat.
          Bricolage Grotesque HANYA untuk display (76px+).
        */}
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
      </head>
      <body className="antialiased min-h-screen bg-white text-fg">
        {children}
      </body>
    </html>
  )
}
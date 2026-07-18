import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-surface-light flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">🚫</div>
        <h1 className="text-h2 text-fg-dark mb-3">Akses Ditolak</h1>
        <p className="text-body text-fg/70 mb-8">
          Kamu tidak memiliki izin untuk mengakses halaman ini. Silakan kembali atau login dengan akun yang sesuai.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white font-medium rounded-sm px-6 py-3 min-h-[48px]"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  )
}
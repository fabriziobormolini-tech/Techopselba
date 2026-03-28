import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-gray-100 mb-4">404</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The certification or page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary text-sm">
            Go Home
          </Link>
          <Link href="/submit" className="btn-secondary text-sm">
            Certify a Claim
          </Link>
        </div>
      </div>
    </main>
  )
}

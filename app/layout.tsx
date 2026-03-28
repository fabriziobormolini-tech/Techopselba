import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Techopselba — Flight Claim Certification',
  description:
    'The independent certification authority for EU261 flight compensation claims. We certify your claim is valid — creating social pressure on airlines to pay.',
  openGraph: {
    title: 'Techopselba — Flight Claim Certification',
    description: 'Independent EU261 flight compensation certification.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <a href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">TE</span>
                </div>
                <span className="font-semibold text-gray-900">Techopselba</span>
              </a>
              <div className="flex items-center gap-6">
                <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Airline Rankings
                </a>
                <a href="/submit" className="btn-primary text-xs py-2 px-4">
                  Certify My Claim
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t border-gray-100 mt-20 py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">TE</span>
                  </div>
                  <span className="font-semibold">Techopselba</span>
                </div>
                <p className="text-sm text-gray-500 max-w-xs">
                  Independent certification authority for EU261 flight compensation.
                  We certify — airlines pay.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="font-medium text-gray-900 mb-3">Platform</p>
                  <ul className="space-y-2 text-gray-500">
                    <li><a href="/submit" className="hover:text-gray-900">Submit Claim</a></li>
                    <li><a href="/dashboard" className="hover:text-gray-900">Airline Rankings</a></li>
                    <li><a href="/api/airlines/FR" className="hover:text-gray-900">API Access</a></li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-3">Legal</p>
                  <ul className="space-y-2 text-gray-500">
                    <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
                    <li><a href="#" className="hover:text-gray-900">Terms of Service</a></li>
                    <li><a href="#" className="hover:text-gray-900">EU261 Regulation</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-100 text-xs text-gray-400">
              <p>Techopselba is not a legal service and does not provide legal advice. Certification reflects our independent assessment of EU261 eligibility.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

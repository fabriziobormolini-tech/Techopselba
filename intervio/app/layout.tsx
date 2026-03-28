import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Intervio — Manutenzione Edifici',
  description: 'Hub documentale per la manutenzione tecnica degli edifici',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        {children}
      </body>
    </html>
  )
}

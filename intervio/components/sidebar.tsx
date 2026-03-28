'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profilo } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SidebarProps { profilo: Profilo }

const LINKS_MANUTENTORE = [
  { href: '/dashboard/manutentore', label: 'Panoramica', icon: '◼' },
  { href: '/dashboard/manutentore/impianti', label: 'Impianti', icon: '⚙' },
  { href: '/dashboard/manutentore/interventi', label: 'Interventi', icon: '🔧' },
  { href: '/dashboard/manutentore/scadenze', label: 'Scadenze', icon: '📅' },
  { href: '/dashboard/manutentore/documenti', label: 'Documenti', icon: '📄' },
]

const LINKS_AMMINISTRATORE = [
  { href: '/dashboard/amministratore', label: 'Panoramica', icon: '◼' },
  { href: '/dashboard/amministratore/edifici', label: 'Edifici', icon: '🏢' },
  { href: '/dashboard/amministratore/richieste', label: 'Richieste', icon: '📥' },
]

const LINKS_CONDOMINO = [
  { href: '/dashboard/condomino', label: 'Il mio condominio', icon: '🏠' },
  { href: '/dashboard/condomino/segnala', label: 'Segnala problema', icon: '⚠' },
]

export function Sidebar({ profilo }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const links = profilo.ruolo === 'manutentore' || profilo.ruolo === 'tecnico'
    ? LINKS_MANUTENTORE
    : profilo.ruolo === 'amministratore'
    ? LINKS_AMMINISTRATORE
    : LINKS_CONDOMINO

  const ruoloLabel = {
    manutentore: 'Manutentore',
    tecnico: 'Tecnico',
    amministratore: 'Amministratore',
    condomino: 'Condomino',
  }[profilo.ruolo] ?? profilo.ruolo

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">Intervio</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === link.href
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <span className="text-base leading-none">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-blue-700">
              {(profilo.nome?.[0] ?? '?').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profilo.nome} {profilo.cognome}
            </p>
            <p className="text-xs text-gray-500">{ruoloLabel}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Esci
        </button>
      </div>
    </aside>
  )
}

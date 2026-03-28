'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LinkFirmatoForm({ impiantoId }: { impiantoId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [scadeGiorni, setScadeGiorni] = useState('30')
  const [copied, setCopied] = useState(false)

  async function genera() {
    setLoading(true)
    const res = await fetch('/api/link-accesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impianto_ids: [impiantoId], descrizione, scade_giorni: parseInt(scadeGiorni) }),
    })
    const data = await res.json()
    setLink(data.link)
    setLoading(false)
  }

  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return (
    <Button variant="outline" onClick={() => setOpen(true)}>
      🔗 Link ente controllo
    </Button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Link accesso ente di controllo</h2>
        <p className="text-sm text-gray-500 mb-4">
          Genera un link firmato in sola lettura per ispettori, INAIL, VVF o altri enti verificatori.
        </p>
        {!link ? (
          <div className="space-y-3">
            <Input label="Descrizione (es. Verifica INAIL 2024)" value={descrizione} onChange={e => setDescrizione(e.target.value)} />
            <Input label="Validità (giorni)" type="number" value={scadeGiorni} onChange={e => setScadeGiorni(e.target.value)} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
              <Button onClick={genera} loading={loading} className="flex-1">Genera link</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 break-all text-sm font-mono text-gray-700">{link}</div>
            <div className="flex gap-3">
              <Button onClick={copy} variant="outline" className="flex-1">
                {copied ? '✓ Copiato!' : 'Copia link'}
              </Button>
              <Button onClick={() => { setOpen(false); setLink('') }} className="flex-1">Chiudi</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

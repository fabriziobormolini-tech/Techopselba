'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export default function SegnalaPage() {
  const router = useRouter()
  const [edifici, setEdifici] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ edificio_id: '', titolo: '', descrizione: '', urgenza: 'normale' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('unita_persone')
        .select('unita_immobiliari(edificio_id, edifici(id, nome))')
        .eq('persona_id', user!.id)
        .is('al', null)
      const edificiList = data?.map((u: any) => u.unita_immobiliari?.edifici).filter(Boolean) ?? []
      const unici = Array.from(new Map(edificiList.map((e: any) => [e.id, e])).values())
      setEdifici(unici as any[])
    }
    load()
  }, [])

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('richieste_intervento').insert({
      edificio_id: form.edificio_id,
      richiedente_id: user!.id,
      titolo: form.titolo,
      descrizione: form.descrizione || null,
      urgenza: form.urgenza as any,
    })
    setLoading(false)
    if (!error) setSuccess(true)
  }

  if (success) {
    return (
      <div className="p-6 max-w-md mx-auto mt-12 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Segnalazione inviata</h2>
        <p className="text-sm text-gray-500 mb-6">L&apos;amministratore riceverà la tua richiesta a breve.</p>
        <Link href="/dashboard/condomino">
          <Button variant="outline">Torna alla home</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Segnala un problema</h1>
        <p className="text-gray-500 text-sm mt-1">La segnalazione sarà inviata all&apos;amministratore del condominio</p>
      </div>

      <form onSubmit={submit} className="space-y-4 bg-white rounded-2xl border border-gray-200 p-6">
        {edifici.length > 1 && (
          <Select
            label="Edificio"
            options={edifici.map(e => ({ value: e.id, label: e.nome }))}
            value={form.edificio_id}
            onChange={e => update('edificio_id', e.target.value)}
            required
            placeholder="Seleziona edificio"
          />
        )}
        {edifici.length === 1 && (
          <input type="hidden" value={edifici[0].id} onChange={() => update('edificio_id', edifici[0].id)} />
        )}
        <Input
          label="Titolo"
          value={form.titolo}
          onChange={e => update('titolo', e.target.value)}
          required
          placeholder="Es. Ascensore bloccato al piano 3"
        />
        <Textarea
          label="Descrizione"
          value={form.descrizione}
          onChange={e => update('descrizione', e.target.value)}
          placeholder="Descrivi il problema in dettaglio..."
          rows={4}
        />
        <Select
          label="Urgenza"
          value={form.urgenza}
          onChange={e => update('urgenza', e.target.value)}
          options={[
            { value: 'bassa', label: 'Bassa — non urgente' },
            { value: 'normale', label: 'Normale' },
            { value: 'alta', label: 'Alta' },
            { value: 'urgente', label: 'Urgente — pericolo immediato' },
          ]}
        />
        <Button type="submit" loading={loading} className="w-full">Invia segnalazione</Button>
      </form>
    </div>
  )
}

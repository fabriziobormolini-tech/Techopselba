'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function NuovoInterventoForm({ impiantoId }: { impiantoId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ tipo: 'ordinario', titolo: '', descrizione: '', pianificato_il: '', priorita: 'normale' })

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('interventi').insert({
      impianto_id: impiantoId,
      tipo: form.tipo,
      titolo: form.titolo,
      descrizione: form.descrizione || null,
      pianificato_il: form.pianificato_il ? new Date(form.pianificato_il).toISOString() : null,
      priorita: form.priorita as any,
      tecnico_id: user?.id,
      created_by: user?.id,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>+ Intervento</Button>

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Nuovo intervento</h2>
        <form onSubmit={submit} className="space-y-3">
          <Select label="Tipo" value={form.tipo} onChange={e => update('tipo', e.target.value)} options={[
            { value: 'ordinario', label: 'Ordinario' },
            { value: 'straordinario', label: 'Straordinario' },
            { value: 'verifica', label: 'Verifica' },
            { value: 'emergenza', label: 'Emergenza' },
          ]} />
          <Input label="Titolo" value={form.titolo} onChange={e => update('titolo', e.target.value)} required placeholder="Es. Verifica periodica INAIL" />
          <Textarea label="Descrizione" value={form.descrizione} onChange={e => update('descrizione', e.target.value)} />
          <Input label="Data pianificata" type="datetime-local" value={form.pianificato_il} onChange={e => update('pianificato_il', e.target.value)} />
          <Select label="Priorità" value={form.priorita} onChange={e => update('priorita', e.target.value)} options={[
            { value: 'bassa', label: 'Bassa' },
            { value: 'normale', label: 'Normale' },
            { value: 'alta', label: 'Alta' },
            { value: 'urgente', label: 'Urgente' },
          ]} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
            <Button type="submit" loading={loading} className="flex-1">Crea</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

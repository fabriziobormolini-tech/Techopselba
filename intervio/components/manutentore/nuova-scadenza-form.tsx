'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

const TIPI_SCADENZA = [
  { value: 'verifica_periodica', label: 'Verifica periodica' },
  { value: 'manutenzione_ordinaria', label: 'Manutenzione ordinaria' },
  { value: 'rinnovo_certificato', label: 'Rinnovo certificato' },
  { value: 'collaudo', label: 'Collaudo' },
  { value: 'custom', label: 'Personalizzata' },
]

const ENTI = [
  { value: 'INAIL', label: 'INAIL' },
  { value: 'VVF', label: 'Vigili del Fuoco' },
  { value: 'ASL', label: 'ASL' },
  { value: 'Comune', label: 'Comune' },
  { value: 'interno', label: 'Interno' },
]

export function NuovaScadenzaForm({ impiantoId }: { impiantoId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ tipo: 'verifica_periodica', ente_competente: 'INAIL', data_scadenza: '', normativa_rif: '', giorni_preavviso: '30' })

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('scadenze').insert({
      impianto_id: impiantoId,
      tipo: form.tipo,
      ente_competente: form.ente_competente || null,
      data_scadenza: form.data_scadenza,
      normativa_rif: form.normativa_rif || null,
      giorni_preavviso: parseInt(form.giorni_preavviso),
      created_by: user?.id,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>+ Scadenza</Button>

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Nuova scadenza</h2>
        <form onSubmit={submit} className="space-y-3">
          <Select label="Tipo" options={TIPI_SCADENZA} value={form.tipo} onChange={e => update('tipo', e.target.value)} />
          <Select label="Ente competente" options={ENTI} value={form.ente_competente} onChange={e => update('ente_competente', e.target.value)} />
          <Input label="Data scadenza" type="date" value={form.data_scadenza} onChange={e => update('data_scadenza', e.target.value)} required />
          <Input label="Normativa rif." value={form.normativa_rif} onChange={e => update('normativa_rif', e.target.value)} placeholder="Es. DPR 162/99 art.13" />
          <Input label="Preavviso (giorni)" type="number" value={form.giorni_preavviso} onChange={e => update('giorni_preavviso', e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
            <Button type="submit" loading={loading} className="flex-1">Salva</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

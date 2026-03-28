'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { TipoImpianto } from '@/lib/types'

const TIPI: { value: TipoImpianto; label: string }[] = [
  { value: 'ascensore', label: 'Ascensore' },
  { value: 'antincendio', label: 'Antincendio' },
  { value: 'caldaia', label: 'Caldaia' },
  { value: 'climatizzazione', label: 'Climatizzazione' },
  { value: 'idrico', label: 'Impianto idrico' },
  { value: 'elettrico', label: 'Impianto elettrico' },
  { value: 'altro', label: 'Altro' },
]

export function NuovoImpiantoModal({ edifici }: { edifici: { id: string; nome: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ edificio_id: '', tipo: 'ascensore' as TipoImpianto, marca: '', modello: '', matricola: '', ubicazione: '' })

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('impianti').insert({
      edificio_id: form.edificio_id,
      tipo: form.tipo,
      marca: form.marca || null,
      modello: form.modello || null,
      matricola: form.matricola || null,
      ubicazione: form.ubicazione || null,
    })
    setLoading(false)
    if (!error) { setOpen(false); router.refresh() }
  }

  if (!open) return (
    <Button onClick={() => setOpen(true)}>+ Nuovo impianto</Button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-5">Nuovo impianto</h2>
        <form onSubmit={submit} className="space-y-4">
          <Select label="Edificio" options={edifici.map(e => ({ value: e.id, label: e.nome }))} value={form.edificio_id} onChange={e => update('edificio_id', e.target.value)} required placeholder="Seleziona edificio" />
          <Select label="Tipo impianto" options={TIPI} value={form.tipo} onChange={e => update('tipo', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marca" value={form.marca} onChange={e => update('marca', e.target.value)} />
            <Input label="Modello" value={form.modello} onChange={e => update('modello', e.target.value)} />
          </div>
          <Input label="Matricola" value={form.matricola} onChange={e => update('matricola', e.target.value)} />
          <Input label="Ubicazione" value={form.ubicazione} onChange={e => update('ubicazione', e.target.value)} placeholder="Es. Scala A, piano -1" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
            <Button type="submit" loading={loading} className="flex-1">Crea impianto</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NuovoEdificioModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', indirizzo_via: '', indirizzo_civico: '', indirizzo_cap: '', indirizzo_comune: '', indirizzo_provincia: '', codice_fiscale_cond: '' })

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('edifici').insert({ ...form, amministratore_id: user?.id })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Nuovo edificio</Button>

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-5">Nuovo edificio</h2>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nome condominio" value={form.nome} onChange={e => update('nome', e.target.value)} required placeholder="Es. Condominio Rossi" />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Via" value={form.indirizzo_via} onChange={e => update('indirizzo_via', e.target.value)} />
            </div>
            <Input label="Civico" value={form.indirizzo_civico} onChange={e => update('indirizzo_civico', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="CAP" value={form.indirizzo_cap} onChange={e => update('indirizzo_cap', e.target.value)} />
            <div className="col-span-2">
              <Input label="Comune" value={form.indirizzo_comune} onChange={e => update('indirizzo_comune', e.target.value)} />
            </div>
          </div>
          <Input label="Cod. fiscale condominio" value={form.codice_fiscale_cond} onChange={e => update('codice_fiscale_cond', e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Annulla</Button>
            <Button type="submit" loading={loading} className="flex-1">Crea edificio</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

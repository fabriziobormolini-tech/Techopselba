'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { TipoDocumento } from '@/lib/types'

const TIPI: { value: TipoDocumento; label: string }[] = [
  { value: 'certificato', label: 'Certificato' },
  { value: 'verbale', label: 'Verbale' },
  { value: 'libretto', label: 'Libretto impianto' },
  { value: 'rapporto_verifica', label: 'Rapporto verifica' },
  { value: 'foto', label: 'Foto' },
  { value: 'dico', label: 'DICO' },
  { value: 'ddt', label: 'DDT' },
  { value: 'altro', label: 'Altro' },
]

export function UploadDocumentoForm({ impiantoId }: { impiantoId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ titolo: '', tipo: 'certificato' as TipoDocumento, visibile_condomino: false, visibile_ente: true })

  function update(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Seleziona un file'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${impiantoId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('documenti')
      .upload(path, file)

    if (uploadError) { setError('Errore upload: ' + uploadError.message); setLoading(false); return }

    const { error: dbError } = await supabase.from('documenti').insert({
      impianto_id: impiantoId,
      tipo: form.tipo,
      titolo: form.titolo || file.name,
      file_path: path,
      file_nome: file.name,
      file_mime: file.type,
      file_kb: Math.round(file.size / 1024),
      caricato_da: user?.id,
      visibile_condomino: form.visibile_condomino,
      visibile_ente: form.visibile_ente,
    })

    setLoading(false)
    if (dbError) { setError('Errore salvataggio: ' + dbError.message); return }
    setSuccess(true)
    setTimeout(() => { setSuccess(false); router.refresh() }, 1500)
    if (fileRef.current) fileRef.current.value = ''
    setForm({ titolo: '', tipo: 'certificato', visibile_condomino: false, visibile_ente: true })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Select label="Tipo documento" options={TIPI} value={form.tipo} onChange={e => update('tipo', e.target.value)} />
      <Input label="Titolo (opzionale)" value={form.titolo} onChange={e => update('titolo', e.target.value)} placeholder="Es. Certificato verifica 2024" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.visibile_condomino} onChange={e => update('visibile_condomino', e.target.checked)} className="rounded" />
          Visibile condomino
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.visibile_ente} onChange={e => update('visibile_ente', e.target.checked)} className="rounded" />
          Visibile ente
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">Documento caricato!</p>}
      <Button type="submit" loading={loading} className="w-full">Carica</Button>
    </form>
  )
}

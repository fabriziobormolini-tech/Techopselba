'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { RuoloUtente } from '@/lib/types'

const RUOLI: { value: RuoloUtente; label: string }[] = [
  { value: 'manutentore', label: '🔧 Manutentore / Azienda' },
  { value: 'amministratore', label: '🏢 Amministratore di condominio' },
  { value: 'condomino', label: '👤 Condomino / Proprietario' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', ruolo: 'manutentore' as RuoloUtente, azienda_nome: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nome: form.nome,
          cognome: form.cognome,
          ruolo: form.ruolo,
          azienda_nome: form.azienda_nome,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Registrazione completata</h2>
          <p className="text-sm text-gray-500 mb-6">Controlla la tua email e clicca sul link di conferma.</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">Vai al login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Intervio</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Crea account</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <Select
              id="ruolo"
              label="Ruolo"
              options={RUOLI}
              value={form.ruolo}
              onChange={e => update('ruolo', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input id="nome" label="Nome" value={form.nome} onChange={e => update('nome', e.target.value)} required />
              <Input id="cognome" label="Cognome" value={form.cognome} onChange={e => update('cognome', e.target.value)} required />
            </div>
            {form.ruolo === 'manutentore' && (
              <Input id="azienda" label="Nome azienda" value={form.azienda_nome} onChange={e => update('azienda_nome', e.target.value)} placeholder="Es. Rossi Impianti Srl" />
            )}
            <Input id="email" label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
            <Input id="password" label="Password" type="password" value={form.password} onChange={e => update('password', e.target.value)} required placeholder="Almeno 8 caratteri" />

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" loading={loading} className="w-full">Registrati</Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Hai già un account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

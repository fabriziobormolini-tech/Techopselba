'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { StatoIntervento } from '@/lib/types'

export function AggiornaInterventoActions({ interventoId, stato }: { interventoId: string; stato: StatoIntervento }) {
  const router = useRouter()
  const [loading, setLoading] = useState('')

  async function update(nuovoStato: StatoIntervento, extra?: Record<string, any>) {
    setLoading(nuovoStato)
    const supabase = createClient()
    await supabase.from('interventi').update({ stato: nuovoStato, ...extra }).eq('id', interventoId)
    setLoading('')
    router.refresh()
  }

  if (stato === 'pianificato' || stato === 'assegnato') {
    return (
      <Button size="sm" onClick={() => update('in_corso', { iniziato_il: new Date().toISOString() })} loading={loading === 'in_corso'}>
        Avvia
      </Button>
    )
  }

  if (stato === 'in_corso') {
    return (
      <Button size="sm" onClick={() => update('completato', { completato_il: new Date().toISOString() })} loading={loading === 'completato'}>
        Completa
      </Button>
    )
  }

  return null
}

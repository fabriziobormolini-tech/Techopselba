'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { StatoRichiesta } from '@/lib/types'

interface Props {
  richiestaId: string
  stato: StatoRichiesta
}

export function GestisciRichiestaActions({ richiestaId, stato }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState('')

  async function aggiornaStato(nuovoStato: StatoRichiesta) {
    setLoading(nuovoStato)
    const supabase = createClient()
    await supabase
      .from('richieste_intervento')
      .update({ stato: nuovoStato, updated_at: new Date().toISOString() })
      .eq('id', richiestaId)
    setLoading('')
    router.refresh()
  }

  if (stato === 'aperta') {
    return (
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="outline" onClick={() => aggiornaStato('presa_in_carico')} loading={loading === 'presa_in_carico'}>
          Prendi in carico
        </Button>
        <Button size="sm" variant="ghost" onClick={() => aggiornaStato('annullata')} loading={loading === 'annullata'}>
          Annulla
        </Button>
      </div>
    )
  }

  if (stato === 'presa_in_carico') {
    return (
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" onClick={() => aggiornaStato('in_lavorazione')} loading={loading === 'in_lavorazione'}>
          Avvia lavori
        </Button>
        <Button size="sm" variant="outline" onClick={() => aggiornaStato('chiusa')} loading={loading === 'chiusa'}>
          Chiudi
        </Button>
      </div>
    )
  }

  return null
}

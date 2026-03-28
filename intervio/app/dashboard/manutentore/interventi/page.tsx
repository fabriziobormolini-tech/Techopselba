import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, interventoStatoLabel, prioritaColor, tipoImpiantoLabel } from '@/lib/utils'
import { AggiornaInterventoActions } from '@/components/manutentore/aggiorna-intervento-actions'

export default async function InterventiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: interventi } = await supabase
    .from('interventi')
    .select('*, impianti(tipo, ubicazione, edifici(nome))')
    .eq('tecnico_id', user!.id)
    .order('pianificato_il', { ascending: false })

  const perStato = {
    attivi: interventi?.filter(i => ['pianificato', 'assegnato', 'in_corso'].includes(i.stato)) ?? [],
    completati: interventi?.filter(i => i.stato === 'completato') ?? [],
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interventi</h1>
        <p className="text-gray-500 text-sm mt-1">I tuoi interventi in corso e storico</p>
      </div>

      <Card>
        <CardHeader><CardTitle>In corso / Pianificati ({perStato.attivi.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!perStato.attivi.length ? (
            <p className="px-6 py-4 text-sm text-gray-400">Nessun intervento attivo</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {perStato.attivi.map((i: any) => (
                <li key={i.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">{i.titolo}</p>
                        <Badge className={prioritaColor(i.priorita)}>{i.priorita}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {tipoImpiantoLabel(i.impianti?.tipo)} · {i.impianti?.edifici?.nome} · {i.impianti?.ubicazione ?? ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Pianificato: {formatDate(i.pianificato_il)} · Stato: {interventoStatoLabel(i.stato)}
                      </p>
                    </div>
                    <AggiornaInterventoActions interventoId={i.id} stato={i.stato} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Completati ({perStato.completati.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!perStato.completati.length ? (
            <p className="px-6 py-4 text-sm text-gray-400">Nessun intervento completato</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {perStato.completati.slice(0, 20).map((i: any) => (
                <li key={i.id} className="px-6 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{i.titolo}</p>
                    <p className="text-xs text-gray-500">
                      {tipoImpiantoLabel(i.impianti?.tipo)} · {i.impianti?.edifici?.nome} · {formatDate(i.completato_il)}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Completato</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateTime, prioritaColor, richiestaStatoLabel, tipoImpiantoLabel } from '@/lib/utils'
import { GestisciRichiestaActions } from '@/components/amministratore/gestisci-richiesta-actions'

export default async function RichiestePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: edifici } = await supabase
    .from('edifici')
    .select('id')
    .eq('amministratore_id', user!.id)

  const edificiIds = edifici?.map(e => e.id) ?? []

  const { data: richieste } = await supabase
    .from('richieste_intervento')
    .select('*, profili(nome, cognome, telefono), impianti(tipo, ubicazione), edifici(nome)')
    .in('edificio_id', edificiIds.length ? edificiIds : [''])
    .order('created_at', { ascending: false })

  const perStato = {
    aperte: richieste?.filter(r => r.stato === 'aperta') ?? [],
    in_corso: richieste?.filter(r => ['presa_in_carico', 'in_lavorazione'].includes(r.stato)) ?? [],
    chiuse: richieste?.filter(r => ['chiusa', 'annullata'].includes(r.stato)) ?? [],
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Richieste di intervento</h1>
        <p className="text-gray-500 text-sm mt-1">Gestisci le segnalazioni dai condomini</p>
      </div>

      {/* Aperte */}
      <Card>
        <CardHeader><CardTitle>Aperte ({perStato.aperte.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!perStato.aperte.length ? (
            <p className="px-6 py-4 text-sm text-gray-400">Nessuna richiesta aperta</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {perStato.aperte.map((r: any) => (
                <li key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">{r.titolo}</p>
                        <Badge className={prioritaColor(r.urgenza)}>{r.urgenza}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{r.descrizione}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {r.profili?.nome} {r.profili?.cognome}
                        {r.profili?.telefono && ` · ${r.profili.telefono}`}
                        {r.impianti && ` · ${tipoImpiantoLabel((r.impianti as any).tipo)}`}
                        {r.edifici && ` · ${(r.edifici as any).nome}`}
                        {' · '}{formatDateTime(r.created_at)}
                      </p>
                    </div>
                    <GestisciRichiestaActions richiestaId={r.id} stato={r.stato} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* In lavorazione */}
      {perStato.in_corso.length > 0 && (
        <Card>
          <CardHeader><CardTitle>In lavorazione ({perStato.in_corso.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {perStato.in_corso.map((r: any) => (
                <li key={r.id} className="px-6 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.titolo}</p>
                    <p className="text-xs text-gray-500">{r.profili?.nome} {r.profili?.cognome} · {formatDate(r.created_at)}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{richiestaStatoLabel(r.stato)}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

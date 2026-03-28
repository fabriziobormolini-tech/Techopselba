import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { conformitaColor, conformitaLabel, formatDate, formatDateTime, richiestaStatoLabel, tipoImpiantoLabel } from '@/lib/utils'
import Link from 'next/link'

export default async function CondominoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Trova le unità del condomino
  const { data: unitaPersone } = await supabase
    .from('unita_persone')
    .select('unita_id, unita_immobiliari(id, piano, interno, edificio_id, edifici(id, nome, indirizzo_via, indirizzo_comune, impianti(id, tipo, ubicazione, fascicoli(stato_conformita, prossima_scadenza_at), documenti(id, titolo, tipo, caricato_il, visibile_condomino))))')
    .eq('persona_id', user!.id)
    .is('al', null)

  // Le mie richieste
  const { data: richieste } = await supabase
    .from('richieste_intervento')
    .select('*, edifici(nome), impianti(tipo)')
    .eq('richiedente_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Ottieni gli edifici dalle unità
  const edifici = unitaPersone?.map((up: any) => up.unita_immobiliari?.edifici).filter(Boolean) ?? []
  const edificiUnici = Array.from(new Map(edifici.map((e: any) => [e.id, e])).values())

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Il mio condominio</h1>
        <p className="text-gray-500 text-sm mt-1">Stato impianti e richieste intervento</p>
      </div>

      {/* Impianti per edificio */}
      {(edificiUnici as any[]).map((edificio: any) => (
        <Card key={edificio.id}>
          <CardHeader>
            <CardTitle>{edificio.nome}</CardTitle>
            <p className="text-xs text-gray-500">{[edificio.indirizzo_via, edificio.indirizzo_comune].filter(Boolean).join(', ')}</p>
          </CardHeader>
          <CardContent className="p-0">
            {!(edificio.impianti as any[])?.length ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nessun impianto registrato</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {(edificio.impianti as any[]).map((imp: any) => {
                  const f = imp.fascicoli?.[0]
                  const docs = (imp.documenti as any[])?.filter((d: any) => d.visibile_condomino) ?? []
                  return (
                    <li key={imp.id} className="px-6 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{tipoImpiantoLabel(imp.tipo)}</p>
                            {f && <Badge className={conformitaColor(f.stato_conformita)}>{conformitaLabel(f.stato_conformita)}</Badge>}
                          </div>
                          {imp.ubicazione && <p className="text-xs text-gray-500">{imp.ubicazione}</p>}
                          {f?.prossima_scadenza_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Prossima scadenza: {formatDate(f.prossima_scadenza_at)}
                            </p>
                          )}
                        </div>
                        {docs.length > 0 && (
                          <span className="text-xs text-blue-600">{docs.length} doc</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Le mie richieste */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Le mie segnalazioni</CardTitle>
          <Link href="/dashboard/condomino/segnala">
            <Button size="sm">+ Segnala</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!richieste?.length ? (
            <p className="px-6 py-4 text-sm text-gray-400">Nessuna segnalazione inviata</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {richieste.map((r: any) => (
                <li key={r.id} className="px-6 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.titolo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(r.edifici as any)?.nome} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    <Badge className={
                      r.stato === 'aperta' ? 'bg-yellow-100 text-yellow-800' :
                      r.stato === 'chiusa' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {richiestaStatoLabel(r.stato)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { conformitaColor, conformitaLabel, formatDate, tipoImpiantoLabel } from '@/lib/utils'

export default async function EnteControlloView({ params }: { params: { token: string } }) {
  const supabase = await createServiceClient()

  // Valida il token
  const { data: linkAccesso } = await supabase
    .from('link_accesso_firmati')
    .select('*')
    .eq('token', params.token)
    .eq('revocato', false)
    .single()

  if (!linkAccesso) notFound()

  if (new Date(linkAccesso.scade_il) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Link scaduto</h1>
          <p className="text-sm text-gray-500 mt-1">Questo link di accesso non è più valido. Contatta il responsabile.</p>
        </div>
      </div>
    )
  }

  // Carica gli impianti
  const { data: impianti } = await supabase
    .from('impianti')
    .select('*, edifici(nome, indirizzo_via, indirizzo_civico, indirizzo_comune), fascicoli(*)')
    .in('id', linkAccesso.impianto_ids)

  const allDocumenti: Record<string, any[]> = {}
  const allScadenze: Record<string, any[]> = {}
  const allInterventi: Record<string, any[]> = {}

  for (const id of linkAccesso.impianto_ids) {
    const [{ data: docs }, { data: scad }, { data: interv }] = await Promise.all([
      supabase.from('documenti').select('*').eq('impianto_id', id).eq('visibile_ente', true).order('caricato_il', { ascending: false }),
      supabase.from('scadenze').select('*').eq('impianto_id', id).order('data_scadenza', { ascending: true }),
      supabase.from('interventi').select('*').eq('impianto_id', id).order('created_at', { ascending: false }).limit(5),
    ])
    allDocumenti[id] = docs ?? []
    allScadenze[id] = scad ?? []
    allInterventi[id] = interv ?? []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header read-only */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900">Intervio</span>
              <span className="text-xs ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Accesso in sola lettura</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {linkAccesso.descrizione && <span className="mr-3">{linkAccesso.descrizione}</span>}
            Scade il {formatDate(linkAccesso.scade_il)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {impianti?.map(impianto => {
          const fascicolo = (impianto.fascicoli as any[])?.[0]
          const edificio = impianto.edifici as any
          const docs = allDocumenti[impianto.id] ?? []
          const scadenze = allScadenze[impianto.id] ?? []
          const interventi = allInterventi[impianto.id] ?? []

          return (
            <div key={impianto.id} className="space-y-4">
              {/* Header impianto */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{tipoImpiantoLabel(impianto.tipo)}</h2>
                {fascicolo && (
                  <Badge className={conformitaColor(fascicolo.stato_conformita)}>
                    {conformitaLabel(fascicolo.stato_conformita)}
                  </Badge>
                )}
              </div>
              <p className="text-gray-500 text-sm">
                {edificio?.nome} · {[edificio?.indirizzo_via, edificio?.indirizzo_civico, edificio?.indirizzo_comune].filter(Boolean).join(', ')}
                {impianto.ubicazione && ` · ${impianto.ubicazione}`}
              </p>

              <div className="grid grid-cols-3 gap-4">
                {/* Anagrafica */}
                <Card>
                  <CardHeader><CardTitle>Anagrafica</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {[
                      ['Matricola', impianto.matricola],
                      ['Marca', impianto.marca],
                      ['Modello', impianto.modello],
                      ['N° serie', impianto.numero_serie],
                      ['Anno inst.', impianto.anno_installazione],
                    ].map(([l, v]) => v ? (
                      <div key={l as string} className="flex justify-between">
                        <span className="text-gray-500">{l}</span>
                        <span className="font-medium">{v as string}</span>
                      </div>
                    ) : null)}
                  </CardContent>
                </Card>

                {/* Scadenze */}
                <Card>
                  <CardHeader><CardTitle>Scadenze normative</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {!scadenze.length ? (
                      <p className="px-6 py-4 text-sm text-gray-400">Nessuna scadenza</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {scadenze.map((s: any) => (
                          <li key={s.id} className="px-6 py-2.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{s.tipo}</p>
                                <p className="text-xs text-gray-500">{s.ente_competente}</p>
                              </div>
                              <span className={`text-xs font-medium ${s.stato === 'aperta' ? 'text-red-600' : 'text-green-600'}`}>
                                {formatDate(s.data_scadenza)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Documenti */}
                <Card>
                  <CardHeader><CardTitle>Certificazioni e documenti</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {!docs.length ? (
                      <p className="px-6 py-4 text-sm text-gray-400">Nessun documento</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {docs.map((d: any) => (
                          <li key={d.id} className="px-6 py-2.5">
                            <p className="text-sm font-medium">{d.titolo}</p>
                            <p className="text-xs text-gray-500">{d.tipo} · {formatDate(d.caricato_il)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Storico interventi */}
              {interventi.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Storico interventi recenti</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-6 py-2 text-xs font-medium text-gray-500">Intervento</th>
                          <th className="text-left px-6 py-2 text-xs font-medium text-gray-500">Tipo</th>
                          <th className="text-left px-6 py-2 text-xs font-medium text-gray-500">Stato</th>
                          <th className="text-left px-6 py-2 text-xs font-medium text-gray-500">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {interventi.map((i: any) => (
                          <tr key={i.id}>
                            <td className="px-6 py-2.5">{i.titolo}</td>
                            <td className="px-6 py-2.5 text-gray-500">{i.tipo}</td>
                            <td className="px-6 py-2.5 text-gray-500">{i.stato}</td>
                            <td className="px-6 py-2.5 text-gray-500">{formatDate(i.completato_il ?? i.pianificato_il)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

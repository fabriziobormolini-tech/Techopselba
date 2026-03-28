import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { conformitaColor, conformitaLabel, formatDate, formatDateTime, tipoImpiantoLabel } from '@/lib/utils'
import { QRCodeDisplay } from '@/components/qr-code-display'
import { UploadDocumentoForm } from '@/components/manutentore/upload-documento-form'
import { NuovaScadenzaForm } from '@/components/manutentore/nuova-scadenza-form'
import { NuovoInterventoForm } from '@/components/manutentore/nuovo-intervento-form'
import { LinkFirmatoForm } from '@/components/manutentore/link-firmato-form'

export default async function FascicoloImpiantoPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: impianto } = await supabase
    .from('impianti')
    .select('*, edifici(nome, indirizzo_via, indirizzo_civico, indirizzo_comune)')
    .eq('id', params.id)
    .single()

  if (!impianto) notFound()

  const [{ data: fascicolo }, { data: scadenze }, { data: interventi }, { data: documenti }] = await Promise.all([
    supabase.from('fascicoli').select('*').eq('impianto_id', params.id).single(),
    supabase.from('scadenze').select('*').eq('impianto_id', params.id).order('data_scadenza', { ascending: true }),
    supabase.from('interventi').select('*, profili(nome, cognome)').eq('impianto_id', params.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('documenti').select('*').eq('impianto_id', params.id).order('caricato_il', { ascending: false }),
  ])

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/i/${impianto.qr_code_uuid}`

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{tipoImpiantoLabel(impianto.tipo)}</h1>
            {fascicolo && (
              <Badge className={conformitaColor(fascicolo.stato_conformita)}>
                {conformitaLabel(fascicolo.stato_conformita)}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {(impianto.edifici as any)?.nome} · {impianto.ubicazione ?? 'Ubicazione non specificata'}
          </p>
        </div>
        <LinkFirmatoForm impiantoId={params.id} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Anagrafica + QR */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Anagrafica impianto</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Tipo', tipoImpiantoLabel(impianto.tipo)],
                ['Marca', impianto.marca],
                ['Modello', impianto.modello],
                ['Matricola', impianto.matricola],
                ['N° serie', impianto.numero_serie],
                ['Anno inst.', impianto.anno_installazione],
                ['Ubicazione', impianto.ubicazione],
              ].map(([label, value]) => value ? (
                <div key={label as string} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-right">{value as string}</span>
                </div>
              ) : null)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>QR Code impianto</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <QRCodeDisplay url={qrUrl} />
              <p className="text-xs text-gray-400 text-center">Stampa e applica sull&apos;impianto</p>
            </CardContent>
          </Card>
        </div>

        {/* Scadenze + Upload */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Scadenze</CardTitle>
              <NuovaScadenzaForm impiantoId={params.id} />
            </CardHeader>
            <CardContent className="p-0">
              {!scadenze?.length ? (
                <p className="px-6 py-4 text-sm text-gray-400">Nessuna scadenza registrata</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {scadenze.map(s => (
                    <li key={s.id} className="px-6 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.tipo}</p>
                          <p className="text-xs text-gray-500">{s.ente_competente ?? '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-medium ${s.stato === 'aperta' ? 'text-red-600' : 'text-green-600'}`}>
                            {formatDate(s.data_scadenza)}
                          </p>
                          <p className="text-xs text-gray-400">{s.stato}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Carica documento</CardTitle></CardHeader>
            <CardContent>
              <UploadDocumentoForm impiantoId={params.id} />
            </CardContent>
          </Card>
        </div>

        {/* Documenti + Interventi */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Interventi</CardTitle>
              <NuovoInterventoForm impiantoId={params.id} />
            </CardHeader>
            <CardContent className="p-0">
              {!interventi?.length ? (
                <p className="px-6 py-4 text-sm text-gray-400">Nessun intervento registrato</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {interventi.map((i: any) => (
                    <li key={i.id} className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">{i.titolo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {i.stato} · {formatDate(i.pianificato_il ?? i.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documenti ({documenti?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!documenti?.length ? (
                <p className="px-6 py-4 text-sm text-gray-400">Nessun documento caricato</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {documenti.map(d => (
                    <li key={d.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{d.titolo}</p>
                        <p className="text-xs text-gray-500">{d.tipo} · {formatDate(d.caricato_il)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

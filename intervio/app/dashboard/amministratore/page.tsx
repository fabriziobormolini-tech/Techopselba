import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { conformitaColor, conformitaLabel, formatDate, tipoImpiantoLabel, richiestaStatoLabel } from '@/lib/utils'
import Link from 'next/link'

export default async function AmministratoreDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: edifici } = await supabase
    .from('edifici')
    .select('id, nome, indirizzo_comune, impianti(id, tipo, fascicoli(stato_conformita))')
    .eq('amministratore_id', user!.id)

  const { data: richieste } = await supabase
    .from('richieste_intervento')
    .select('*, profili(nome, cognome), impianti(tipo)')
    .in('edificio_id', edifici?.map(e => e.id) ?? [])
    .in('stato', ['aperta', 'presa_in_carico'])
    .order('created_at', { ascending: false })
    .limit(8)

  const totali = {
    edifici: edifici?.length ?? 0,
    impianti: edifici?.reduce((a, e) => a + ((e.impianti as any[])?.length ?? 0), 0) ?? 0,
    scaduti: edifici?.reduce((a, e) => a + ((e.impianti as any[])?.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'scaduto').length ?? 0), 0) ?? 0,
    richieste_aperte: richieste?.length ?? 0,
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panoramica condomini</h1>
        <p className="text-gray-500 text-sm mt-1">Vista aggregata di tutti gli edifici gestiti</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Edifici gestiti', value: totali.edifici, color: 'text-blue-600' },
          { label: 'Impianti totali', value: totali.impianti, color: 'text-gray-900' },
          { label: 'Impianti scaduti', value: totali.scaduti, color: 'text-red-600' },
          { label: 'Richieste aperte', value: totali.richieste_aperte, color: 'text-orange-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Lista edifici */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edifici</CardTitle>
            <Link href="/dashboard/amministratore/edifici">
              <Button variant="ghost" size="sm">Tutti →</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!edifici?.length ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nessun edificio associato</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {edifici.slice(0, 5).map(e => {
                  const impianti = (e.impianti as any[]) ?? []
                  const scaduti = impianti.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'scaduto').length
                  return (
                    <li key={e.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{e.nome}</p>
                        <p className="text-xs text-gray-500">{e.indirizzo_comune} · {impianti.length} impianti</p>
                      </div>
                      {scaduti > 0 && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">{scaduti} scaduti</Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Richieste aperte */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Richieste intervento</CardTitle>
            <Link href="/dashboard/amministratore/richieste">
              <Button variant="ghost" size="sm">Tutte →</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!richieste?.length ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nessuna richiesta aperta</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {richieste.map((r: any) => (
                  <li key={r.id} className="px-6 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.titolo}</p>
                        <p className="text-xs text-gray-500">
                          {r.profili?.nome} {r.profili?.cognome} · {formatDate(r.created_at)}
                        </p>
                      </div>
                      <Badge className={r.urgenza === 'urgente' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-700'}>
                        {r.urgenza}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

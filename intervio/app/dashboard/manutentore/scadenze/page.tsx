import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, giorniAScadenza, tipoImpiantoLabel } from '@/lib/utils'

export default async function ScadenzePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Edifici del manutentore
  const { data: edifici } = await supabase
    .from('edifici')
    .select('id')
    .eq('manutentore_id', user!.id)

  const edificiIds = edifici?.map(e => e.id) ?? []

  const { data: scadenze } = await supabase
    .from('scadenze')
    .select('*, impianti(tipo, ubicazione, edifici(nome))')
    .in('impianti.edificio_id', edificiIds.length ? edificiIds : [''])
    .eq('stato', 'aperta')
    .order('data_scadenza', { ascending: true })

  const scadenzeConDati = (scadenze ?? []).filter((s: any) => s.impianti)

  function categorize(s: any) {
    const giorni = giorniAScadenza(s.data_scadenza)
    if (giorni < 0) return 'scadute'
    if (giorni <= 30) return 'urgenti'
    if (giorni <= 90) return 'prossime'
    return 'future'
  }

  const gruppi = {
    scadute: scadenzeConDati.filter((s: any) => categorize(s) === 'scadute'),
    urgenti: scadenzeConDati.filter((s: any) => categorize(s) === 'urgenti'),
    prossime: scadenzeConDati.filter((s: any) => categorize(s) === 'prossime'),
    future: scadenzeConDati.filter((s: any) => categorize(s) === 'future'),
  }

  function ScadenzaList({ items, emptyMsg }: { items: any[]; emptyMsg: string }) {
    if (!items.length) return <p className="px-6 py-4 text-sm text-gray-400">{emptyMsg}</p>
    return (
      <ul className="divide-y divide-gray-100">
        {items.map((s: any) => {
          const giorni = giorniAScadenza(s.data_scadenza)
          return (
            <li key={s.id} className="px-6 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.tipo}</p>
                <p className="text-xs text-gray-500">
                  {tipoImpiantoLabel(s.impianti?.tipo)} · {(s.impianti?.edifici as any)?.nome}
                  {s.impianti?.ubicazione && ` · ${s.impianti.ubicazione}`}
                </p>
                {s.ente_competente && <p className="text-xs text-gray-400">{s.ente_competente}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium">{formatDate(s.data_scadenza)}</p>
                <p className={`text-xs ${giorni < 0 ? 'text-red-600' : giorni <= 30 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {giorni < 0 ? `${Math.abs(giorni)} giorni fa` : giorni === 0 ? 'Oggi' : `tra ${giorni} giorni`}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scadenze normative</h1>
        <p className="text-gray-500 text-sm mt-1">Tutte le scadenze aperte per gli impianti gestiti</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Scadute', count: gruppi.scadute.length, color: 'text-red-600' },
          { label: 'Entro 30gg', count: gruppi.urgenti.length, color: 'text-orange-600' },
          { label: 'Entro 90gg', count: gruppi.prossime.length, color: 'text-yellow-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase">{k.label}</p>
              <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {gruppi.scadute.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-700">⚠ Scadute ({gruppi.scadute.length})</CardTitle></CardHeader>
          <CardContent className="p-0"><ScadenzaList items={gruppi.scadute} emptyMsg="" /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Entro 30 giorni ({gruppi.urgenti.length})</CardTitle></CardHeader>
        <CardContent className="p-0"><ScadenzaList items={gruppi.urgenti} emptyMsg="Nessuna scadenza urgente" /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Entro 90 giorni ({gruppi.prossime.length})</CardTitle></CardHeader>
        <CardContent className="p-0"><ScadenzaList items={gruppi.prossime} emptyMsg="Nessuna scadenza nei prossimi 90 giorni" /></CardContent>
      </Card>
    </div>
  )
}

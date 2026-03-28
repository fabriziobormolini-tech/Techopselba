import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { conformitaColor, conformitaLabel, formatDate, tipoImpiantoLabel } from '@/lib/utils'
import Link from 'next/link'

export default async function ManutentoreDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: edifici } = await supabase
    .from('edifici')
    .select('*, impianti(id, tipo, fascicoli(stato_conformita))')
    .eq('manutentore_id', user!.id)

  const { data: interventi } = await supabase
    .from('interventi')
    .select('*, impianti(tipo, ubicazione, edifici(nome))')
    .eq('tecnico_id', user!.id)
    .in('stato', ['pianificato', 'assegnato', 'in_corso'])
    .order('pianificato_il', { ascending: true })
    .limit(5)

  const { data: scadenze } = await supabase
    .from('scadenze')
    .select('*, impianti(tipo, ubicazione, edifici(nome))')
    .eq('stato', 'aperta')
    .order('data_scadenza', { ascending: true })
    .limit(5)

  const totali = {
    impianti: edifici?.reduce((acc, e) => acc + (e.impianti?.length ?? 0), 0) ?? 0,
    scaduti: edifici?.reduce((acc, e) => acc + (e.impianti?.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'scaduto').length ?? 0), 0) ?? 0,
    in_scadenza: edifici?.reduce((acc, e) => acc + (e.impianti?.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'in_scadenza').length ?? 0), 0) ?? 0,
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panoramica</h1>
        <p className="text-gray-500 text-sm mt-1">Riepilogo impianti e attività</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Edifici gestiti', value: edifici?.length ?? 0, color: 'text-blue-600' },
          { label: 'Impianti totali', value: totali.impianti, color: 'text-gray-900' },
          { label: 'Scaduti', value: totali.scaduti, color: 'text-red-600' },
          { label: 'In scadenza', value: totali.in_scadenza, color: 'text-yellow-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Interventi in corso */}
        <Card>
          <CardHeader>
            <CardTitle>Prossimi interventi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!interventi?.length ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nessun intervento pianificato</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {interventi.map((i: any) => (
                  <li key={i.id} className="px-6 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{i.titolo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {tipoImpiantoLabel(i.impianti?.tipo)} · {i.impianti?.edifici?.nome}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(i.pianificato_il)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Scadenze imminenti */}
        <Card>
          <CardHeader>
            <CardTitle>Scadenze imminenti</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!scadenze?.length ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nessuna scadenza imminente</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {scadenze.map((s: any) => (
                  <li key={s.id} className="px-6 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.tipo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {tipoImpiantoLabel(s.impianti?.tipo)} · {s.impianti?.edifici?.nome}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-red-600 flex-shrink-0">{formatDate(s.data_scadenza)}</span>
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

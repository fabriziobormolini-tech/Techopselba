import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { conformitaColor, conformitaLabel, tipoImpiantoLabel, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { NuovoImpiantoModal } from '@/components/manutentore/nuovo-impianto-modal'

export default async function ImpiantiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: edifici } = await supabase
    .from('edifici')
    .select('id, nome, indirizzo_comune, impianti(id, tipo, marca, modello, matricola, ubicazione, qr_code_uuid, fascicoli(stato_conformita, prossima_scadenza_at))')
    .eq('manutentore_id', user!.id)
    .order('nome')

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impianti</h1>
          <p className="text-gray-500 text-sm mt-1">Gestisci gli impianti dei tuoi clienti</p>
        </div>
        <NuovoImpiantoModal edifici={edifici?.map(e => ({ id: e.id, nome: e.nome })) ?? []} />
      </div>

      {!edifici?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-sm">Nessun edificio associato. Contatta l&apos;amministratore.</p>
          </CardContent>
        </Card>
      )}

      {edifici?.map(edificio => (
        <Card key={edificio.id}>
          <CardHeader>
            <CardTitle>{edificio.nome}</CardTitle>
            <p className="text-xs text-gray-500">{edificio.indirizzo_comune}</p>
          </CardHeader>
          <CardContent className="p-0">
            {!(edificio.impianti as any[])?.length ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nessun impianto registrato</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Marca / Modello</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ubicazione</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Conformità</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pross. scadenza</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(edificio.impianti as any[]).map(imp => {
                      const fascicolo = imp.fascicoli?.[0]
                      return (
                        <tr key={imp.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">{tipoImpiantoLabel(imp.tipo)}</td>
                          <td className="px-6 py-3 text-gray-500">{[imp.marca, imp.modello].filter(Boolean).join(' ') || '—'}</td>
                          <td className="px-6 py-3 text-gray-500">{imp.ubicazione ?? '—'}</td>
                          <td className="px-6 py-3">
                            {fascicolo ? (
                              <Badge className={conformitaColor(fascicolo.stato_conformita)}>
                                {conformitaLabel(fascicolo.stato_conformita)}
                              </Badge>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-3 text-gray-500">{formatDate(fascicolo?.prossima_scadenza_at)}</td>
                          <td className="px-6 py-3">
                            <Link href={`/dashboard/manutentore/impianti/${imp.id}`}>
                              <Button variant="ghost" size="sm">Fascicolo →</Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

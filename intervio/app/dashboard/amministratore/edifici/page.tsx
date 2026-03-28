import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { conformitaColor, conformitaLabel, tipoImpiantoLabel } from '@/lib/utils'
import Link from 'next/link'
import { NuovoEdificioModal } from '@/components/amministratore/nuovo-edificio-modal'

export default async function EdificiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: edifici } = await supabase
    .from('edifici')
    .select('*, impianti(id, tipo, ubicazione, fascicoli(stato_conformita, prossima_scadenza_at))')
    .eq('amministratore_id', user!.id)
    .order('nome')

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edifici</h1>
          <p className="text-gray-500 text-sm mt-1">Gestione multi-condominio</p>
        </div>
        <NuovoEdificioModal />
      </div>

      {!edifici?.length && (
        <Card><CardContent className="py-12 text-center text-gray-400 text-sm">Nessun edificio. Crea il primo.</CardContent></Card>
      )}

      {edifici?.map(edificio => {
        const impianti = (edificio.impianti as any[]) ?? []
        const conformità = {
          conforme: impianti.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'conforme').length,
          in_scadenza: impianti.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'in_scadenza').length,
          scaduto: impianti.filter((i: any) => i.fascicoli?.[0]?.stato_conformita === 'scaduto').length,
        }

        return (
          <Card key={edificio.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{edificio.nome}</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[edificio.indirizzo_via, edificio.indirizzo_civico, edificio.indirizzo_comune].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {conformità.scaduto > 0 && <Badge className="bg-red-100 text-red-800 border-red-200">{conformità.scaduto} scaduti</Badge>}
                  {conformità.in_scadenza > 0 && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{conformità.in_scadenza} in scadenza</Badge>}
                  {conformità.conforme > 0 && <Badge className="bg-green-100 text-green-800 border-green-200">{conformità.conforme} conformi</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!impianti.length ? (
                <p className="px-6 py-4 text-sm text-gray-400">Nessun impianto registrato</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ubicazione</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Conformità</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pross. scadenza</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {impianti.map((imp: any) => {
                        const f = imp.fascicoli?.[0]
                        return (
                          <tr key={imp.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium">{tipoImpiantoLabel(imp.tipo)}</td>
                            <td className="px-6 py-3 text-gray-500">{imp.ubicazione ?? '—'}</td>
                            <td className="px-6 py-3">
                              {f ? <Badge className={conformitaColor(f.stato_conformita)}>{conformitaLabel(f.stato_conformita)}</Badge> : '—'}
                            </td>
                            <td className="px-6 py-3 text-gray-500">{f?.prossima_scadenza_at ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

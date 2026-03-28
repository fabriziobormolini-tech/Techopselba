import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, tipoImpiantoLabel } from '@/lib/utils'
import { DownloadDocumentoButton } from '@/components/manutentore/download-documento-button'

export default async function DocumentiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: edifici } = await supabase
    .from('edifici')
    .select('id')
    .eq('manutentore_id', user!.id)

  const edificiIds = edifici?.map(e => e.id) ?? []

  const { data: documenti } = await supabase
    .from('documenti')
    .select('*, impianti(tipo, ubicazione, edifici(nome))')
    .order('caricato_il', { ascending: false })
    .limit(100)

  const docs = (documenti ?? []).filter((d: any) => d.impianti)

  const perTipo = docs.reduce((acc: Record<string, any[]>, d: any) => {
    if (!acc[d.tipo]) acc[d.tipo] = []
    acc[d.tipo].push(d)
    return acc
  }, {})

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documenti</h1>
        <p className="text-gray-500 text-sm mt-1">Tutti i documenti caricati sul fascicolo degli impianti</p>
      </div>

      {!docs.length && (
        <Card><CardContent className="py-12 text-center text-gray-400 text-sm">Nessun documento ancora caricato</CardContent></Card>
      )}

      {Object.entries(perTipo).map(([tipo, items]) => (
        <Card key={tipo}>
          <CardHeader>
            <CardTitle className="capitalize">{tipo.replace('_', ' ')} ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Documento</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Impianto</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Edificio</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(items as any[]).map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="font-medium">{d.titolo}</p>
                        {d.file_nome && <p className="text-xs text-gray-400">{d.file_nome}</p>}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{tipoImpiantoLabel(d.impianti?.tipo)}</td>
                      <td className="px-6 py-3 text-gray-500">{(d.impianti?.edifici as any)?.nome}</td>
                      <td className="px-6 py-3 text-gray-500">{formatDate(d.caricato_il)}</td>
                      <td className="px-6 py-3">
                        <DownloadDocumentoButton filePath={d.file_path} fileName={d.file_nome ?? d.titolo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

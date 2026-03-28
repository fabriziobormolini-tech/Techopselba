import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export default async function QRGateway({ params }: { params: { qr_uuid: string } }) {
  const supabase = await createClient()

  // Trova impianto dal QR UUID
  const { data: impianto } = await supabase
    .from('impianti')
    .select('id, edificio_id, edifici(amministratore_id, manutentore_id)')
    .eq('qr_code_uuid', params.qr_uuid)
    .eq('attivo', true)
    .single()

  if (!impianto) notFound()

  // Verifica se l'utente è autenticato
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect al login con next parameter per tornare qui dopo
    redirect(`/login?next=/i/${params.qr_uuid}`)
  }

  // Determina il ruolo e reindirizza alla vista corretta
  const { data: profilo } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (!profilo) redirect('/login')

  const edificio = impianto.edifici as any

  switch (profilo.ruolo) {
    case 'manutentore':
    case 'tecnico':
      redirect(`/dashboard/manutentore/impianti/${impianto.id}`)
    case 'amministratore':
      redirect(`/dashboard/amministratore/impianti/${impianto.id}`)
    case 'condomino':
      redirect(`/dashboard/condomino/impianti/${impianto.id}`)
    default:
      redirect('/dashboard')
  }
}

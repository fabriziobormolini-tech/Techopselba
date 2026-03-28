import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()
  const { impianto_ids, descrizione, scade_giorni = 30 } = body

  if (!impianto_ids?.length) {
    return NextResponse.json({ error: 'impianto_ids richiesto' }, { status: 400 })
  }

  // Genera token sicuro
  const raw = randomBytes(32).toString('hex')
  const secret = process.env.LINK_FIRMATO_SECRET ?? 'dev-secret'
  const token = createHmac('sha256', secret).update(raw).digest('hex') + '.' + raw

  const scade_il = new Date(Date.now() + scade_giorni * 24 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('link_accesso_firmati').insert({
    impianto_ids,
    creato_da: user.id,
    descrizione: descrizione ?? null,
    token,
    scade_il,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({ link: `${appUrl}/v/${token}`, scade_il })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('link_accesso_firmati')
    .select('*')
    .eq('creato_da', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

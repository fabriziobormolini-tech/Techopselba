import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profilo) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar profilo={profilo} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

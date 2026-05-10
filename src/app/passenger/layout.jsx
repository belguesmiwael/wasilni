import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase-server'
import AppShell from '@/components/layout/AppShell'

export default async function PassengerLayout({ children }) {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  return <AppShell user={user} profile={user.profile}>{children}</AppShell>
}

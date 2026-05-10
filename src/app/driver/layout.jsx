import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase-server'
import AppShell from '@/components/layout/AppShell'

export default async function DriverLayout({ children }) {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  if (user.profile?.role === 'passenger') redirect('/passenger/search')
  return <AppShell user={user} profile={user.profile}>{children}</AppShell>
}

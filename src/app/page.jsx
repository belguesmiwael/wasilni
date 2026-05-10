import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase-server'

export default async function Home() {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  const role = user.profile?.role || 'passenger'
  if (role === 'admin') redirect('/admin/dashboard')
  if (role === 'driver') redirect('/driver/dashboard')
  redirect('/passenger/search')
}

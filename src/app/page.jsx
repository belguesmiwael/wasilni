import { getUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LandingPage from './landing/page'

export default async function Home() {
  const user = await getUser()
  if (user) {
    const role = user.profile?.role || 'passenger'
    if (role === 'admin') redirect('/admin/dashboard')
    if (role === 'driver') redirect('/driver/dashboard')
    redirect('/passenger/search')
  }
  return <LandingPage />
}

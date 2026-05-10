import { getUser } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TripTrackerClient from './TripTrackerClient'

export default async function TripPage({ params }) {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  const supabase = await createClient()

  // Get trip + booking
  const { data: trip } = await supabase.from('trips').select('*, user_profiles!driver_id(full_name, phone, rating, is_driver_verified)').eq('id', params.id).single()
  if (!trip) redirect('/passenger/search')

  const { data: booking } = await supabase.from('bookings').select('*').eq('trip_id', params.id).eq('passenger_id', user.id).maybeSingle()

  const role = user.profile?.role || 'passenger'
  const isDriver = trip.driver_id === user.id
  const actualRole = isDriver ? 'driver' : role

  return <TripTrackerClient trip={trip} booking={booking} userRole={actualRole} userId={user.id} />
}

'use client'
import TripTracker from '@/components/maps/TripTracker'
import AppShell from '@/components/layout/AppShell'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TripTrackerClient({ trip, booking, userRole, userId }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('user_profiles').select('*').eq('id', u.id).single()
      setUser(u)
      setProfile(p)
    }
    load()
  }, [])

  if (!user) return null

  return (
    <AppShell user={user} profile={profile}>
      <div style={{ margin: '-28px -24px', height: 'calc(100vh - 64px)' }}>
        <TripTracker tripId={trip.id} bookingId={booking?.id} userRole={userRole} />
      </div>
    </AppShell>
  )
}

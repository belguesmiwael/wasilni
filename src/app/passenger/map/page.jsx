'use client'
import { useState } from 'react'
import { Map, List } from 'lucide-react'
import DriversMap from '@/components/maps/DriversMap'
import BookingModal from '@/components/trips/BookingModal'

export default function PassengerMapPage() {
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [view, setView] = useState('map')

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', margin: '-28px -24px' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Conducteurs disponibles</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cliquez sur un marqueur pour voir les détails et réserver</p>
        </div>
      </div>

      {/* Full screen map */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DriversMap onBook={(trip) => setSelectedTrip(trip)} />
      </div>

      {selectedTrip && (
        <BookingModal
          trip={selectedTrip}
          userProfile={userProfile}
          onClose={() => setSelectedTrip(null)}
          onSuccess={() => setSelectedTrip(null)}
        />
      )}
    </div>
  )
}

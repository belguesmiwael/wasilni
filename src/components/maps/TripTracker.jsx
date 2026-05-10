'use client'
import { useEffect, useRef, useState } from 'react'
import { Navigation, MapPin, Clock, Phone, Shield, AlertOctagon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function TripTracker({ tripId, bookingId, userRole }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const [trip, setTrip] = useState(null)
  const [eta, setEta] = useState(null)
  const [watchId, setWatchId] = useState(null)

  useEffect(() => {
    loadTrip()
    initMap()
    const channel = supabase.channel(`trip-track-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        payload => {
          const { current_lat, current_lng } = payload.new
          if (current_lat && current_lng) updateDriverPosition(current_lat, current_lng)
          setTrip(prev => ({ ...prev, ...payload.new }))
        })
      .subscribe()

    // If driver role, start sending location
    if (userRole === 'driver') startSendingLocation()

    return () => {
      supabase.removeChannel(channel)
      if (watchId) navigator.geolocation.clearWatch(watchId)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [tripId])

  async function loadTrip() {
    const { data } = await supabase.from('trips')
      .select('*, user_profiles!driver_id(full_name, phone, rating, is_driver_verified)')
      .eq('id', tripId).single()
    setTrip(data)
    if (data?.current_lat && mapRef.current) {
      updateDriverPosition(data.current_lat, data.current_lng)
    }
  }

  async function initMap() {
    if (mapRef.current || !mapContainer.current) return
    const mapboxgl = (await import('mapbox-gl')).default
    await import('mapbox-gl/dist/mapbox-gl.css')
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [9.5375, 33.8869],
      zoom: 7,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right')

    map.on('load', async () => {
      mapRef.current = map
      const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single()
      if (!trip) return

      // Draw from → to markers
      if (trip.from_lat && trip.from_lng) {
        const el = document.createElement('div')
        el.style.cssText = 'width:24px;height:24px;background:#10B981;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);'
        new mapboxgl.Marker({ element: el }).setLngLat([trip.from_lng, trip.from_lat])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(`<div style="color:#000;font-weight:700;font-size:13px">📍 Départ<br>${trip.from_city} — ${trip.from_hub || ''}</div>`))
          .addTo(map)
      }
      if (trip.to_lat && trip.to_lng) {
        const el = document.createElement('div')
        el.style.cssText = 'width:24px;height:24px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);'
        new mapboxgl.Marker({ element: el }).setLngLat([trip.to_lng, trip.to_lat])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(`<div style="color:#000;font-weight:700;font-size:13px">🏁 Arrivée<br>${trip.to_city} — ${trip.to_hub || ''}</div>`))
          .addTo(map)
      }

      // Route line
      if (trip.from_lat && trip.to_lat) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[trip.from_lng, trip.from_lat], [trip.to_lng, trip.to_lat]] } }
        })
        map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#00C9B1', 'line-width': 3, 'line-opacity': 0.7, 'line-dasharray': [0, 2] } })
        routeLayerRef.current = true
        map.fitBounds([[trip.from_lng, trip.from_lat], [trip.to_lng, trip.to_lat]], { padding: 80 })
      }

      if (trip.current_lat && trip.current_lng) updateDriverPosition(trip.current_lat, trip.current_lng)
    })
  }

  async function updateDriverPosition(lat, lng) {
    if (!mapRef.current) return
    const mapboxgl = (await import('mapbox-gl')).default

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.style.cssText = 'width:40px;height:40px;background:#00C9B1;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 16px rgba(0,201,177,0.5);animation:ping 2s ease-in-out infinite;'
      el.innerHTML = '🚗'
      driverMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current)
    }
    mapRef.current.panTo([lng, lat], { duration: 1000 })

    // Calculate ETA (rough estimate based on Tunisia avg speed ~80km/h)
    const { data: tripData } = await supabase.from('trips').select('to_lat, to_lng').eq('id', tripId).single()
    if (tripData?.to_lat) {
      const R = 6371
      const dLat = (tripData.to_lat - lat) * Math.PI / 180
      const dLon = (tripData.to_lng - lng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(tripData.to_lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const etaMin = Math.round(dist / 80 * 60)
      setEta(etaMin)
    }
  }

  function startSendingLocation() {
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        await supabase.from('trips').update({ current_lat: lat, current_lng: lng, last_location_update: new Date().toISOString() }).eq('id', tripId)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    )
    setWatchId(id)
  }

  const driver = trip?.user_profiles

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Info bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{trip?.from_city} → {trip?.to_city}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{driver?.full_name} {driver?.is_driver_verified && '✓'}</div>
          </div>
          {eta !== null && (
            <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 100, padding: '4px 12px', fontSize: 12, color: 'var(--teal)', fontWeight: 700, display: 'flex', gap: 5, alignItems: 'center' }}>
              <Clock size={12} />ETA : ~{eta} min
            </div>
          )}
          {trip?.status === 'departed' || trip?.status === 'checked_in' ? (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 100, padding: '4px 12px', fontSize: 11, color: '#10B981', fontWeight: 700 }}>
              🟢 En route
            </div>
          ) : (
            <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 100, padding: '4px 12px', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
              🟡 En attente de départ
            </div>
          )}
        </div>
        {driver?.phone && userRole !== 'driver' && (
          <a href={`tel:${driver.phone}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none', gap: 6 }}>
            <Phone size={13} />Appeler conducteur
          </a>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainer} style={{ flex: 1 }} />
    </div>
  )
}

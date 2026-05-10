'use client'
import { useEffect, useRef, useState } from 'react'
import { Navigation, Phone, Clock, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function TripTracker({ tripId, userRole }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const LRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const watchIdRef = useRef(null)
  const [trip, setTrip] = useState(null)
  const [eta, setEta] = useState(null)

  useEffect(() => {
    initMap()
    loadTrip()

    const ch = supabase.channel(`tracker-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        payload => {
          if (payload.new.current_lat) updateDriverMarker(payload.new.current_lat, payload.new.current_lng)
          setTrip(prev => ({ ...prev, ...payload.new }))
        })
      .subscribe()

    if (userRole === 'driver') startGPS()

    return () => {
      supabase.removeChannel(ch)
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [tripId])

  async function loadTrip() {
    const { data } = await supabase.from('trips')
      .select('*, user_profiles!driver_id(full_name, phone, rating, is_driver_verified)')
      .eq('id', tripId).single()
    setTrip(data)
    if (data?.current_lat && mapRef.current && LRef.current) {
      updateDriverMarker(data.current_lat, data.current_lng)
    }
  }

  async function initMap() {
    if (mapRef.current || !containerRef.current) return
    const L = (await import('leaflet')).default
    LRef.current = L
    delete L.Icon.Default.prototype._getIconUrl

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link'); link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }

    const map = L.map(containerRef.current, { center: [33.8869, 9.5375], zoom: 7 })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB', maxZoom: 19
    }).addTo(map)
    mapRef.current = map

    // Load trip points
    const { data: t } = await supabase.from('trips').select('*').eq('id', tripId).single()
    if (!t) return

    if (t.from_lat) {
      const fromIcon = L.divIcon({ html: `<div style="width:20px;height:20px;background:#10B981;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`, className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
      L.marker([t.from_lat, t.from_lng], { icon: fromIcon }).addTo(map)
        .bindPopup(`<b>📍 Départ</b><br>${t.from_city}${t.from_hub ? ' — ' + t.from_hub : ''}`)
    }
    if (t.to_lat) {
      const toIcon = L.divIcon({ html: `<div style="width:20px;height:20px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`, className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
      L.marker([t.to_lat, t.to_lng], { icon: toIcon }).addTo(map)
        .bindPopup(`<b>🏁 Arrivée</b><br>${t.to_city}${t.to_hub ? ' — ' + t.to_hub : ''}`)
    }
    if (t.from_lat && t.to_lat) {
      L.polyline([[t.from_lat, t.from_lng], [t.to_lat, t.to_lng]], { color: '#00C9B1', weight: 3, opacity: 0.6, dashArray: '8, 8' }).addTo(map)
      map.fitBounds([[t.from_lat, t.from_lng], [t.to_lat, t.to_lng]], { padding: [60, 60] })
    }

    if (t.current_lat) updateDriverMarker(t.current_lat, t.current_lng)
  }

  function updateDriverMarker(lat, lng) {
    const L = LRef.current; const map = mapRef.current
    if (!L || !map) return
    const icon = L.divIcon({
      html: `<div style="width:42px;height:42px;background:#00C9B1;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(0,201,177,0.6);">🚗</div>`,
      className: '', iconSize: [42, 42], iconAnchor: [21, 21]
    })
    if (driverMarkerRef.current) { driverMarkerRef.current.setLatLng([lat, lng]) }
    else { driverMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map).bindPopup('<b>Conducteur</b>') }
    map.panTo([lat, lng], { animate: true, duration: 1 })
    // ETA calc
    if (trip?.to_lat) {
      const d = Math.sqrt((lat - trip.to_lat) ** 2 + (lng - trip.to_lng) ** 2) * 111
      setEta(Math.round(d / 80 * 60))
    }
  }

  function startGPS() {
    const id = navigator.geolocation.watchPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        await supabase.from('trips').update({ current_lat: lat, current_lng: lng, last_location_update: new Date().toISOString() }).eq('id', tripId)
      },
      () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    )
    watchIdRef.current = id
  }

  const driver = trip?.user_profiles

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Info bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{trip?.from_city} → {trip?.to_city}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{driver?.full_name}</span>
          {eta !== null && (
            <span style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 100, padding: '3px 10px', fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />~{eta} min
            </span>
          )}
          {userRole === 'driver' && (
            <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 11, color: '#10B981', fontWeight: 700 }}>
              🔴 GPS actif — position partagée
            </span>
          )}
        </div>
        {driver?.phone && userRole !== 'driver' && (
          <a href={`tel:${driver.phone}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none', gap: 6 }}>
            <Phone size={13} />Appeler
          </a>
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  )
}

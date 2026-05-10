'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Navigation, Users, Car } from 'lucide-react'

export default function DriverMapView() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const LRef = useRef(null)
  const markersRef = useRef([])
  const myMarkerRef = useRef(null)
  const [requests, setRequests] = useState([])
  const [myTrips, setMyTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [myPos, setMyPos] = useState(null)
  const watchRef = useRef(null)

  useEffect(() => {
    initMap()
    loadData()
    const interval = setInterval(loadData, 30000)
    const ch = supabase.channel('driver-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, loadData)
      .subscribe()
    return () => {
      clearInterval(interval)
      supabase.removeChannel(ch)
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && LRef.current) placeMarkers()
  }, [requests, myTrips])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [reqRes, tripsRes] = await Promise.all([
      supabase.from('ride_requests').select('*, user_profiles!passenger_id(full_name, phone, gender, badge_level)')
        .eq('status', 'active').gte('expires_at', new Date().toISOString()).not('from_lat', 'is', null),
      supabase.from('trips').select('*').eq('driver_id', user.id).eq('status', 'active')
    ])
    setRequests(reqRes.data || [])
    setMyTrips(tripsRes.data || [])
    setLoading(false)
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
    // Satellite tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri © OpenStreetMap', maxZoom: 19
    }).addTo(map)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '', maxZoom: 19
    }).addTo(map)
    mapRef.current = map
  }

  function placeMarkers() {
    const L = LRef.current; const map = mapRef.current
    if (!L || !map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Passenger requests
    requests.forEach(req => {
      if (!req.from_lat) return
      const p = req.user_profiles
      const icon = L.divIcon({
        html: `<div style="width:46px;height:46px;background:#8B5CF6;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(139,92,246,0.6);">🙋</div>`,
        className: '', iconSize: [46, 46], iconAnchor: [23, 23]
      })
      const marker = L.marker([req.from_lat, req.from_lng], { icon }).addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;padding:4px;min-width:220px">
            <div style="font-weight:800;font-size:15px;margin-bottom:6px">🙋 ${p?.full_name || 'Passager'}</div>
            <div style="color:#666;font-size:12px;margin-bottom:3px">📍 ${req.from_city} → ${req.to_city}</div>
            <div style="color:#666;font-size:12px;margin-bottom:3px">📅 ${new Date(req.departure_date).toLocaleDateString('fr-TN')}</div>
            ${req.max_price ? `<div style="color:#666;font-size:12px;margin-bottom:6px">💰 Budget max : ${req.max_price} DT</div>` : ''}
            ${req.women_only ? '<div style="color:#D4A853;font-size:11px;margin-bottom:6px">♀ Conductrice uniquement</div>' : ''}
            ${p?.phone ? `<a href="tel:${p.phone}" style="display:inline-block;background:#00C9B1;color:#000;padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;text-decoration:none;margin-top:4px">📞 Appeler ${p.full_name?.split(' ')[0]}</a>` : ''}
          </div>
        `, { maxWidth: 260 })
      markersRef.current.push(marker)

      if (req.to_lat) {
        const line = L.polyline([[req.from_lat, req.from_lng], [req.to_lat, req.to_lng]], { color: '#8B5CF6', weight: 2, opacity: 0.5, dashArray: '5,8' }).addTo(map)
        markersRef.current.push(line)
      }
    })

    // My active trips
    myTrips.forEach(trip => {
      if (!trip.from_lat) return
      const icon = L.divIcon({
        html: `<div style="width:46px;height:46px;background:#00C9B1;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(0,201,177,0.6);">🚗</div>`,
        className: '', iconSize: [46, 46], iconAnchor: [23, 23]
      })
      const marker = L.marker([trip.from_lat, trip.from_lng], { icon }).addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;padding:4px">
            <div style="font-weight:800;font-size:14px;margin-bottom:4px">Mon trajet</div>
            <div style="color:#666;font-size:12px">${trip.from_city} → ${trip.to_city}</div>
            <div style="color:#666;font-size:12px">${trip.available_seats} place(s) · ${trip.price_per_seat} DT</div>
          </div>
        `)
      markersRef.current.push(marker)
      if (trip.to_lat) {
        const line = L.polyline([[trip.from_lat, trip.from_lng], [trip.to_lat, trip.to_lng]], { color: '#00C9B1', weight: 3, opacity: 0.6, dashArray: '6,8' }).addTo(map)
        markersRef.current.push(line)
      }
    })
  }

  function toggleLocationSharing() {
    if (sharing) {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      if (myMarkerRef.current && mapRef.current) { myMarkerRef.current.remove(); myMarkerRef.current = null }
      setSharing(false); setMyPos(null)
    } else {
      setSharing(true)
      watchRef.current = navigator.geolocation.watchPosition(async pos => {
        const lat = pos.coords.latitude; const lng = pos.coords.longitude
        setMyPos({ lat, lng })
        const L = LRef.current; const map = mapRef.current
        if (!L || !map) return
        const icon = L.divIcon({
          html: `<div style="width:36px;height:36px;background:#10B981;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(16,185,129,0.6);">📍</div>`,
          className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        })
        if (myMarkerRef.current) myMarkerRef.current.setLatLng([lat, lng])
        else { myMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Ma position') }
        map.panTo([lat, lng])
      }, () => setSharing(false), { enableHighAccuracy: true })
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Controls */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(10,15,28,0.92)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 700 }}>🙋 {requests.length} passager{requests.length !== 1 ? 's' : ''}</span>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>🚗 {myTrips.length} trajet{myTrips.length !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={toggleLocationSharing}
          style={{ background: sharing ? 'rgba(16,185,129,0.9)' : 'rgba(10,15,28,0.92)', backdropFilter: 'blur(12px)', border: `1px solid ${sharing ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`, borderRadius: 100, padding: '7px 16px', color: sharing ? 'white' : 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Navigation size={13} />{sharing ? '🟢 Position partagée' : 'Partager ma position'}
        </button>
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 20, left: 12, zIndex: 1000, background: 'rgba(10,15,28,0.92)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
        {[
          { color: '#8B5CF6', emoji: '🙋', label: 'Passager cherche un conducteur' },
          { color: '#00C9B1', emoji: '🚗', label: 'Mon trajet actif' },
          { color: '#10B981', emoji: '📍', label: 'Ma position' },
        ].map(({ color, emoji, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, lastChild: { marginBottom: 0 } }}>
            <span style={{ fontSize: 14 }}>{emoji}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

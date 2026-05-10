'use client'
import { useEffect, useRef, useState } from 'react'
import { Star, Shield, Users, ArrowRight, Heart, Car, X, ChevronLeft, ChevronRight, UserCheck, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DriversMap({ onBook, userProfile }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const LRef = useRef(null)
  const markersRef = useRef([])
  const [trips, setTrips] = useState([])
  const [requests, setRequests] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [filter, setFilter] = useState('all') // all | trips | requests

  useEffect(() => {
    initMap()
    loadData()
    const interval = setInterval(loadData, 30000)

    // Realtime
    const ch = supabase.channel('map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => loadData())
      .subscribe()

    return () => { clearInterval(interval); supabase.removeChannel(ch); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  useEffect(() => {
    if (mapRef.current && LRef.current) placeMarkers()
  }, [trips, requests, filter])

  async function loadData() {
    const [tripsRes, reqRes] = await Promise.all([
      supabase.from('trips')
        .select('*, user_profiles!driver_id(full_name, rating, badge_level, is_driver_verified, gender)')
        .eq('status', 'active').gt('available_seats', 0)
        .gte('departure_time', new Date().toISOString())
        .not('from_lat', 'is', null)
        .limit(60),
      supabase.from('ride_requests')
        .select('*, user_profiles!passenger_id(full_name, gender, badge_level)')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .not('from_lat', 'is', null)
        .limit(30)
    ])
    setTrips(tripsRes.data || [])
    setRequests(reqRes.data || [])
    setLoading(false)
  }

  async function initMap() {
    if (mapRef.current || !containerRef.current) return
    const L = (await import('leaflet')).default
    LRef.current = L
    delete L.Icon.Default.prototype._getIconUrl

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }

    const map = L.map(containerRef.current, { center: [33.8869, 9.5375], zoom: 7 })
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri © OpenStreetMap',
        maxZoom: 19
      }).addTo(map)
      // Labels on top of satellite
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '', maxZoom: 19, pane: 'overlayPane'
      }).addTo(map)

    mapRef.current = map
  }

  function placeMarkers() {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // DRIVER TRIP MARKERS
    if (filter !== 'requests') {
      trips.forEach(trip => {
        if (!trip.from_lat || !trip.from_lng) return
        const driver = trip.user_profiles
        const color = trip.women_only ? '#D4A853' : '#00C9B1'
        const icon = L.divIcon({
          html: `<div style="position:relative;width:48px;height:48px">
            <div style="width:48px;height:48px;background:${color};border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,0.5);cursor:pointer;">🚗</div>
            <div style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;background:#EF4444;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:white;">${trip.available_seats}</div>
          </div>`,
          className: '', iconSize: [48, 48], iconAnchor: [24, 24]
        })
        const marker = L.marker([trip.from_lat, trip.from_lng], { icon })
          .addTo(map)
          .on('click', () => { setSelectedTrip({ ...trip, type: 'trip' }); setPhotoIdx(0) })
        markersRef.current.push(marker)

        // Route line
        if (trip.to_lat && trip.to_lng) {
          const line = L.polyline([[trip.from_lat, trip.from_lng], [trip.to_lat, trip.to_lng]], {
            color, weight: 2, opacity: 0.4, dashArray: '6, 8'
          }).addTo(map)
          markersRef.current.push(line)
          // Destination marker
          const destIcon = L.divIcon({
            html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white;opacity:0.7;"></div>`,
            className: '', iconSize: [14, 14], iconAnchor: [7, 7]
          })
          const destMarker = L.marker([trip.to_lat, trip.to_lng], { icon: destIcon }).addTo(map)
          markersRef.current.push(destMarker)
        }
      })
    }

    // PASSENGER REQUEST MARKERS
    if (filter !== 'trips') {
      requests.forEach(req => {
        if (!req.from_lat || !req.from_lng) return
        const icon = L.divIcon({
          html: `<div style="width:42px;height:42px;background:#8B5CF6;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(139,92,246,0.5);">🙋</div>`,
          className: '', iconSize: [42, 42], iconAnchor: [21, 21]
        })
        const marker = L.marker([req.from_lat, req.from_lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:200px;padding:4px">
              <strong style="font-size:14px">${req.user_profiles?.full_name || 'Passager'}</strong><br>
              <span style="color:#666;font-size:12px">${req.from_city} → ${req.to_city}</span><br>
              <span style="color:#666;font-size:12px">📅 ${new Date(req.departure_date).toLocaleDateString('fr-TN')}</span><br>
              ${req.max_price ? `<span style="color:#666;font-size:12px">💰 Max ${req.max_price} DT</span><br>` : ''}
              ${req.women_only ? '<span style="color:#D4A853;font-size:11px">♀ Trajet féminin</span>' : ''}
            </div>
          `, { maxWidth: 240 })
        markersRef.current.push(marker)
      })
    }
  }

  // Fetch driver vehicle photos from kyc
  const [vehiclePhotos, setVehiclePhotos] = useState([])
  useEffect(() => {
    if (!selectedTrip || selectedTrip.type !== 'trip') return
    setVehiclePhotos([])
    supabase.from('driver_kyc').select('vehicle_photos, vehicle_brand, vehicle_model, vehicle_color, vehicle_seats')
      .eq('user_id', selectedTrip.driver_id).single()
      .then(({ data }) => { if (data) setVehiclePhotos(data.vehicle_photos || []) })
  }, [selectedTrip?.id])

  const driver = selectedTrip?.user_profiles
  const depTime = selectedTrip?.departure_time && new Date(selectedTrip.departure_time).toLocaleString('fr-TN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Filter + stats bar */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(12px)', borderRadius: 100, border: '1px solid var(--border)', display: 'flex', overflow: 'hidden' }}>
          {[
            { id: 'all', label: `Tous (${trips.length + requests.length})` },
            { id: 'trips', label: `🚗 Conducteurs (${trips.length})` },
            { id: 'requests', label: `🙋 Passagers (${requests.length})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '7px 14px', background: filter === f.id ? 'var(--teal)' : 'transparent', color: filter === f.id ? '#0A0F1C' : 'var(--muted)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s' }}>
              {f.label}
            </button>
          ))}
        </div>
        {loading && (
          <div style={{ background: 'rgba(10,15,28,0.9)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 14px', fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 12, height: 12, border: '2px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Chargement...
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 24, left: 12, zIndex: 1000, background: 'rgba(10,15,28,0.92)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
        {[
          { color: '#00C9B1', label: 'Trajet standard' },
          { color: '#D4A853', label: 'Trajet féminin' },
          { color: '#8B5CF6', label: 'Passager cherche' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '2px solid white' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Trip detail panel */}
      {selectedTrip && selectedTrip.type === 'trip' && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: 360, height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => setSelectedTrip(null)}
            style={{ position: 'absolute', top: 12, right: 12, background: 'var(--surface-2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', zIndex: 10 }}>
            <X size={16} />
          </button>

          {/* Vehicle photos */}
          <div style={{ height: 200, background: 'var(--surface-2)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            {vehiclePhotos.length > 0 ? (
              <>
                <img src={vehiclePhotos[photoIdx]} alt="Véhicule" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {vehiclePhotos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx(i => (i - 1 + vehiclePhotos.length) % vehiclePhotos.length)}
                      style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                      <ChevronLeft size={15} />
                    </button>
                    <button onClick={() => setPhotoIdx(i => (i + 1) % vehiclePhotos.length)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                      <ChevronRight size={15} />
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                      {vehiclePhotos.map((_, i) => <div key={i} style={{ width: i === photoIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === photoIdx ? 'var(--teal)' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }} />)}
                    </div>
                  </>
                )}
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: 'white' }}>
                  📸 {vehiclePhotos.length} photo{vehiclePhotos.length > 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <Car size={32} color="var(--muted)" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pas de photos du véhicule</span>
              </div>
            )}
          </div>

          <div style={{ padding: 20 }}>
            {/* Route */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 19, fontWeight: 800 }}>{selectedTrip.from_city}</span>
              <ArrowRight size={15} color="var(--muted)" />
              <span style={{ fontSize: 19, fontWeight: 800 }}>{selectedTrip.to_city}</span>
              {selectedTrip.women_only && <span className="tag tag-gold" style={{ fontSize: 10, padding: '2px 8px' }}><Heart size={9} />Féminin</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              <MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />
              {selectedTrip.from_hub || selectedTrip.from_city} → {selectedTrip.to_hub || selectedTrip.to_city}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>📅 {depTime}</div>

            {/* Price + seats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>{selectedTrip.price_per_seat} DT</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>par place</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{selectedTrip.available_seats}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>place{selectedTrip.available_seats !== 1 ? 's' : ''} dispo</div>
              </div>
            </div>

            {/* Driver */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="avatar-fallback" style={{ width: 40, height: 40, fontSize: 14 }}>
                  {driver?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{driver?.full_name}</span>
                    {driver?.is_driver_verified && <Shield size={12} color="var(--teal)" />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--gold)' }}>
                      <Star size={11} fill="var(--gold)" />{(driver?.rating || 5).toFixed(1)}
                    </span>
                    <span className={`badge-${driver?.badge_level || 'nouveau'}`} style={{ fontSize: 10 }}>{driver?.badge_level || 'Nouveau'}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedTrip.notes && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                "{selectedTrip.notes}"
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
              onClick={() => onBook && onBook(selectedTrip)}>
              Réserver ce trajet →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

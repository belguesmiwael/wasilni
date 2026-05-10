'use client'
import { useEffect, useRef, useState } from 'react'
import { Star, Shield, Users, ArrowRight, Heart, Car, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DriversMap({ onBook }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const popupRef = useRef(null)
  const [trips, setTrips] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    initMap()
    loadTrips()
    // Refresh trips every 30s
    const interval = setInterval(loadTrips, 30000)
    return () => {
      clearInterval(interval)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  async function loadTrips() {
    const { data } = await supabase.from('trips')
      .select('*, user_profiles!driver_id(full_name, rating, badge_level, is_driver_verified, gender, avatar_url), driver_kyc!user_profiles(vehicle_brand, vehicle_model, vehicle_color, vehicle_photos, vehicle_seats)')
      .eq('status', 'active')
      .gt('available_seats', 0)
      .gte('departure_time', new Date().toISOString())
      .not('from_lat', 'is', null)
      .not('from_lng', 'is', null)
      .order('departure_time', { ascending: true })
      .limit(50)
    setTrips(data || [])
    setLoading(false)
    if (mapRef.current) placeMarkers(data || [], mapRef.current)
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
      zoom: 6,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right')

    map.on('load', () => {
      mapRef.current = map
      placeMarkers(trips, map)
    })
  }

  async function placeMarkers(tripsData, map) {
    const mapboxgl = (await import('mapbox-gl')).default
    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    tripsData.forEach(trip => {
      if (!trip.from_lat || !trip.from_lng) return
      const driver = trip.user_profiles

      // Custom marker element
      const el = document.createElement('div')
      el.style.cssText = `
        width: 44px; height: 44px; border-radius: 50%;
        background: ${trip.women_only ? 'var(--gold, #D4A853)' : '#00C9B1'};
        border: 3px solid white;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 18px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        transition: transform 0.2s;
        position: relative;
      `
      el.innerHTML = `<span style="color:#0A0F1C;font-size:18px">🚗</span>`
      el.title = `${driver?.full_name} — ${trip.from_city} → ${trip.to_city}`

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
      el.addEventListener('click', () => {
        setSelectedTrip(trip)
        setPhotoIdx(0)
        map.flyTo({ center: [trip.from_lng, trip.from_lat], zoom: 12, duration: 800 })
      })

      // Seats badge
      const badge = document.createElement('div')
      badge.style.cssText = `position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#EF4444;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;border:2px solid white;`
      badge.textContent = trip.available_seats
      el.appendChild(badge)

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([trip.from_lng, trip.from_lat]).addTo(map)
      markersRef.current.push(marker)

      // Draw route line if to_lat/to_lng available
      if (trip.to_lat && trip.to_lng) {
        const sourceId = `route-${trip.id}`
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [[trip.from_lng, trip.from_lat], [trip.to_lng, trip.to_lat]]
              }
            }
          })
          map.addLayer({
            id: sourceId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': trip.women_only ? '#D4A853' : '#00C9B1',
              'line-width': 2,
              'line-opacity': 0.4,
              'line-dasharray': [2, 4]
            }
          })
        }
      }
    })
  }

  const driver = selectedTrip?.user_profiles
  const kyc = selectedTrip?.driver_kyc
  const vehiclePhotos = kyc?.vehicle_photos || []
  const depTime = selectedTrip && new Date(selectedTrip.departure_time).toLocaleString('fr-TN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Loading */}
      {loading && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '8px 16px', fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 14, height: 14, border: '2px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          Chargement des conducteurs...
        </div>
      )}

      {/* Trips count badge */}
      {!loading && (
        <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(10,15,28,0.9)', border: '1px solid var(--teal-border)', borderRadius: 100, padding: '6px 14px', fontSize: 12, color: 'var(--teal)', fontWeight: 700, backdropFilter: 'blur(10px)' }}>
          {trips.length} conducteur{trips.length !== 1 ? 's' : ''} disponible{trips.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 24, left: 16, background: 'rgba(10,15,28,0.9)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#00C9B1', border: '2px solid white' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Trajet standard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#D4A853', border: '2px solid white' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Trajet féminin</span>
        </div>
      </div>

      {/* Driver Info Panel */}
      {selectedTrip && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: 360, height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Close */}
          <button onClick={() => setSelectedTrip(null)}
            style={{ position: 'absolute', top: 12, right: 12, background: 'var(--surface-2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', zIndex: 10 }}>
            <X size={16} />
          </button>

          {/* Vehicle Photos */}
          <div style={{ position: 'relative', height: 200, background: 'var(--surface-2)', flexShrink: 0 }}>
            {vehiclePhotos.length > 0 ? (
              <>
                <img src={vehiclePhotos[photoIdx]} alt="Véhicule" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {vehiclePhotos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx(i => (i - 1 + vehiclePhotos.length) % vehiclePhotos.length)}
                      style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setPhotoIdx(i => (i + 1) % vehiclePhotos.length)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                      <ChevronRight size={16} />
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                      {vehiclePhotos.map((_, i) => (
                        <div key={i} style={{ width: i === photoIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === photoIdx ? 'var(--teal)' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }} />
                      ))}
                    </div>
                  </>
                )}
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: 'white', fontWeight: 600 }}>
                  📸 {photoIdx + 1}/{vehiclePhotos.length} photos
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--muted)' }}>
                <Car size={32} />
                <span style={{ fontSize: 12 }}>Pas de photos du véhicule</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: 20, flex: 1 }}>
            {/* Route */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{selectedTrip.from_city}</span>
              <ArrowRight size={16} color="var(--muted)" />
              <span style={{ fontSize: 20, fontWeight: 800 }}>{selectedTrip.to_city}</span>
              {selectedTrip.women_only && <span className="tag tag-gold" style={{ fontSize: 10 }}><Heart size={9} />Féminin</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{depTime}</div>

            {/* Price + seats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>{selectedTrip.price_per_seat} DT</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>par place</div>
              </div>
              <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{selectedTrip.available_seats}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>place{selectedTrip.available_seats !== 1 ? 's' : ''} dispo</div>
              </div>
            </div>

            {/* Driver info */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <div className="avatar-fallback" style={{ width: 44, height: 44, fontSize: 16 }}>
                  {driver?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{driver?.full_name}</span>
                    {driver?.is_driver_verified && <Shield size={13} color="var(--teal)" />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--gold)' }}>
                      <Star size={11} fill="var(--gold)" />{(driver?.rating || 5).toFixed(1)}
                    </span>
                    <span className={`badge-${driver?.badge_level || 'nouveau'}`} style={{ fontSize: 10 }}>{driver?.badge_level || 'Nouveau'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle details */}
              {kyc && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>🚗 Véhicule</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                    {[
                      ['Modèle', `${kyc.vehicle_brand || ''} ${kyc.vehicle_model || ''}`],
                      ['Couleur', kyc.vehicle_color],
                      ['Places', `${kyc.vehicle_seats} places`],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={{ color: 'var(--muted)' }}>
                        <strong style={{ color: 'var(--text)' }}>{k}:</strong> {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hubs */}
            {(selectedTrip.from_hub || selectedTrip.to_hub) && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--muted)' }}>
                {selectedTrip.from_hub && <div>📍 Départ : <strong style={{ color: 'var(--text)' }}>{selectedTrip.from_hub}</strong></div>}
                {selectedTrip.to_hub && <div style={{ marginTop: 4 }}>🏁 Arrivée : <strong style={{ color: 'var(--text)' }}>{selectedTrip.to_hub}</strong></div>}
              </div>
            )}

            {selectedTrip.notes && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
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

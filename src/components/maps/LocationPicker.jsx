'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, X } from 'lucide-react'

export default function LocationPicker({ label, value, onChange, color = '#00C9B1' }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(value || null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!open || mapRef.current) return
    let map, marker

    async function init() {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: picked ? [picked.lng, picked.lat] : [9.5375, 33.8869],
        zoom: picked ? 12 : 6,
      })

      // Click to place marker
      map.on('click', async (e) => {
        const { lng, lat } = e.lngLat
        if (marker) marker.remove()

        // Reverse geocode
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=fr&types=place,address`)
          const data = await res.json()
          if (data.features?.length > 0) address = data.features[0].place_name
        } catch {}

        const el = document.createElement('div')
        el.style.cssText = `width:28px;height:28px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);`
        marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map)
        markerRef.current = marker
        setPicked({ lat, lng, address })
      })

      // If already has value, place marker
      if (picked) {
        const el = document.createElement('div')
        el.style.cssText = `width:28px;height:28px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);`
        marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([picked.lng, picked.lat]).addTo(map)
        markerRef.current = marker
      }

      mapRef.current = map
    }

    init()
    return () => { if (map) { map.remove(); mapRef.current = null } }
  }, [open])

  function useMyLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=fr`)
        const data = await res.json()
        if (data.features?.length > 0) address = data.features[0].place_name
      } catch {}
      setPicked({ lat, lng, address })
      if (mapRef.current) mapRef.current.flyTo({ center: [lng, lat], zoom: 14 })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: true })
  }

  function confirm() {
    if (picked) { onChange && onChange(picked); setOpen(false) }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'var(--surface)', border: `1px solid ${picked ? color : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s' }}>
        <MapPin size={16} color={picked ? color : 'var(--muted)'} />
        <span style={{ fontSize: 13, color: picked ? 'var(--text)' : 'var(--muted)', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {picked ? picked.address : `Choisir ${label} sur la carte`}
        </span>
        {picked && <X size={14} color="var(--muted)" onClick={e => { e.stopPropagation(); setPicked(null); onChange && onChange(null) }} />}
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 700, background: 'var(--surface)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '80vh' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>Choisir {label}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cliquez sur la carte pour placer le marqueur</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={useMyLocation} disabled={locating} style={{ gap: 6 }}>
                  <Navigation size={13} />{locating ? 'Localisation...' : 'Ma position'}
                </button>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6 }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Map */}
            <div ref={mapContainer} style={{ flex: 1 }} />

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)' }}>
              {picked ? (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Point sélectionné</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{picked.address}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={confirm}>Confirmer ✓</button>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>👆 Cliquez sur la carte pour sélectionner un point</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

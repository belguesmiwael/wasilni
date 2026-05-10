'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, X, Search } from 'lucide-react'

export default function LocationPicker({ label, value, onChange, color = '#00C9B1' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(value || null)
  const [locating, setLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) return
    let map, L

    async function init() {
      L = (await import('leaflet')).default
      delete L.Icon.Default.prototype._getIconUrl

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
        document.head.appendChild(link)
      }

      await new Promise(r => setTimeout(r, 100)) // wait for DOM

      if (!containerRef.current) return
      map = L.map(containerRef.current, {
        center: picked ? [picked.lat, picked.lng] : [33.8869, 9.5375],
        zoom: picked ? 13 : 7,
      })

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri © OpenStreetMap',
        maxZoom: 19
      }).addTo(map)
      // Labels on top of satellite
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '', maxZoom: 19, pane: 'overlayPane'
      }).addTo(map)

      // Custom marker
      const createIcon = (c) => L.divIcon({
        html: `<div style="width:24px;height:24px;background:${c};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 12]
      })

      if (picked) {
        markerRef.current = L.marker([picked.lat, picked.lng], { icon: createIcon(color) }).addTo(map)
      }

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([lat, lng], { icon: createIcon(color) }).addTo(map)
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`)
          const d = await r.json()
          address = d.display_name?.split(',').slice(0, 3).join(', ') || address
        } catch {}
        setPicked({ lat, lng, address })
      })

      mapRef.current = map
    }

    init()
    return () => { if (map) { map.remove(); mapRef.current = null } }
  }, [open])

  async function searchCity() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', Tunisie')}&format=json&limit=1&accept-language=fr`)
      const d = await r.json()
      if (d[0] && mapRef.current) {
        const lat = parseFloat(d[0].lat)
        const lng = parseFloat(d[0].lon)
        mapRef.current.setView([lat, lng], 13)
      }
    } catch {}
    setSearching(false)
  }

  function useMyLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      if (mapRef.current) mapRef.current.setView([lat, lng], 14)
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`)
        const d = await r.json()
        address = d.display_name?.split(',').slice(0, 3).join(', ') || address
      } catch {}
      setPicked({ lat, lng, address })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: true })
  }

  function confirm() {
    if (picked) { onChange && onChange(picked); setOpen(false) }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'var(--surface)', border: `1px solid ${picked ? color : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s', textAlign: 'left' }}>
        <MapPin size={16} color={picked ? color : 'var(--muted)'} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: picked ? 'var(--text)' : 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {picked ? picked.address : `📍 Choisir ${label} sur la carte`}
        </span>
        {picked && <X size={14} color="var(--muted)" onClick={e => { e.stopPropagation(); setPicked(null); onChange && onChange(null) }} />}
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 700, background: 'var(--surface)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '85vh' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input className="input" style={{ paddingLeft: 36, fontSize: 13 }}
                    placeholder="Rechercher une ville en Tunisie..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchCity()} />
                </div>
                <button className="btn btn-outline btn-sm" onClick={searchCity} disabled={searching}>
                  {searching ? '...' : 'OK'}
                </button>
              </div>
              <button className="btn btn-outline btn-sm" onClick={useMyLocation} disabled={locating} style={{ gap: 6, flexShrink: 0 }}>
                <Navigation size={13} />{locating ? '...' : 'Ma position'}
              </button>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6 }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ padding: '8px 20px', fontSize: 12, color: 'var(--muted)', background: 'var(--surface)', flexShrink: 0 }}>
              Cliquez sur la carte pour placer le marqueur
            </p>

            {/* Map */}
            <div ref={containerRef} style={{ flex: 1 }} />

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)', flexShrink: 0 }}>
              {picked ? (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Point sélectionné</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{picked.address}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={confirm}>✓ Confirmer</button>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>👆 Cliquez sur la carte pour sélectionner</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

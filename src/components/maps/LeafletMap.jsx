'use client'
import { useEffect, useRef } from 'react'

// Base Leaflet map with OpenStreetMap - no token needed
export default function LeafletMap({ center, zoom = 7, onMapReady, style = {} }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    async function init() {
      const L = (await import('leaflet')).default
      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Inject CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
        document.head.appendChild(link)
      }

      const map = L.map(containerRef.current, {
        center: center || [33.8869, 9.5375],
        zoom,
        zoomControl: true,
      })

      // Dark OSM tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      onMapReady && onMapReady(map, L)
    }

    init()
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit', ...style }} />
  )
}

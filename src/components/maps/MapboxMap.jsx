'use client'
import { useEffect, useRef, useState } from 'react'

// Lazy-loads mapbox-gl to avoid SSR issues
export default function MapboxMap({ center, zoom = 7, onLoad, style = {}, children }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return
    let map

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: center || [9.5375, 33.8869], // Tunisia center
        zoom,
        attributionControl: false,
      })

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }), 'top-right')

      map.on('load', () => {
        mapRef.current = map
        setReady(true)
        onLoad && onLoad(map)
      })
    }

    initMap()
    return () => { if (map) map.remove() }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
      {ready && children && children(mapRef.current)}
    </div>
  )
}

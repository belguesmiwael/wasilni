'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Floating satellite map button visible in all spaces
export default function MapButton({ role }) {
  const pathname = usePathname()
  const isMapPage = pathname?.includes('/map') || pathname?.includes('/trip/')
  if (isMapPage) return null

  const href = '/passenger/map'
  
  return (
    <Link href={href}
      style={{
        position: 'fixed', bottom: 96, right: 24, zIndex: 90,
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a6b5c 0%, #00C9B1 100%)',
        border: '2px solid rgba(0,201,177,0.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,201,177,0.4)',
        textDecoration: 'none',
        transition: 'all 0.2s',
        gap: 2,
      }}
      title="Ouvrir la carte satellite"
    >
      <span style={{ fontSize: 22 }}>🛰️</span>
      <span style={{ fontSize: 8, color: 'white', fontWeight: 800, letterSpacing: '0.5px' }}>CARTE</span>
    </Link>
  )
}

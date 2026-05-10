'use client'
import { useState, useEffect } from 'react'
import { Navigation, Users, Car, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// Lazy load map to avoid SSR
const DriverMapView = dynamic(() => import('@/components/maps/DriverMapView'), { 
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span>Chargement de la carte satellite...</span>
    </div>
  )
})

export default function DriverMapPage() {
  return (
    <div style={{ height: 'calc(100vh - 64px)', margin: '-28px -24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>🛰️ Carte satellite — Vue conducteur</h1>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>🙋 Passagers cherchant un trajet · 🚗 Vos trajets actifs · Position en temps réel</p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DriverMapView />
      </div>
    </div>
  )
}

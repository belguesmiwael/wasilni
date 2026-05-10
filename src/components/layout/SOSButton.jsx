'use client'
import { useState, useEffect, useRef } from 'react'
import { AlertOctagon, X, PhoneCall, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

export default function SOSButton({ user }) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sent, setSent] = useState(false)
  const [activeBooking, setActiveBooking] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const holdTimer = useRef(null)
  const progressTimer = useRef(null)
  const pathname = usePathname()

  // Only show on passenger/trip pages
  const isVisible = pathname?.startsWith('/passenger') || pathname?.startsWith('/trip')

  useEffect(() => {
    if (!user || !isVisible) return
    checkActiveBooking()
  }, [user, pathname])

  async function checkActiveBooking() {
    const { data } = await supabase.from('bookings')
      .select('id, trip_id, trips(from_city, to_city)')
      .eq('passenger_id', user.id)
      .in('status', ['confirmed', 'checked_in'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setActiveBooking(data)
  }

  function startHold() {
    setHolding(true)
    setProgress(0)
    let p = 0
    progressTimer.current = setInterval(() => {
      p += 5
      setProgress(p)
      if (p >= 100) {
        clearInterval(progressTimer.current)
        triggerSOS()
      }
    }, 100)
  }

  function stopHold() {
    setHolding(false)
    setProgress(0)
    clearInterval(progressTimer.current)
  }

  async function triggerSOS() {
    if (sent || !user) return
    setSent(true)
    setShowConfirm(true)

    let lat = null, lng = null
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { lat = pos.coords.latitude; lng = pos.coords.longitude },
        () => {}
      )
    }

    await supabase.from('sos_alerts').insert({
      user_id: user.id,
      booking_id: activeBooking?.id || null,
      trip_id: activeBooking?.trip_id || null,
      lat, lng,
      status: 'active'
    })

    // Notify admin via realtime (already done via DB insert + realtime subscription on admin side)
    setTimeout(() => { setSent(false); setShowConfirm(false) }, 8000)
  }

  if (!isVisible) return null

  return (
    <>
      {/* SOS Trigger Button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {!showConfirm && (
          <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)', fontWeight: 700, letterSpacing: '1px', textAlign: 'center' }}>
            MAINTENIR<br/>POUR SOS
          </div>
        )}
        <div style={{ position: 'relative' }}>
          {holding && <div className="sos-ring" />}
          <button
            className="sos-btn"
            onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
            onTouchStart={e => { e.preventDefault(); startHold() }}
            onTouchEnd={stopHold}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Progress ring */}
            {holding && (
              <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="29" fill="none" stroke="white" strokeWidth="3"
                  strokeDasharray={`${progress * 1.82} 182`} strokeLinecap="round" opacity="0.8" />
              </svg>
            )}
            <AlertOctagon size={26} color="white" />
          </button>
        </div>
      </div>

      {/* SOS Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="animate-fade-in">
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 20, padding: 40, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-ring 1.5s ease-out infinite' }} />
              <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <AlertOctagon size={36} color="white" />
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', color: 'var(--red)', marginBottom: 12 }}>ALERTE SOS ENVOYÉE</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>Nous arrivons</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Notre équipe a reçu votre alerte avec votre position. <strong style={{ color: 'var(--text)' }}>Vous allez recevoir un appel dans les 2 minutes.</strong>
            </p>
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <PhoneCall size={18} color="var(--teal)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Support Waselni 24/7</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>+216 XX XXX XXX</div>
              </div>
            </div>
            {activeBooking && (
              <div style={{ background: 'var(--red-dim)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <MapPin size={14} color="var(--red)" />
                <span style={{ fontSize: 12, color: 'var(--red)' }}>
                  Trajet : {activeBooking.trips?.from_city} → {activeBooking.trips?.to_city}
                </span>
              </div>
            )}
            <button onClick={() => { setShowConfirm(false); setSent(false) }}
              className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
              <X size={14} /> Fermer — Je suis en sécurité
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { X, CreditCard, Wallet, Smartphone, Clock, Shield, AlertTriangle, CheckCircle, QrCode, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

const PAYMENT_METHODS = [
  { id: 'konnect', label: 'Konnect', icon: CreditCard, desc: 'Carte bancaire / TPE' },
  { id: 'flouci', label: 'Flouci', icon: Smartphone, desc: 'Wallet Flouci' },
  { id: 'd17', label: 'D17', icon: CreditCard, desc: 'Carte prépayée D17' },
  { id: 'wallet', label: 'Mon solde', icon: Wallet, desc: 'Portefeuille Waselni' },
]

export default function BookingModal({ trip, userProfile, onClose, onSuccess }) {
  const [step, setStep] = useState('confirm') // confirm | payment | processing | success
  const [payMethod, setPayMethod] = useState('konnect')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(900) // 15 min
  const [booking, setBooking] = useState(null)
  const [womenCount, setWomenCount] = useState(0)
  const [safetyBlocked, setSafetyBlocked] = useState(false)

  const driver = trip.user_profiles
  const commission = trip.price_per_seat * 0.10
  const driverAmount = trip.price_per_seat - commission

  useEffect(() => {
    checkWomenSafety()
  }, [])

  useEffect(() => {
    if (step === 'payment') {
      const t = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(t); onClose(); return 0 }
          return c - 1
        })
      }, 1000)
      return () => clearInterval(t)
    }
  }, [step])

  async function checkWomenSafety() {
    if (userProfile?.gender !== 'female' || driver?.gender !== 'male') return
    // Count confirmed female passengers
    const { count } = await supabase.from('bookings')
      .select('id', { count: 'exact' })
      .eq('trip_id', trip.id)
      .in('status', ['confirmed', 'checked_in'])
    // Check how many are female
    const { data: bookings } = await supabase.from('bookings')
      .select('passenger_id, user_profiles!passenger_id(gender)')
      .eq('trip_id', trip.id)
      .in('status', ['confirmed', 'checked_in'])
    const femaleCount = bookings?.filter(b => b.user_profiles?.gender === 'female').length || 0
    setWomenCount(femaleCount)
    // If user would be alone female with male driver → block
    if (femaleCount === 0) setSafetyBlocked(true)
  }

  async function createBooking() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { data, error: err } = await supabase.from('bookings').insert({
      trip_id: trip.id,
      passenger_id: user.id,
      seats_booked: 1,
      total_amount: trip.price_per_seat,
      commission_amount: commission,
      driver_amount: driverAmount,
      status: 'pending_payment',
      locked_until: lockedUntil,
    }).select().single()
    if (err) { setError(err.message); setLoading(false); return }
    setBooking(data)
    setStep('payment')
    setLoading(false)
  }

  async function processPayment() {
    if (!booking) return
    setLoading(true)
    setStep('processing')
    // Simulate payment gateway (real: redirect to Konnect/Flouci)
    await new Promise(r => setTimeout(r, 2000))
    const { error: err } = await supabase.from('bookings').update({
      status: 'confirmed',
      payment_method: payMethod,
      payment_reference: `WS-${Date.now()}`
    }).eq('id', booking.id)
    if (err) { setError(err.message); setStep('payment'); setLoading(false); return }
    // Decrease available seats
    await supabase.from('trips').update({ available_seats: trip.available_seats - 1 }).eq('id', trip.id)
    // Notify driver
    await supabase.from('notifications').insert({
      user_id: trip.driver_id,
      title: 'Nouvelle réservation !',
      body: `${userProfile?.full_name || 'Un passager'} a réservé une place pour ${trip.from_city} → ${trip.to_city}`,
      type: 'booking', action_url: `/driver/trips`
    })
    setStep('success')
    setLoading(false)
  }

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  const depTime = new Date(trip.departure_time).toLocaleString('fr-TN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="animate-fade-in">
      <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>
              {step === 'confirm' ? 'Confirmer la réservation' : step === 'payment' ? 'Choisir le paiement' : step === 'processing' ? 'Traitement...' : 'Réservation confirmée !'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{trip.from_city} → {trip.to_city} · {depTime}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Safety Blocked */}
          {safetyBlocked && (
            <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <AlertTriangle size={20} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold)', marginBottom: 6 }}>Règle de sécurité féminine</div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                    Vous ne pouvez pas voyager seule avec ce conducteur. Il faut au minimum <strong style={{ color: 'var(--text)' }}>une autre femme</strong> dans le trajet.
                  </p>
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gold)' }}>
                    👉 Cherchez un trajet "<strong>Féminin uniquement</strong>" ou attendez qu'une autre femme réserve ce trajet.
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" onClick={onClose} style={{ width: '100%', justifyContent: 'center', marginTop: 16, fontSize: 13 }}>
                Chercher d'autres trajets
              </button>
            </div>
          )}

          {!safetyBlocked && (
            <>
              {/* STEP: Confirm */}
              {step === 'confirm' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Trip summary */}
                  <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{trip.from_city} → {trip.to_city}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Hub départ : {trip.from_hub || trip.from_city}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>{trip.price_per_seat} DT</div>
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                      <span>Commission Waselni (10%)</span><span>-{commission.toFixed(2)} DT</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      <span>Conducteur reçoit</span><span>{driverAmount.toFixed(2)} DT</span>
                    </div>
                  </div>

                  {/* Escrow info */}
                  <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
                    <Shield size={16} color="var(--teal)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: 'var(--teal)', lineHeight: 1.6 }}>
                      Votre paiement est <strong>sécurisé en escrow</strong> jusqu'à confirmation d'arrivée. Le conducteur ne reçoit rien avant la fin du trajet.
                    </p>
                  </div>

                  {womenCount > 0 && (
                    <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
                      <Users size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: 'var(--gold)', lineHeight: 1.6 }}>
                        {womenCount} femme{womenCount > 1 ? 's' : ''} déjà dans ce trajet. ✓
                      </p>
                    </div>
                  )}

                  {error && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</div>}

                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                    onClick={createBooking} disabled={loading}>
                    {loading ? 'Blocage de la place...' : 'Continuer vers le paiement →'}
                  </button>
                </div>
              )}

              {/* STEP: Payment */}
              {step === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Timer */}
                  <div style={{ background: countdown < 60 ? 'var(--red-dim)' : 'var(--surface-2)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${countdown < 60 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color={countdown < 60 ? 'var(--red)' : 'var(--gold)'} />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Place réservée pendant</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: countdown < 60 ? 'var(--red)' : 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(countdown)}
                    </span>
                  </div>

                  <div>
                    <label className="label" style={{ marginBottom: 10 }}>Moyen de paiement</label>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                        <button key={id} onClick={() => setPayMethod(id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: payMethod === id ? 'var(--teal-dim)' : 'var(--surface-2)', border: `2px solid ${payMethod === id ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: payMethod === id ? 'rgba(0,201,177,0.2)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={18} color={payMethod === id ? 'var(--teal)' : 'var(--muted)'} />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: payMethod === id ? 'var(--teal)' : 'var(--text)' }}>{label}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
                          </div>
                          {payMethod === id && <CheckCircle size={18} color="var(--teal)" style={{ marginLeft: 'auto' }} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
                    onClick={processPayment}>
                    Payer {trip.price_per_seat} DT →
                  </button>
                </div>
              )}

              {/* STEP: Processing */}
              {step === 'processing' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 60, height: 60, border: '3px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Traitement du paiement</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>Votre paiement est sécurisé en escrow...</p>
                </div>
              )}

              {/* STEP: Success */}
              {step === 'success' && booking && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-dim)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle size={32} color="var(--teal)" />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Réservation confirmée !</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                    Présentez ce QR code au conducteur lors de l'embarquement.
                  </p>
                  <div style={{ background: 'white', borderRadius: 16, padding: 20, display: 'inline-block', margin: '0 auto 20px' }}>
                    <QRCodeSVG value={booking.qr_code} size={160} level="H" />
                  </div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
                    Code : <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{booking.qr_code?.toUpperCase().slice(0, 8)}</strong>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { onSuccess && onSuccess() }}>
                    Voir mes trajets →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

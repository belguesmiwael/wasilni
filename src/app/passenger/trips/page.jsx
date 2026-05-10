'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, Clock, MapPin, Star, CheckCircle, XCircle, QrCode, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

const STATUS_MAP = {
  pending_payment: { label: 'En attente de paiement', cls: 'status-pending-b' },
  confirmed: { label: 'Confirmée', cls: 'status-confirmed' },
  checked_in: { label: 'En route', cls: 'status-active-b' },
  completed: { label: 'Terminée', cls: 'status-completed' },
  cancelled: { label: 'Annulée', cls: 'status-cancelled' },
  expired: { label: 'Expirée', cls: 'status-cancelled' },
  refunded: { label: 'Remboursée', cls: 'status-completed' },
}

export default function PassengerTripsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [showQR, setShowQR] = useState(null)
  const [showRating, setShowRating] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  useEffect(() => { loadBookings() }, [])

  async function loadBookings() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('bookings')
      .select('*, trips(*, user_profiles!driver_id(full_name, rating, badge_level, avatar_url))')
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function submitRating() {
    if (!showRating) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ratings').insert({
      booking_id: showRating.id,
      rater_id: user.id,
      rated_id: showRating.trips?.driver_id,
      role_rated: 'driver',
      score: rating,
      comment,
    })
    await supabase.from('bookings').update({ rating_given: true }).eq('id', showRating.id)
    setShowRating(null)
    setRating(5)
    setComment('')
    loadBookings()
  }

  const upcoming = bookings.filter(b => ['pending_payment', 'confirmed', 'checked_in'].includes(b.status))
  const past = bookings.filter(b => ['completed', 'cancelled', 'expired', 'refunded'].includes(b.status))
  const displayed = activeTab === 'upcoming' ? upcoming : past

  const formatDate = dt => new Date(dt).toLocaleDateString('fr-TN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Mes réservations</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Suivi de vos trajets passés et à venir.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 24 }}>
        {[{ id: 'upcoming', label: `À venir (${upcoming.length})` }, { id: 'past', label: `Historique (${past.length})` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: activeTab === t.id ? 'var(--teal)' : 'transparent', color: activeTab === t.id ? '#0A0F1C' : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <AlertCircle size={36} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Aucune réservation</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {activeTab === 'upcoming' ? 'Recherchez et réservez votre prochain trajet.' : 'Vos trajets passés apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {displayed.map(b => {
            const trip = b.trips
            const driver = trip?.user_profiles
            const statusInfo = STATUS_MAP[b.status] || STATUS_MAP.confirmed
            const initials = driver?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <div key={b.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar-fallback" style={{ width: 42, height: 42, fontSize: 14 }}>{initials}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{trip?.from_city}</span>
                        <ArrowRight size={14} color="var(--muted)" />
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{trip?.to_city}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {trip && formatDate(trip.departure_time)} · {driver?.full_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)', marginTop: 6 }}>{b.total_amount} DT</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {b.status === 'confirmed' && (
                    <button className="btn btn-outline btn-sm" onClick={() => setShowQR(b)} style={{ gap: 6 }}>
                      <QrCode size={14} />Mon QR code
                    </button>
                  )}
                  {b.status === 'completed' && !b.rating_given && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowRating(b)} style={{ gap: 6 }}>
                      <Star size={14} />Noter le conducteur
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowQR(null)}>
          <div className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, marginBottom: 16 }}>Votre QR d'embarquement</h3>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, display: 'inline-block', marginBottom: 16 }}>
              <QRCodeSVG value={showQR.qr_code} size={160} level="H" />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>Présentez ce QR code au conducteur</p>
            <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowQR(null)}>Fermer</button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ padding: 28, maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontWeight: 800, marginBottom: 6 }}>Notez le conducteur</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>{showRating.trips?.from_city} → {showRating.trips?.to_city}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Star size={32} fill={s <= rating ? 'var(--gold)' : 'none'} color="var(--gold)" />
                </button>
              ))}
            </div>
            <textarea className="input" placeholder="Votre commentaire (optionnel)" rows={3}
              value={comment} onChange={e => setComment(e.target.value)}
              style={{ resize: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowRating(null)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submitRating}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

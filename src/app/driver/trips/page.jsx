'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, Users, Clock, CheckCircle, XCircle, Trash2, QrCode, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

export default function DriverTripsPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedTrip, setExpandedTrip] = useState(null)
  const [tripBookings, setTripBookings] = useState({})
  const [showQR, setShowQR] = useState(null)
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('trips').select('*').eq('driver_id', user.id).order('departure_time', { ascending: false })
    setTrips(data || [])
    setLoading(false)
  }

  async function loadBookings(tripId) {
    if (tripBookings[tripId]) { setExpandedTrip(expandedTrip === tripId ? null : tripId); return }
    const { data } = await supabase.from('bookings')
      .select('*, user_profiles!passenger_id(full_name, phone, gender, rating, badge_level)')
      .eq('trip_id', tripId).in('status', ['confirmed', 'checked_in', 'completed'])
    setTripBookings(t => ({ ...t, [tripId]: data || [] }))
    setExpandedTrip(expandedTrip === tripId ? null : tripId)
  }

  async function cancelTrip(tripId) {
    if (!confirm('Annuler ce trajet ? Les passagers confirmés seront remboursés.')) return
    await supabase.from('trips').update({ status: 'cancelled' }).eq('id', tripId)
    // Refund all confirmed bookings
    const { data: bookings } = await supabase.from('bookings').select('id, passenger_id, total_amount').eq('trip_id', tripId).eq('status', 'confirmed')
    if (bookings?.length > 0) {
      await supabase.from('bookings').update({ status: 'refunded' }).in('id', bookings.map(b => b.id))
      // Notify passengers
      await supabase.from('notifications').insert(bookings.map(b => ({
        user_id: b.passenger_id, title: 'Trajet annulé', type: 'trip',
        body: 'Le conducteur a annulé ce trajet. Vous serez remboursé.'
      })))
    }
    loadTrips()
  }

  async function checkinPassenger(bookingId) {
    await supabase.from('bookings').update({ checkin_driver: true, status: 'checked_in' }).eq('id', bookingId)
    loadTrips()
  }

  async function completeTrip(tripId) {
    await supabase.from('trips').update({ status: 'completed' }).eq('id', tripId)
    // Release escrow for all checked-in bookings
    const { data: bookings } = await supabase.from('bookings')
      .select('id, driver_amount, passenger_id').eq('trip_id', tripId).in('status', ['confirmed', 'checked_in'])
    if (bookings?.length > 0) {
      await supabase.from('bookings').update({ status: 'completed' }).in('id', bookings.map(b => b.id))
      const { data: { user } } = await supabase.auth.getUser()
      const totalDriverAmount = bookings.reduce((s, b) => s + (b.driver_amount || 0), 0)
      // Credit wallet
      const { data: wallet } = await supabase.from('wallets').select('id, balance, total_earned').eq('user_id', user.id).single()
      await supabase.from('wallets').update({ balance: (wallet.balance + totalDriverAmount), total_earned: (wallet.total_earned + totalDriverAmount) }).eq('id', wallet.id)
      await supabase.from('transactions').insert({ wallet_id: wallet.id, type: 'credit', amount: totalDriverAmount, description: `Gains trajet — ${bookings.length} passager(s)`, status: 'completed' })
      // Notify passengers
      await supabase.from('notifications').insert(bookings.map(b => ({
        user_id: b.passenger_id, title: 'Trajet terminé !', type: 'trip',
        body: 'Vous êtes arrivé à destination. N\'oubliez pas de noter votre conducteur.'
      })))
    }
    loadTrips()
  }

  const active = trips.filter(t => ['active', 'full', 'departed'].includes(t.status))
  const past = trips.filter(t => ['completed', 'cancelled'].includes(t.status))
  const displayed = activeTab === 'active' ? active : past

  const formatDT = dt => new Date(dt).toLocaleString('fr-TN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Mes trajets publiés</h1>
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[{ id: 'active', label: `En cours (${active.length})` }, { id: 'past', label: `Historique (${past.length})` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: activeTab === t.id ? 'var(--teal)' : 'transparent', color: activeTab === t.id ? '#0A0F1C' : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} /> :
      displayed.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Aucun trajet dans cet onglet</p>
        </div>
      ) : displayed.map(trip => (
        <div key={trip.id} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{trip.from_city}</span>
                  <ArrowRight size={14} color="var(--muted)" />
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{trip.to_city}</span>
                  {trip.women_only && <span className="tag tag-gold" style={{ fontSize: 10, padding: '2px 8px' }}>Féminin</span>}
                  {trip.is_recurring && <span className="tag" style={{ fontSize: 10, padding: '2px 8px' }}>Récurrent</span>}
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{formatDT(trip.departure_time)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{trip.available_seats}/{trip.total_seats} places</span>
                  <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{trip.price_per_seat} DT</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`status-badge ${trip.status === 'active' ? 'status-active-b' : trip.status === 'completed' ? 'status-completed' : trip.status === 'full' ? 'status-confirmed' : 'status-cancelled'}`}>
                  {trip.status === 'active' ? 'Actif' : trip.status === 'full' ? 'Complet' : trip.status === 'completed' ? 'Terminé' : 'Annulé'}
                </span>
                {['active', 'full'].includes(trip.status) && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => completeTrip(trip.id)}>
                      <CheckCircle size={13} />Terminer
                    </button>
                    <button onClick={() => cancelTrip(trip.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => loadBookings(trip.id)}>
                  <Eye size={13} />{expandedTrip === trip.id ? 'Masquer' : 'Passagers'}
                </button>
              </div>
            </div>
          </div>

          {/* Passengers list */}
          {expandedTrip === trip.id && (
            <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              {(tripBookings[trip.id] || []).length === 0 ? (
                <div style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: 13 }}>Aucun passager pour le moment</div>
              ) : (tripBookings[trip.id] || []).map(b => {
                const p = b.user_profiles
                const initials = p?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                return (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="avatar-fallback" style={{ width: 34, height: 34, fontSize: 12 }}>{initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {p?.gender === 'male' ? 'Homme' : 'Femme'} · {p?.phone}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`status-badge ${b.status === 'confirmed' ? 'status-confirmed' : b.status === 'checked_in' ? 'status-active-b' : 'status-completed'}`}>
                        {b.status === 'confirmed' ? 'Confirmé' : b.status === 'checked_in' ? 'Embarqué' : 'Terminé'}
                      </span>
                      {b.status === 'confirmed' && (
                        <button className="btn btn-primary btn-sm" onClick={() => checkinPassenger(b.id)}>
                          <CheckCircle size={12} />Check-in
                        </button>
                      )}
                      <button onClick={() => setShowQR(b.qr_code)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6 }}>
                        <QrCode size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {showQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowQR(null)}>
          <div className="card" style={{ padding: 28, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>QR Passager</h3>
            <div style={{ background: 'white', borderRadius: 12, padding: 16, display: 'inline-block' }}>
              <QRCodeSVG value={showQR} size={140} level="H" />
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => setShowQR(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}

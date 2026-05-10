'use client'
import { useState, useEffect } from 'react'
import { MapPin, Plus, X, Heart, Users } from 'lucide-react'
import DriversMap from '@/components/maps/DriversMap'
import BookingModal from '@/components/trips/BookingModal'
import LocationPicker from '@/components/maps/LocationPicker'
import { supabase } from '@/lib/supabase'

const CITIES = ['Tunis','Sfax','Sousse','Monastir','Bizerte','Nabeul','Kairouan','Gabès','Gafsa','Médenine','Sidi Bouzid','Kasserine','Mahdia','Béja','Jendouba']

export default function PassengerMapPage() {
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [myRequest, setMyRequest] = useState(null)
  const [form, setForm] = useState({ from_city: '', to_city: '', departure_date: '', max_price: '', women_only: false })
  const [fromLocation, setFromLocation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProfile()
    loadMyRequest()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setUserProfile(data)
  }

  async function loadMyRequest() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('ride_requests').select('*')
      .eq('passenger_id', user.id).eq('status', 'active')
      .gte('expires_at', new Date().toISOString()).maybeSingle()
    setMyRequest(data)
  }

  async function submitRequest() {
    if (!form.from_city || !form.to_city || !form.departure_date) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('ride_requests').insert({
      passenger_id: user.id,
      from_city: form.from_city,
      to_city: form.to_city,
      from_lat: fromLocation?.lat || null,
      from_lng: fromLocation?.lng || null,
      departure_date: form.departure_date,
      max_price: form.max_price ? parseFloat(form.max_price) : null,
      women_only: form.women_only,
      status: 'active',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    if (!error) { setSuccess(true); setShowRequestForm(false); loadMyRequest(); setTimeout(() => setSuccess(false), 3000) }
    setSubmitting(false)
  }

  async function cancelRequest() {
    if (!myRequest) return
    await supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', myRequest.id)
    setMyRequest(null)
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', margin: '-28px -24px' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Carte temps réel</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>🚗 Conducteurs disponibles · 🙋 Passagers cherchant un trajet</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {success && <span style={{ fontSize: 12, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 100, padding: '6px 14px', fontWeight: 700 }}>✓ Demande publiée !</span>}
          {myRequest ? (
            <button className="btn btn-danger btn-sm" onClick={cancelRequest} style={{ gap: 6 }}>
              <X size={13} />Annuler ma demande
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowRequestForm(true)} style={{ gap: 6 }}>
              <Plus size={13} />Je cherche un conducteur
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DriversMap onBook={setSelectedTrip} userProfile={userProfile} />
      </div>

      {/* Booking modal */}
      {selectedTrip && (
        <BookingModal trip={selectedTrip} userProfile={userProfile}
          onClose={() => setSelectedTrip(null)}
          onSuccess={() => setSelectedTrip(null)} />
      )}

      {/* Request form modal */}
      {showRequestForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28, borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, fontSize: 17 }}>🙋 Publier ma demande de trajet</h3>
              <button onClick={() => setShowRequestForm(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Votre demande apparaîtra sur la carte et les conducteurs pourront vous contacter.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Départ *</label>
                  <select className="input" value={form.from_city} onChange={e => setForm(f => ({ ...f, from_city: e.target.value }))}>
                    <option value="">Ville...</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Destination *</label>
                  <select className="input" value={form.to_city} onChange={e => setForm(f => ({ ...f, to_city: e.target.value }))}>
                    <option value="">Ville...</option>
                    {CITIES.filter(c => c !== form.from_city).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Ma position de départ (optionnel)</label>
                <LocationPicker label="ma position" value={fromLocation} onChange={setFromLocation} color="#8B5CF6" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Date souhaitée *</label>
                  <input className="input" type="date" min={new Date().toISOString().split('T')[0]}
                    value={form.departure_date} onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Budget max (DT)</label>
                  <input className="input" type="number" placeholder="Ex: 25"
                    value={form.max_price} onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))} />
                </div>
              </div>
              {userProfile?.gender === 'female' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: form.women_only ? 'var(--gold-dim)' : 'var(--surface-2)', border: `1px solid ${form.women_only ? 'var(--gold-border)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => setForm(f => ({ ...f, women_only: !f.women_only }))}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Heart size={15} color={form.women_only ? 'var(--gold)' : 'var(--muted)'} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: form.women_only ? 'var(--gold)' : 'var(--muted)' }}>Conductrice uniquement</span>
                  </div>
                  <div style={{ width: 38, height: 22, borderRadius: 11, background: form.women_only ? 'var(--gold)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: form.women_only ? 19 : 3, transition: 'left 0.2s' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowRequestForm(false)}>Annuler</button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={submitRequest} disabled={submitting || !form.from_city || !form.to_city || !form.departure_date}>
                  {submitting ? 'Publication...' : '📍 Publier sur la carte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

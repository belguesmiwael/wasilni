'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Users, DollarSign, Heart, Calendar, CheckCircle, AlertCircle, Info } from 'lucide-react'
import LocationPicker from '@/components/maps/LocationPicker'
import { supabase } from '@/lib/supabase'

const CITIES = ['Tunis','Sfax','Sousse','Monastir','Bizerte','Nabeul','Kairouan','Gabès','Gafsa','Médenine','Tataouine','Tozeur','Kebili','Sidi Bouzid','Kasserine','Siliana','Zaghouan','Béja','Jendouba','Le Kef','Mahdia','Manouba','Ben Arous','Ariana']
const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']

// Price suggestion based on distance
const PRICE_MAP = {
  'Tunis-Sfax': 30, 'Tunis-Sousse': 20, 'Tunis-Monastir': 22, 'Tunis-Bizerte': 10,
  'Tunis-Nabeul': 15, 'Tunis-Kairouan': 25, 'Tunis-Gabès': 40, 'Tunis-Gafsa': 45,
  'Sfax-Sousse': 15, 'Sfax-Monastir': 18, 'Sfax-Gabès': 20, 'Sousse-Monastir': 8,
}

export default function PublishTripPage() {
  const router = useRouter()
  const [fromLocation, setFromLocation] = useState(null)
  const [toLocation, setToLocation] = useState(null)

  const [form, setForm] = useState({
    from_city: '', to_city: '', from_hub: '', to_hub: '',
    departure_time: '', price_per_seat: '', total_seats: 3,
    women_only: false, is_recurring: false, recurrence_days: [], notes: ''
  })
  const [hubs, setHubs] = useState({ from: [], to: [] })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [driverProfile, setDriverProfile] = useState(null)

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (form.from_city) loadHubs('from', form.from_city) }, [form.from_city])
  useEffect(() => { if (form.to_city) loadHubs('to', form.to_city) }, [form.to_city])
  useEffect(() => {
    if (form.from_city && form.to_city) {
      const key1 = `${form.from_city}-${form.to_city}`
      const key2 = `${form.to_city}-${form.from_city}`
      const suggested = PRICE_MAP[key1] || PRICE_MAP[key2]
      if (suggested) setForm(f => ({ ...f, price_per_seat: suggested }))
    }
  }, [form.from_city, form.to_city])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('user_profiles').select('*, driver_kyc(status, vehicle_seats, gender)').eq('id', user.id).single()
    setDriverProfile(data)
    if (data?.driver_kyc?.vehicle_seats) {
      setForm(f => ({ ...f, total_seats: Math.min(data.driver_kyc.vehicle_seats - 1, 4) }))
    }
  }

  async function loadHubs(side, city) {
    const { data } = await supabase.from('hubs').select('*').eq('city', city).eq('is_active', true)
    setHubs(h => ({ ...h, [side]: data || [] }))
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      recurrence_days: f.recurrence_days.includes(day)
        ? f.recurrence_days.filter(d => d !== day)
        : [...f.recurrence_days, day]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.from_city || !form.to_city || !form.departure_time || !form.price_per_seat) {
      setError('Remplissez tous les champs obligatoires.')
      return
    }
    if (form.from_city === form.to_city) {
      setError('La ville de départ et la destination doivent être différentes.')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const tripData = {
      driver_id: user.id,
      from_city: form.from_city, to_city: form.to_city,
      from_hub: form.from_hub || null, to_hub: form.to_hub || null,
      departure_time: new Date(form.departure_time).toISOString(),
      price_per_seat: parseFloat(form.price_per_seat),
      total_seats: form.total_seats,
      available_seats: form.total_seats,
      women_only: form.women_only,
      is_recurring: form.is_recurring,
      recurrence_days: form.is_recurring ? form.recurrence_days : [],
      notes: form.notes || null,
      status: 'active'
    }

    const { data, error: err } = await supabase.from('trips').insert(tripData).select().single()
    if (err) { setError(err.message); setLoading(false); return }

    // If recurring, create next 4 occurrences
    if (form.is_recurring && form.recurrence_days.length > 0) {
      const baseDate = new Date(form.departure_time)
      const dayMap = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0 }
      const recurringTrips = []
      for (let week = 1; week <= 4; week++) {
        form.recurrence_days.forEach(day => {
          const d = new Date(baseDate)
          const targetDay = dayMap[day]
          const currentDay = d.getDay()
          const diff = ((targetDay - currentDay + 7) % 7) + week * 7
          d.setDate(d.getDate() + diff)
          recurringTrips.push({ ...tripData, departure_time: d.toISOString(), parent_trip_id: data.id })
        })
      }
      if (recurringTrips.length > 0) {
        await supabase.from('trips').insert(recurringTrips)
      }
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/driver/trips'), 2000)
  }

  const isVerified = driverProfile?.is_driver_verified
  const isFemaleDriver = driverProfile?.gender === 'female'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Publier un trajet</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Proposez vos places libres et rentabilisez votre trajet.</p>
      </div>

      {!isVerified && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12 }}>
          <AlertCircle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>Vérification KYC requise</div>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Vous devez compléter votre vérification avant de publier des trajets.</p>
          </div>
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12 }}>
          <CheckCircle size={18} color="#10B981" />
          <span style={{ fontSize: 14, color: '#10B981', fontWeight: 600 }}>Trajet publié avec succès ! Redirection en cours...</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', marginBottom: 0 }}>📍 Itinéraire</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Ville de départ *</label>
              <div className="input-icon">
                <MapPin size={15} className="icon" style={{ color: 'var(--teal)' }} />
                <select className="input" style={{ paddingLeft: 40 }} value={form.from_city} onChange={e => set('from_city', e.target.value)} required>
                  <option value="">Choisir...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Destination *</label>
              <div className="input-icon">
                <MapPin size={15} className="icon" />
                <select className="input" style={{ paddingLeft: 40 }} value={form.to_city} onChange={e => set('to_city', e.target.value)} required>
                  <option value="">Choisir...</option>
                  {CITIES.filter(c => c !== form.from_city).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Location pickers on map */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Point de départ exact (optionnel)</label>
              <LocationPicker label="le point de départ" value={fromLocation}
                onChange={loc => { setFromLocation(loc); setForm(f => ({ ...f, from_lat: loc?.lat, from_lng: loc?.lng })) }}
                color="#00C9B1" />
            </div>
            <div>
              <label className="label">Point d'arrivée exact (optionnel)</label>
              <LocationPicker label="le point d'arrivée" value={toLocation}
                onChange={loc => { setToLocation(loc); setForm(f => ({ ...f, to_lat: loc?.lat, to_lng: loc?.lng })) }}
                color="#EF4444" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Hub de départ</label>
              <select className="input" value={form.from_hub} onChange={e => set('from_hub', e.target.value)} disabled={hubs.from.length === 0}>
                <option value="">Point de rendez-vous libre</option>
                {hubs.from.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hub d'arrivée</label>
              <select className="input" value={form.to_hub} onChange={e => set('to_hub', e.target.value)} disabled={hubs.to.length === 0}>
                <option value="">Point de dépôt libre</option>
                {hubs.to.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', marginBottom: 0 }}>🕐 Date & Prix</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Date et heure de départ *</label>
              <div className="input-icon">
                <Clock size={15} className="icon" />
                <input className="input" type="datetime-local" style={{ paddingLeft: 40 }}
                  min={new Date().toISOString().slice(0, 16)}
                  value={form.departure_time} onChange={e => set('departure_time', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Prix / place (DT) *</label>
              <div className="input-icon">
                <DollarSign size={15} className="icon" />
                <input className="input" type="number" min="1" max="200" step="0.5" style={{ paddingLeft: 40 }}
                  placeholder="20" value={form.price_per_seat} onChange={e => set('price_per_seat', e.target.value)} required />
              </div>
              {form.price_per_seat && (
                <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
                  Vous recevrez : {(parseFloat(form.price_per_seat) * 0.9).toFixed(2)} DT / passager
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Nombre de places disponibles</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[1,2,3,4,5,6].map(n => (
                <button key={n} type="button" onClick={() => set('total_seats', n)}
                  style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${form.total_seats === n ? 'var(--teal)' : 'var(--border)'}`, background: form.total_seats === n ? 'var(--teal-dim)' : 'transparent', color: form.total_seats === n ? 'var(--teal)' : 'var(--muted)', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font)' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', marginBottom: 0 }}>⚙️ Options</h3>

          {isFemaleDriver && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: form.women_only ? 'var(--gold-dim)' : 'var(--surface-2)', border: `1px solid ${form.women_only ? 'var(--gold-border)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => set('women_only', !form.women_only)}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Heart size={18} color={form.women_only ? 'var(--gold)' : 'var(--muted)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: form.women_only ? 'var(--gold)' : 'var(--text)' }}>Trajet féminin uniquement</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Réservé aux conductrices et passagères</div>
                </div>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: form.women_only ? 'var(--gold)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: form.women_only ? 23 : 3, transition: 'left 0.2s' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: form.is_recurring ? 'var(--teal-dim)' : 'var(--surface-2)', border: `1px solid ${form.is_recurring ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => set('is_recurring', !form.is_recurring)}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Calendar size={18} color={form.is_recurring ? 'var(--teal)' : 'var(--muted)'} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: form.is_recurring ? 'var(--teal)' : 'var(--text)' }}>Trajet récurrent</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Répéter ce trajet les mêmes jours chaque semaine</div>
              </div>
            </div>
            <div style={{ width: 44, height: 24, borderRadius: 12, background: form.is_recurring ? 'var(--teal)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: form.is_recurring ? 23 : 3, transition: 'left 0.2s' }} />
            </div>
          </div>

          {form.is_recurring && (
            <div>
              <label className="label" style={{ marginBottom: 10 }}>Jours de répétition</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    style={{ padding: '6px 14px', borderRadius: 100, border: `1px solid ${form.recurrence_days.includes(day) ? 'var(--teal)' : 'var(--border)'}`, background: form.recurrence_days.includes(day) ? 'var(--teal-dim)' : 'transparent', color: form.recurrence_days.includes(day) ? 'var(--teal)' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font)' }}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Note pour les passagers (optionnel)</label>
            <textarea className="input" rows={2} placeholder="Ex: Je pars exactement à l'heure. Point de départ flexible pour Tunis centre..."
              value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'none' }} />
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', borderRadius: 10, padding: '10px 14px', alignItems: 'center' }}>
              <AlertCircle size={14} color="var(--red)" />
              <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading || !isVerified}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}>
            {loading ? 'Publication...' : '🚀 Publier le trajet'}
          </button>
        </div>
      </form>
    </div>
  )
}

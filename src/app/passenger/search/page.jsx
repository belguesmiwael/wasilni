'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, Calendar, Users, Star, Shield, AlertTriangle, Heart, ArrowRight, Filter, Car, Clock, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import BookingModal from '@/components/trips/BookingModal'

const CITIES = ['Tunis', 'Sfax', 'Sousse', 'Monastir', 'Bizerte', 'Nabeul', 'Kairouan', 'Gabès', 'Gafsa', 'Médenine', 'Tataouine', 'Tozeur', 'Kebili', 'Sidi Bouzid', 'Kasserine', 'Siliana', 'Zaghouan', 'Béja', 'Jendouba', 'Le Kef', 'Mahdia', 'Manouba', 'Ben Arous', 'Ariana']

export default function SearchPage() {
  const [filters, setFilters] = useState({ from: '', to: '', date: '', women_only: false })
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadProfile()
    loadAllTrips()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setUserProfile(data)
  }

  async function loadAllTrips() {
    setLoading(true)
    const { data } = await supabase.from('trips')
      .select('*, user_profiles!driver_id(full_name, rating, badge_level, is_driver_verified, avatar_url, gender)')
      .eq('status', 'active').gt('available_seats', 0)
      .gte('departure_time', new Date().toISOString())
      .order('departure_time', { ascending: true }).limit(20)
    setTrips(data || [])
    setLoading(false)
  }

  async function handleSearch() {
    setLoading(true)
    setSearched(true)
    let query = supabase.from('trips')
      .select('*, user_profiles!driver_id(full_name, rating, badge_level, is_driver_verified, avatar_url, gender)')
      .eq('status', 'active').gt('available_seats', 0)
      .gte('departure_time', new Date().toISOString())
    if (filters.from) query = query.ilike('from_city', `%${filters.from}%`)
    if (filters.to) query = query.ilike('to_city', `%${filters.to}%`)
    if (filters.date) {
      const d = new Date(filters.date)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      query = query.gte('departure_time', d.toISOString()).lt('departure_time', next.toISOString())
    }
    if (filters.women_only) query = query.eq('women_only', true)
    const { data } = await query.order('departure_time', { ascending: true })
    setTrips(data || [])
    setLoading(false)
  }

  // Realtime seat updates
  useEffect(() => {
    const channel = supabase.channel('trips-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, payload => {
        setTrips(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  function canBook(trip) {
    if (!userProfile) return { ok: false, reason: 'Chargement...' }
    if (trip.women_only && userProfile.gender === 'male') return { ok: false, reason: 'Ce trajet est réservé aux femmes.' }
    // Check solo female rule
    if (!trip.women_only && userProfile.gender === 'female' && trip.user_profiles?.gender === 'male') {
      // We'll do the full check in modal, just warn here
      return { ok: true, womanWarning: true }
    }
    return { ok: true }
  }

  const formatTime = dt => new Date(dt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })
  const formatDate = dt => new Date(dt).toLocaleDateString('fr-TN', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Trouver un trajet</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Voyagez en toute sécurité entre les gouvernorats tunisiens.</p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label className="label">Départ</label>
            <div className="input-icon">
              <MapPin size={15} className="icon" style={{ color: 'var(--teal)' }} />
              <select className="input" style={{ paddingLeft: 40 }} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}>
                <option value="">Toutes les villes</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Destination</label>
            <div className="input-icon">
              <MapPin size={15} className="icon" />
              <select className="input" style={{ paddingLeft: 40 }} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}>
                <option value="">Toutes les villes</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <div className="input-icon">
              <Calendar size={15} className="icon" />
              <input className="input" type="date" style={{ paddingLeft: 40 }} min={new Date().toISOString().split('T')[0]}
                value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div style={{ paddingBottom: 0 }}>
            <label className="label" style={{ opacity: 0 }}>F</label>
            <button className={`btn ${filters.women_only ? 'btn-gold' : 'btn-outline'}`}
              onClick={() => setFilters(f => ({ ...f, women_only: !f.women_only }))}
              style={{ whiteSpace: 'nowrap', gap: 6 }}>
              <Heart size={15} />Féminin
            </button>
          </div>
          <div>
            <label className="label" style={{ opacity: 0 }}>S</label>
            <button className="btn btn-primary" onClick={handleSearch} style={{ gap: 8 }}>
              <Search size={16} />Chercher
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>
          {searched ? `${trips.length} trajet${trips.length !== 1 ? 's' : ''} trouvé${trips.length !== 1 ? 's' : ''}` : 'Trajets disponibles'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)', animation: 'ping 2s ease-in-out infinite' }} />
          Temps réel
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Car size={40} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aucun trajet disponible</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Modifiez vos critères de recherche ou revenez plus tard.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }} className="stagger">
          {trips.map(trip => {
            const check = canBook(trip)
            const driver = trip.user_profiles
            const initials = driver?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
            return (
              <div key={trip.id} className="card card-hover animate-fade-up" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Driver avatar */}
                  <div style={{ flexShrink: 0 }}>
                    <div className="avatar-fallback" style={{ width: 48, height: 48, fontSize: 16 }}>{initials}</div>
                    {driver?.is_driver_verified && (
                      <div style={{ marginTop: -8, marginLeft: 30, width: 20, height: 20, borderRadius: '50%', background: 'var(--teal)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={10} color="#0A0F1C" />
                      </div>
                    )}
                  </div>

                  {/* Trip info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 17, fontWeight: 800 }}>{trip.from_city}</span>
                          <ArrowRight size={16} color="var(--muted)" />
                          <span style={{ fontSize: 17, fontWeight: 800 }}>{trip.to_city}</span>
                          {trip.women_only && (
                            <span className="tag tag-gold" style={{ fontSize: 10, padding: '2px 8px' }}>
                              <Heart size={9} />Féminin
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} />{formatDate(trip.departure_time)} à {formatTime(trip.departure_time)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} />{trip.from_hub || trip.from_city}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{trip.price_per_seat} DT</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>/ place</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{driver?.full_name || 'Conducteur'}</span>
                          <span className={`badge-${driver?.badge_level || 'nouveau'}`} style={{ fontSize: 10 }}>
                            {(driver?.badge_level || 'Nouveau')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, color: 'var(--gold)' }}>
                          <Star size={12} fill="var(--gold)" />{(driver?.rating || 5).toFixed(1)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: trip.available_seats <= 1 ? 'var(--red)' : 'var(--muted)' }}>
                          <Users size={13} />{trip.available_seats} place{trip.available_seats !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {!check.ok ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--red)', background: 'var(--red-dim)', borderRadius: 8, padding: '6px 12px' }}>
                          <AlertTriangle size={13} />{check.reason}
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm"
                          onClick={() => setSelected(trip)}
                          style={{ gap: 6 }}>
                          Réserver <ArrowRight size={14} />
                        </button>
                      )}
                    </div>

                    {check.womanWarning && (
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} />
                        Attention : Vous devez voyager avec au moins une autre femme.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <BookingModal trip={selected} userProfile={userProfile}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); loadAllTrips() }} />
      )}
    </div>
  )
}

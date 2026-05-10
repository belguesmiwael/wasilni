'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Star, Car, Plus, ArrowRight, Wallet, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DriverDashboard() {
  const [stats, setStats] = useState({ totalEarned: 0, totalTrips: 0, activeBookings: 0, rating: 5 })
  const [recentBookings, setRecentBookings] = useState([])
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, walletRes, bookingsRes, tripsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('bookings').select('*, trips(from_city, to_city, departure_time), user_profiles!passenger_id(full_name, gender, badge_level)')
        .eq('trips.driver_id', user.id).in('status', ['confirmed', 'checked_in']).limit(5),
      supabase.from('trips').select('id').eq('driver_id', user.id).eq('status', 'completed'),
    ])

    setProfile(profileRes.data)
    setWallet(walletRes.data)
    setRecentBookings(bookingsRes.data || [])
    setStats({
      totalEarned: walletRes.data?.total_earned || 0,
      totalTrips: tripsRes.data?.length || 0,
      activeBookings: bookingsRes.data?.length || 0,
      rating: profileRes.data?.rating || 5,
    })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
      </div>
    </div>
  )

  const needsKYC = !profile?.is_driver_verified

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            Bonjour, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Voici un résumé de votre activité aujourd'hui.</p>
        </div>
        <Link href="/driver/publish" className="btn btn-primary" style={{ gap: 8, textDecoration: 'none' }}>
          <Plus size={16} />Nouveau trajet
        </Link>
      </div>

      {/* KYC Banner */}
      {needsKYC && (
        <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertCircle size={20} color="var(--gold)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: 2 }}>Vérification requise</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Complétez votre KYC pour publier des trajets et être visible des passagers.</div>
            </div>
          </div>
          <Link href="/driver/kyc" className="btn btn-gold btn-sm" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Vérifier mon profil →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { icon: Wallet, label: 'Revenus totaux', value: `${(stats.totalEarned || 0).toFixed(0)} DT`, color: 'var(--teal)' },
          { icon: Car, label: 'Trajets complétés', value: stats.totalTrips, color: 'var(--gold)' },
          { icon: Users, label: 'Réservations actives', value: stats.activeBookings, color: '#10B981' },
          { icon: Star, label: 'Note moyenne', value: (stats.rating || 5).toFixed(1) + ' ⭐', color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent bookings */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Réservations récentes</h3>
            <Link href="/driver/trips" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>Aucune réservation active</div>
          ) : recentBookings.map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar-fallback" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {b.user_profiles?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.user_profiles?.full_name || 'Passager'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.trips?.from_city} → {b.trips?.to_city}</div>
                </div>
              </div>
              <span className={`status-badge ${b.status === 'confirmed' ? 'status-confirmed' : 'status-active-b'}`}>
                {b.status === 'confirmed' ? 'Confirmé' : 'En route'}
              </span>
            </div>
          ))}
        </div>

        {/* Wallet summary */}
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mon portefeuille</h3>
            <Link href="/driver/wallet" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Détails <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Solde disponible</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--teal)' }}>{(wallet?.balance || 0).toFixed(2)} DT</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Total gagné</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>{(wallet?.total_earned || 0).toFixed(0)} DT</div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Retiré</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>{(wallet?.total_withdrawn || 0).toFixed(0)} DT</div>
            </div>
          </div>
          {(wallet?.balance || 0) >= 100 ? (
            <Link href="/driver/wallet" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              Retirer mes gains →
            </Link>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', background: 'var(--surface)', borderRadius: 8, padding: '10px' }}>
              Minimum 100 DT pour retirer · Manque {(100 - (wallet?.balance || 0)).toFixed(2)} DT
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

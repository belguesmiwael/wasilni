'use client'
import { useState, useEffect, useRef } from 'react'
import { AlertOctagon, UserCheck, BarChart2, Phone, CheckCircle, XCircle, Clock, Users, TrendingUp, Car, Wallet, Eye, Shield, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [tab, setTab] = useState('sos')
  const [sosAlerts, setSosAlerts] = useState([])
  const [kycQueue, setKycQueue] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedKYC, setSelectedKYC] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    loadAll()
    // Realtime SOS
    const channel = supabase.channel('admin-sos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, payload => {
        setSosAlerts(prev => [payload.new, ...prev])
        // Play alert sound
        if (audioRef.current) audioRef.current.play().catch(() => {})
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts' }, payload => {
        setSosAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    const [sosRes, kycRes, statsRes] = await Promise.all([
      supabase.from('sos_alerts').select('*, user_profiles!user_id(full_name, phone)').order('created_at', { ascending: false }).limit(30),
      supabase.from('driver_kyc').select('*, user_profiles!user_id(full_name, phone, email, gender)').eq('status', 'pending').order('submitted_at', { ascending: true }),
      loadStats()
    ])
    setSosAlerts(sosRes.data || [])
    setKycQueue(kycRes.data || [])
    setStats(statsRes || {})
    setLoading(false)
  }

  async function loadStats() {
    const [usersRes, tripsRes, bookingsRes, revenueRes] = await Promise.all([
      supabase.from('user_profiles').select('id, role', { count: 'exact' }),
      supabase.from('trips').select('id', { count: 'exact' }).eq('status', 'completed'),
      supabase.from('bookings').select('id, total_amount, commission_amount').in('status', ['confirmed', 'completed', 'checked_in']),
      supabase.from('bookings').select('commission_amount').eq('status', 'completed')
    ])
    const gmv = bookingsRes.data?.reduce((s, b) => s + (b.total_amount || 0), 0) || 0
    const revenue = revenueRes.data?.reduce((s, b) => s + (b.commission_amount || 0), 0) || 0
    return {
      totalUsers: usersRes.count || 0,
      drivers: usersRes.data?.filter(u => u.role === 'driver').length || 0,
      passengers: usersRes.data?.filter(u => u.role === 'passenger').length || 0,
      completedTrips: tripsRes.count || 0,
      gmv: gmv.toFixed(0),
      revenue: revenue.toFixed(0),
    }
  }

  async function respondSOS(alertId, status) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('sos_alerts').update({
      status, admin_id: user.id,
      response_time_seconds: Math.floor((Date.now() - new Date(sosAlerts.find(a => a.id === alertId)?.created_at).getTime()) / 1000),
      resolved_at: status === 'resolved' ? new Date().toISOString() : null
    }).eq('id', alertId)
  }

  async function approveKYC(kycId, userId) {
    setSubmitting(true)
    await supabase.from('driver_kyc').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', kycId)
    await supabase.from('user_profiles').update({ is_driver_verified: true }).eq('id', userId)
    await supabase.from('notifications').insert({
      user_id: userId, title: '✅ Vérification approuvée !', type: 'kyc',
      body: 'Félicitations ! Votre profil de conducteur est maintenant vérifié. Vous pouvez publier des trajets.', action_url: '/driver/dashboard'
    })
    setSelectedKYC(null)
    loadAll()
    setSubmitting(false)
  }

  async function rejectKYC(kycId, userId) {
    if (!rejectionReason) { alert('Précisez la raison du refus'); return }
    setSubmitting(true)
    await supabase.from('driver_kyc').update({ status: 'rejected', rejection_reason: rejectionReason, reviewed_at: new Date().toISOString() }).eq('id', kycId)
    await supabase.from('notifications').insert({
      user_id: userId, title: 'Vérification refusée', type: 'kyc',
      body: `Votre dossier KYC a été refusé. Raison : ${rejectionReason}. Vous pouvez re-soumettre.`, action_url: '/driver/kyc'
    })
    setSelectedKYC(null)
    setRejectionReason('')
    loadAll()
    setSubmitting(false)
  }

  const activeSOSCount = sosAlerts.filter(a => a.status === 'active').length

  return (
    <div>
      {/* Hidden audio for SOS alert */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA..." type="audio/wav" />
      </audio>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>وصلّني — Panneau d'administration</p>
        </div>
        {activeSOSCount > 0 && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, animation: 'pulse-ring 2s ease infinite' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', animation: 'ping 1s ease-in-out infinite' }} />
            <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 14 }}>{activeSOSCount} ALERTE{activeSOSCount > 1 ? 'S' : ''} SOS ACTIVE{activeSOSCount > 1 ? 'S' : ''}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Utilisateurs', value: stats.totalUsers || 0, icon: Users, color: 'var(--teal)' },
          { label: 'Conducteurs', value: stats.drivers || 0, icon: Car, color: 'var(--gold)' },
          { label: 'Passagers', value: stats.passengers || 0, icon: Users, color: '#10B981' },
          { label: 'GMV (DT)', value: `${stats.gmv || 0}`, icon: TrendingUp, color: 'var(--teal)' },
          { label: 'Revenus Waselni', value: `${stats.revenue || 0} DT`, icon: Wallet, color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: '16px 18px' }}>
            <s.icon size={18} color={s.color} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[
          { id: 'sos', label: `🚨 Alertes SOS (${activeSOSCount})` },
          { id: 'kyc', label: `📋 KYC (${kycQueue.length})` },
          { id: 'withdrawals', label: '💰 Retraits' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: tab === t.id ? (t.id === 'sos' ? 'var(--red)' : 'var(--teal)') : 'transparent', color: tab === t.id ? (t.id === 'sos' ? 'white' : '#0A0F1C') : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* SOS ALERTS */}
      {tab === 'sos' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {sosAlerts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)' }}>Aucune alerte SOS active</p>
            </div>
          ) : sosAlerts.map(alert => (
            <div key={alert.id} className="card" style={{ padding: 20, borderColor: alert.status === 'active' ? 'rgba(239,68,68,0.4)' : 'var(--border)', background: alert.status === 'active' ? 'rgba(239,68,68,0.04)' : 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative' }}>
                    {alert.status === 'active' && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-ring 1.5s ease-out infinite' }} />}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: alert.status === 'active' ? 'var(--red)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                      <AlertOctagon size={20} color={alert.status === 'active' ? 'white' : 'var(--muted)'} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{alert.user_profiles?.full_name || 'Utilisateur inconnu'}</span>
                      <span className={`status-badge ${alert.status === 'active' ? 'status-cancelled' : alert.status === 'responded' ? 'status-pending-b' : 'status-completed'}`}>
                        {alert.status === 'active' ? '🔴 ACTIF' : alert.status === 'responded' ? 'En cours' : 'Résolu'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(alert.created_at).toLocaleString('fr-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    {alert.lat && alert.lng && (
                      <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>
                        📍 GPS : {parseFloat(alert.lat).toFixed(4)}, {parseFloat(alert.lng).toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {alert.user_profiles?.phone && (
                    <a href={`tel:${alert.user_profiles.phone}`} className="btn btn-danger btn-sm" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={14} />Appeler
                    </a>
                  )}
                  {alert.status === 'active' && (
                    <button className="btn btn-outline btn-sm" onClick={() => respondSOS(alert.id, 'responded')}>Répondre</button>
                  )}
                  {alert.status === 'responded' && (
                    <button className="btn btn-outline btn-sm" style={{ color: '#10B981', borderColor: 'rgba(16,185,129,0.3)' }} onClick={() => respondSOS(alert.id, 'resolved')}>✓ Résolu</button>
                  )}
                  {alert.lat && (
                    <a href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                      <Eye size={14} />Carte
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KYC QUEUE */}
      {tab === 'kyc' && (
        <div>
          {kycQueue.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Shield size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)' }}>Aucune demande KYC en attente</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {kycQueue.map(kyc => (
                <div key={kyc.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="avatar-fallback" style={{ width: 44, height: 44, fontSize: 15 }}>
                        {kyc.user_profiles?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{kyc.user_profiles?.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{kyc.user_profiles?.phone} · {kyc.user_profiles?.gender === 'male' ? 'Homme' : 'Femme'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{kyc.vehicle_brand} {kyc.vehicle_model} {kyc.vehicle_year} · {kyc.vehicle_plate}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          Soumis : {new Date(kyc.submitted_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setSelectedKYC(kyc)}>
                      <Eye size={14} />Examiner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KYC REVIEW MODAL */}
      {selectedKYC && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, fontSize: 18 }}>Examen KYC — {selectedKYC.user_profiles?.full_name}</h3>
              <button onClick={() => setSelectedKYC(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Documents grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'CIN Recto', url: selectedKYC.cin_front_url },
                { label: 'CIN Verso', url: selectedKYC.cin_back_url },
                { label: 'Selfie + CIN', url: selectedKYC.selfie_url },
                { label: 'Permis', url: selectedKYC.license_url },
                { label: 'Carte grise', url: selectedKYC.carte_grise_url },
              ].map((doc, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{doc.label}</div>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <img src={doc.url} alt={doc.label} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    </a>
                  ) : (
                    <div style={{ height: 100, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)' }}>Non fourni</div>
                  )}
                </div>
              ))}
            </div>

            {/* Vehicle info */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--teal)' }}>Informations véhicule</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                {[
                  ['Marque', selectedKYC.vehicle_brand], ['Modèle', selectedKYC.vehicle_model],
                  ['Couleur', selectedKYC.vehicle_color], ['Immatriculation', selectedKYC.vehicle_plate],
                  ['Places', selectedKYC.vehicle_seats], ['Année', selectedKYC.vehicle_year],
                ].map(([k, v]) => (
                  <div key={k}><strong style={{ color: 'var(--text)' }}>{k} :</strong> {v}</div>
                ))}
              </div>
            </div>

            {/* Rejection reason */}
            <div style={{ marginBottom: 16 }}>
              <label className="label">Raison de refus (si applicable)</label>
              <input className="input" placeholder="Ex: Photo CIN illisible, permis expiré..."
                value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => rejectKYC(selectedKYC.id, selectedKYC.user_id)} disabled={submitting}>
                <XCircle size={16} />Refuser
              </button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', background: '#10B981' }}
                onClick={() => approveKYC(selectedKYC.id, selectedKYC.user_id)} disabled={submitting}>
                <CheckCircle size={16} />Approuver — Activer badge Vérifié
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

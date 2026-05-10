'use client'
import { useState, useEffect, useRef } from 'react'
import {
  AlertOctagon, UserCheck, Phone, CheckCircle, XCircle,
  Clock, Users, TrendingUp, Car, Wallet, Eye, Shield, X,
  MapPin, RefreshCw, ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [tab, setTab] = useState('sos')
  const [sosAlerts, setSosAlerts] = useState([])
  const [kycQueue, setKycQueue] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [stats, setStats] = useState({ users: 0, drivers: 0, passengers: 0, trips: 0, gmv: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedKYC, setSelectedKYC] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()

    // Realtime SOS
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
        payload => setSosAlerts(prev => [payload.new, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_alerts' },
        payload => setSosAlerts(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a)))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadSOS(), loadKYC(), loadWithdrawals(), loadStats()])
    } catch (e) {
      setError('Erreur de chargement : ' + e.message)
    }
    setLoading(false)
  }

  async function loadSOS() {
    const { data, error: err } = await supabase
      .from('sos_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (err) { console.error('SOS error:', err); return }

    // Load user profiles separately
    const userIds = [...new Set((data || []).map(a => a.user_id))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      setSosAlerts((data || []).map(a => ({ ...a, user_profile: profileMap[a.user_id] })))
    } else {
      setSosAlerts(data || [])
    }
  }

  async function loadKYC() {
    const { data, error: err } = await supabase
      .from('driver_kyc')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
    if (err) { console.error('KYC error:', err); return }

    // Load user profiles
    const userIds = [...new Set((data || []).map(k => k.user_id))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, gender')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      setKycQueue((data || []).map(k => ({ ...k, user_profile: profileMap[k.user_id] })))
    } else {
      setKycQueue(data || [])
    }
  }

  async function loadWithdrawals() {
    const { data, error: err } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (err) { console.error('Withdrawals error:', err); return }

    const userIds = [...new Set((data || []).map(w => w.user_id))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      setWithdrawals((data || []).map(w => ({ ...w, user_profile: profileMap[w.user_id] })))
    } else {
      setWithdrawals(data || [])
    }
  }

  async function loadStats() {
    const [usersRes, tripsRes, bookingsRes] = await Promise.all([
      supabase.from('user_profiles').select('id, role'),
      supabase.from('trips').select('id').eq('status', 'completed'),
      supabase.from('bookings').select('total_amount, commission_amount').in('status', ['confirmed', 'completed', 'checked_in']),
    ])
    const users = usersRes.data || []
    const bookings = bookingsRes.data || []
    setStats({
      users: users.length,
      drivers: users.filter(u => u.role === 'driver').length,
      passengers: users.filter(u => u.role === 'passenger').length,
      trips: tripsRes.data?.length || 0,
      gmv: bookings.reduce((s, b) => s + (b.total_amount || 0), 0).toFixed(0),
      revenue: bookings.reduce((s, b) => s + (b.commission_amount || 0), 0).toFixed(0),
    })
  }

  async function respondSOS(alertId, status) {
    const { data: { user } } = await supabase.auth.getUser()
    const alert = sosAlerts.find(a => a.id === alertId)
    const responseTime = alert ? Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 1000) : null
    const { error: err } = await supabase.from('sos_alerts').update({
      status,
      admin_id: user.id,
      response_time_seconds: responseTime,
      resolved_at: status === 'resolved' || status === 'false_alarm' ? new Date().toISOString() : null
    }).eq('id', alertId)
    if (!err) loadSOS()
  }

  async function approveKYC(kycId, userId) {
    setSubmitting(true)
    const { error: e1 } = await supabase.from('driver_kyc').update({
      status: 'approved', reviewed_at: new Date().toISOString()
    }).eq('id', kycId)
    const { error: e2 } = await supabase.from('user_profiles').update({
      is_driver_verified: true
    }).eq('id', userId)
    if (!e1 && !e2) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '✅ Profil conducteur approuvé !',
        body: 'Félicitations ! Vous pouvez maintenant publier des trajets sur Waselni.',
        type: 'kyc', action_url: '/driver/dashboard'
      })
      setSelectedKYC(null)
      loadKYC()
    }
    setSubmitting(false)
  }

  async function rejectKYC(kycId, userId) {
    if (!rejectionReason.trim()) { alert('Précisez la raison du refus'); return }
    setSubmitting(true)
    await supabase.from('driver_kyc').update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      reviewed_at: new Date().toISOString()
    }).eq('id', kycId)
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Dossier KYC refusé',
      body: `Raison : ${rejectionReason}. Vous pouvez corriger et re-soumettre.`,
      type: 'kyc', action_url: '/driver/kyc'
    })
    setSelectedKYC(null)
    setRejectionReason('')
    loadKYC()
    setSubmitting(false)
  }

  async function approveWithdrawal(id, userId, amount) {
    await supabase.from('withdrawal_requests').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('notifications').insert({
      user_id: userId, title: '💰 Retrait traité',
      body: `Votre retrait de ${amount} DT a été effectué.`, type: 'payment'
    })
    loadWithdrawals()
  }

  async function rejectWithdrawal(id, userId, amount) {
    await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', id)
    // Re-credit wallet
    const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('user_id', userId).single()
    if (wallet) await supabase.from('wallets').update({ balance: wallet.balance + amount }).eq('id', wallet.id)
    loadWithdrawals()
  }

  const activeSOSCount = sosAlerts.filter(a => a.status === 'active').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Admin — وصلّني</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Panneau de contrôle administrateur</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {activeSOSCount > 0 && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', animation: 'ping 1s ease-in-out infinite' }} />
              <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 14 }}>{activeSOSCount} SOS ACTIF{activeSOSCount > 1 ? 'S' : ''}</span>
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={loadAll} style={{ gap: 6 }}>
            <RefreshCw size={14} />Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--red)' }}>
          ⚠️ {error} — <button onClick={loadAll} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13 }}>Réessayer</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Utilisateurs', value: stats.users, icon: Users, color: 'var(--teal)' },
          { label: 'Conducteurs', value: stats.drivers, icon: Car, color: 'var(--gold)' },
          { label: 'Passagers', value: stats.passengers, icon: Users, color: '#10B981' },
          { label: 'Trajets OK', value: stats.trips, icon: TrendingUp, color: 'var(--teal)' },
          { label: 'GMV (DT)', value: stats.gmv, icon: Wallet, color: 'var(--gold)' },
          { label: 'Revenus (DT)', value: stats.revenue, icon: TrendingUp, color: '#10B981' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <s.icon size={16} color={s.color} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{loading ? '...' : s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[
          { id: 'sos', label: `🚨 SOS (${activeSOSCount} actif${activeSOSCount !== 1 ? 's' : ''})`, danger: activeSOSCount > 0 },
          { id: 'kyc', label: `📋 KYC (${kycQueue.length} en attente)` },
          { id: 'withdrawals', label: `💰 Retraits (${withdrawals.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: tab === t.id ? (t.danger ? 'var(--red)' : 'var(--teal)') : 'transparent',
              color: tab === t.id ? (t.danger ? 'white' : '#0A0F1C') : 'var(--muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ SOS ══════════ */}
      {tab === 'sos' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {loading ? <div className="skeleton" style={{ height: 80, borderRadius: 14 }} /> :
          sosAlerts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)' }}>Aucune alerte SOS</p>
            </div>
          ) : sosAlerts.map(alert => (
            <div key={alert.id} className="card" style={{ padding: 20, borderColor: alert.status === 'active' ? 'rgba(239,68,68,0.5)' : 'var(--border)', background: alert.status === 'active' ? 'rgba(239,68,68,0.03)' : 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {alert.status === 'active' && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-ring 1.5s ease-out infinite' }} />}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: alert.status === 'active' ? 'var(--red)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                      <AlertOctagon size={20} color={alert.status === 'active' ? 'white' : 'var(--muted)'} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{alert.user_profile?.full_name || `User ${alert.user_id?.slice(0,8)}`}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{alert.user_profile?.phone || ''}</span>
                      <span className={`status-badge ${alert.status === 'active' ? 'status-cancelled' : alert.status === 'responded' ? 'status-pending-b' : 'status-completed'}`}>
                        {alert.status === 'active' ? '🔴 ACTIF' : alert.status === 'responded' ? '🟡 En cours' : alert.status === 'resolved' ? '✅ Résolu' : '⚪ Fausse alerte'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(alert.created_at).toLocaleString('fr-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      {alert.response_time_seconds && ` · Réponse en ${alert.response_time_seconds}s`}
                    </div>
                    {alert.lat && (
                      <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 2 }}>
                        📍 {parseFloat(alert.lat).toFixed(5)}, {parseFloat(alert.lng).toFixed(5)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {alert.user_profile?.phone && (
                    <a href={`tel:${alert.user_profile.phone}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--red)', color: 'white', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font)' }}>
                      <Phone size={14} />Appeler
                    </a>
                  )}
                  {alert.lat && (
                    <a href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font)' }}>
                      <MapPin size={14} />Carte
                    </a>
                  )}
                  {alert.status === 'active' && (
                    <button onClick={() => respondSOS(alert.id, 'responded')}
                      style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', color: 'var(--gold)', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      Pris en charge
                    </button>
                  )}
                  {alert.status === 'responded' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => respondSOS(alert.id, 'resolved')}
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        ✓ Résolu
                      </button>
                      <button onClick={() => respondSOS(alert.id, 'false_alarm')}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Fausse alerte
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ KYC ══════════ */}
      {tab === 'kyc' && (
        <div>
          {loading ? <div className="skeleton" style={{ height: 100, borderRadius: 14 }} /> :
          kycQueue.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Shield size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)', fontSize: 15 }}>Aucune demande KYC en attente ✓</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {kycQueue.map(kyc => (
                <div key={kyc.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="avatar-fallback" style={{ width: 48, height: 48, fontSize: 16 }}>
                        {kyc.user_profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{kyc.user_profile?.full_name || 'Conducteur'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {kyc.user_profile?.phone} · {kyc.user_profile?.gender === 'female' ? 'Femme' : 'Homme'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {kyc.vehicle_brand} {kyc.vehicle_model} {kyc.vehicle_year} · <strong style={{ color: 'var(--text)' }}>{kyc.vehicle_plate}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          Soumis : {new Date(kyc.submitted_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setSelectedKYC(kyc); setPhotoIdx(0); setRejectionReason('') }}>
                      <Eye size={14} />Examiner le dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ RETRAITS ══════════ */}
      {tab === 'withdrawals' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {loading ? <div className="skeleton" style={{ height: 80, borderRadius: 14 }} /> :
          withdrawals.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)' }}>Aucun retrait en attente</p>
            </div>
          ) : withdrawals.map(w => (
            <div key={w.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{w.user_profile?.full_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 700 }}>{w.amount} DT</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>
                    {w.method} · {w.account_details?.account}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {new Date(w.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveWithdrawal(w.id, w.user_id, w.amount)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    <CheckCircle size={14} />Payer
                  </button>
                  <button onClick={() => rejectWithdrawal(w.id, w.user_id, w.amount)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    <XCircle size={14} />Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ KYC REVIEW MODAL ══════════ */}
      {selectedKYC && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto', padding: 0, borderRadius: 20 }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, borderRadius: '20px 20px 0 0' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 18 }}>Dossier KYC — {selectedKYC.user_profile?.full_name}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {selectedKYC.vehicle_brand} {selectedKYC.vehicle_model} {selectedKYC.vehicle_year} · {selectedKYC.vehicle_plate} · {selectedKYC.vehicle_seats} places
                </p>
              </div>
              <button onClick={() => setSelectedKYC(null)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Documents */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Documents d'identité</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'CIN Recto', url: selectedKYC.cin_front_url },
                  { label: 'CIN Verso', url: selectedKYC.cin_back_url },
                  { label: 'Selfie + CIN', url: selectedKYC.selfie_url },
                  { label: 'Permis de conduire', url: selectedKYC.license_url },
                  { label: 'Carte grise', url: selectedKYC.carte_grise_url },
                ].map((doc, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>{doc.label}</div>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                        <img src={doc.url} alt={doc.label} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                        <div style={{ fontSize: 10, color: 'var(--teal)', marginTop: 4, textAlign: 'center' }}>Cliquer pour agrandir</div>
                      </a>
                    ) : (
                      <div style={{ height: 110, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)' }}>
                        Non fourni
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Vehicle photos */}
              {(selectedKYC.vehicle_photos || []).length > 0 && (
                <>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Photos du véhicule</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                    {selectedKYC.vehicle_photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Véhicule ${i + 1}`} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* Vehicle info */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Informations véhicule</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  ['Marque', selectedKYC.vehicle_brand],
                  ['Modèle', selectedKYC.vehicle_model],
                  ['Couleur', selectedKYC.vehicle_color],
                  ['Immatriculation', selectedKYC.vehicle_plate],
                  ['Places', selectedKYC.vehicle_seats],
                  ['Année', selectedKYC.vehicle_year],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Rejection reason */}
              <div style={{ marginBottom: 20 }}>
                <label className="label">Raison de refus (obligatoire si refus)</label>
                <input className="input" placeholder="Ex: Photo CIN illisible, selfie non conforme, permis expiré..."
                  value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => rejectKYC(selectedKYC.id, selectedKYC.user_id)} disabled={submitting}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  <XCircle size={18} />{submitting ? '...' : 'Refuser'}
                </button>
                <button onClick={() => approveKYC(selectedKYC.id, selectedKYC.user_id)} disabled={submitting}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#10B981', border: 'none', color: 'white', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  <CheckCircle size={18} />{submitting ? 'Traitement...' : '✓ Approuver — Activer badge Vérifié'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

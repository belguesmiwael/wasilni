'use client'
import { useState, useEffect } from 'react'
import { User, Phone, Mail, Shield, Star, Car, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '' })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('user_profiles').select('*, ratings!rated_id(score, comment, created_at, rater_id, user_profiles!rater_id(full_name))').eq('id', user.id).single()
    setProfile({ ...data, email: user.email })
    setForm({ full_name: data.full_name, phone: data.phone })
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', user.id)
    setProfile(p => ({ ...p, ...form }))
    setEditing(false)
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function addEmergencyContact() {
    if (!emergencyContact.name || !emergencyContact.phone) return
    const { data: { user } } = await supabase.auth.getUser()
    const newContacts = [...(profile.emergency_contacts || []), emergencyContact]
    await supabase.from('user_profiles').update({ emergency_contacts: newContacts }).eq('id', user.id)
    setProfile(p => ({ ...p, emergency_contacts: newContacts }))
    setEmergencyContact({ name: '', phone: '' })
  }

  async function removeEmergencyContact(idx) {
    const { data: { user } } = await supabase.auth.getUser()
    const newContacts = (profile.emergency_contacts || []).filter((_, i) => i !== idx)
    await supabase.from('user_profiles').update({ emergency_contacts: newContacts }).eq('id', user.id)
    setProfile(p => ({ ...p, emergency_contacts: newContacts }))
  }

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'WS'
  const reviews = (profile?.ratings || []).filter(r => r.is_visible !== false)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Mon profil</h1>
      </div>

      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircle size={15} color="#10B981" /><span style={{ fontSize: 13, color: '#10B981' }}>Profil mis à jour !</span>
        </div>
      )}

      {/* Profile card */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
          <div className="avatar-fallback" style={{ width: 72, height: 72, fontSize: 24, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{profile?.full_name}</h2>
              {profile?.is_driver_verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', color: 'var(--teal)', borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  <Shield size={10} />Vérifié
                </span>
              )}
              <span className={`badge-${profile?.badge_level || 'nouveau'}`}>
                {(profile?.badge_level || 'Nouveau')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--muted)' }}>
              <span style={{ textTransform: 'capitalize' }}>{profile?.role}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gold)' }}>
                <Star size={13} fill="var(--gold)" />{(profile?.rating || 5).toFixed(1)} ({profile?.total_ratings || 0} avis)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Car size={13} />{profile?.total_trips || 0} trajets
              </span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Nom complet</label>
              <div className="input-icon"><User size={15} className="icon" />
                <input className="input" style={{ paddingLeft: 40 }} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Téléphone</label>
              <div className="input-icon"><Phone size={15} className="icon" />
                <input className="input" style={{ paddingLeft: 40 }} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Enregistrement...' : '✓ Sauvegarder'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: User, label: 'Nom', value: profile?.full_name },
              { icon: Phone, label: 'Téléphone', value: profile?.phone },
              { icon: Mail, label: 'Email', value: profile?.email },
              { icon: User, label: 'Genre', value: profile?.gender === 'male' ? 'Homme' : 'Femme' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <f.icon size={15} color="var(--muted)" style={{ marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{f.value || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency contacts */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Contacts d'urgence</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Alertés automatiquement lors d'un SOS (max. 3)</p>
          </div>
        </div>
        {(profile?.emergency_contacts || []).map((contact, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{contact.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{contact.phone}</div>
            </div>
            <button onClick={() => removeEmergencyContact(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {(profile?.emergency_contacts || []).length < 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginTop: 10 }}>
            <input className="input" placeholder="Nom" value={emergencyContact.name} onChange={e => setEmergencyContact(c => ({ ...c, name: e.target.value }))} />
            <input className="input" placeholder="+216 XX XXX XXX" value={emergencyContact.phone} onChange={e => setEmergencyContact(c => ({ ...c, phone: e.target.value }))} />
            <button className="btn btn-primary btn-sm" onClick={addEmergencyContact}>
              <Plus size={14} />Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Avis reçus ({reviews.length})</h3>
          {reviews.slice(0, 5).map((r, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={12} fill={s <= r.score ? 'var(--gold)' : 'none'} color="var(--gold)" />
                ))}
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>
                  {new Date(r.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {r.comment && <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

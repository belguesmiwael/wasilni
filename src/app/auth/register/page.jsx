'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Phone, Car, Users, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STEPS = ['Identité', 'Compte', 'Rôle']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ full_name: '', phone: '', gender: 'male', email: '', password: '', role: 'passenger' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleRegister() {
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, gender: form.gender, role: form.role }
      }
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    router.push(form.role === 'driver' ? '/driver/kyc' : '/passenger/search')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(0,201,177,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }} className="animate-fade-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Car size={26} color="#0A0F1C" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>Créer votre compte</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>وصلّني — Covoiturage sécurisé en Tunisie</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, zIndex: 1, transition: 'all 0.3s', background: i < step ? 'var(--teal)' : i === step ? 'var(--teal)' : 'var(--surface)', border: `2px solid ${i <= step ? 'var(--teal)' : 'var(--border)'}`, color: i <= step ? '#0A0F1C' : 'var(--muted)' }}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i === step ? 'var(--teal)' : 'var(--muted)', marginTop: 4, fontWeight: i === step ? 700 : 400 }}>{s}</span>
              {i < STEPS.length - 1 && <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: i < step ? 'var(--teal)' : 'var(--border)', zIndex: 0 }} />}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 32 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <AlertCircle size={15} color="var(--red)" />
              <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          {/* Step 0 — Identity */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-in">
              <div>
                <label className="label">Nom complet</label>
                <div className="input-icon">
                  <User size={16} className="icon" />
                  <input className="input" style={{ paddingLeft: 44 }} placeholder="Mohamed Ali Trabelsi"
                    value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Numéro de téléphone</label>
                <div className="input-icon">
                  <Phone size={16} className="icon" />
                  <input className="input" style={{ paddingLeft: 44 }} placeholder="+216 XX XXX XXX" type="tel"
                    value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Genre</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[{ v: 'male', label: 'Homme' }, { v: 'female', label: 'Femme' }].map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => set('gender', v)}
                      style={{ padding: '12px', borderRadius: 10, border: `2px solid ${form.gender === v ? 'var(--teal)' : 'var(--border)'}`, background: form.gender === v ? 'var(--teal-dim)' : 'transparent', color: form.gender === v ? 'var(--teal)' : 'var(--muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                onClick={() => { if (!form.full_name || !form.phone) { setError('Remplissez tous les champs'); return }; setError(''); setStep(1) }}>
                Suivant →
              </button>
            </div>
          )}

          {/* Step 1 — Account */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-in">
              <div>
                <label className="label">Email</label>
                <div className="input-icon">
                  <Mail size={16} className="icon" />
                  <input className="input" style={{ paddingLeft: 44 }} type="email" placeholder="votre@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <div className="input-icon" style={{ position: 'relative' }}>
                  <Lock size={16} className="icon" />
                  <input className="input" style={{ paddingLeft: 44, paddingRight: 44 }} type={showPwd ? 'text' : 'password'} placeholder="Min. 8 caractères"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>← Retour</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { if (!form.email || form.password.length < 8) { setError('Email valide et mot de passe de 8 caractères minimum requis'); return }; setError(''); setStep(2) }}>
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Role */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-in">
              <div>
                <label className="label" style={{ marginBottom: 12 }}>Vous souhaitez :</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <button type="button" onClick={() => set('role', 'passenger')}
                    style={{ padding: '20px 16px', borderRadius: 14, border: `2px solid ${form.role === 'passenger' ? 'var(--teal)' : 'var(--border)'}`, background: form.role === 'passenger' ? 'var(--teal-dim)' : 'var(--surface-2)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                    <Users size={28} color={form.role === 'passenger' ? 'var(--teal)' : 'var(--muted)'} style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: form.role === 'passenger' ? 'var(--teal)' : 'var(--text)', fontFamily: 'var(--font)' }}>Voyager</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Je cherche des trajets</div>
                  </button>
                  <button type="button" onClick={() => set('role', 'driver')}
                    style={{ padding: '20px 16px', borderRadius: 14, border: `2px solid ${form.role === 'driver' ? 'var(--gold)' : 'var(--border)'}`, background: form.role === 'driver' ? 'var(--gold-dim)' : 'var(--surface-2)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                    <Car size={28} color={form.role === 'driver' ? 'var(--gold)' : 'var(--muted)'} style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: form.role === 'driver' ? 'var(--gold)' : 'var(--text)', fontFamily: 'var(--font)' }}>Conduire</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Je propose des trajets</div>
                  </button>
                </div>
                {form.role === 'driver' && (
                  <div style={{ marginTop: 12, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--gold)' }}>
                    ℹ️ Vous devrez compléter la vérification KYC (CIN + permis + véhicule) après l'inscription.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Retour</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                  onClick={handleRegister} disabled={loading}>
                  {loading ? 'Création...' : 'Créer mon compte'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

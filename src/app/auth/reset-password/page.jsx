'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase envoie le token dans le hash — on écoute l'événement PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    // Si l'utilisateur arrive directement sur cette page avec une session active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/'), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(0,201,177,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="animate-fade-up">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Car size={26} color="#0A0F1C" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            {success ? 'Mot de passe mis à jour !' : 'Définir votre mot de passe'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>وصلّني — Waselni</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-dim)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={30} color="var(--teal)" />
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Mot de passe défini !</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Redirection vers l'accueil...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="label">Nouveau mot de passe</label>
                <div className="input-icon" style={{ position: 'relative' }}>
                  <Lock size={15} className="icon" />
                  <input className="input" type={showPwd ? 'text' : 'password'}
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                    placeholder="Min. 8 caractères"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirmer le mot de passe</label>
                <div className="input-icon">
                  <Lock size={15} className="icon" />
                  <input className="input" type="password"
                    style={{ paddingLeft: 44 }}
                    placeholder="Répétez le mot de passe"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', alignItems: 'center' }}>
                  <AlertCircle size={14} color="var(--red)" />
                  <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
                disabled={loading}>
                {loading ? 'Mise à jour...' : '✓ Confirmer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

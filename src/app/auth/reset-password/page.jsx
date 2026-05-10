'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Car, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function establishSession() {
      try {
        // Extract tokens from URL hash
        const hash = window.location.hash.replace('#', '')
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          // Manually set the session from the hash tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) {
            setError('Lien expiré ou invalide. Demandez un nouveau lien.')
          }
        } else {
          // Check if already logged in (session in cookies)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setError('Lien invalide. Demandez un nouveau lien de réinitialisation.')
          }
        }
      } catch (e) {
        setError('Erreur inattendue. Réessayez.')
      } finally {
        setPreparing(false)
      }
    }

    establishSession()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    // Redirect based on role
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'passenger'
    const dest = role === 'admin' ? '/admin/dashboard' : role === 'driver' ? '/driver/dashboard' : '/passenger/search'
    setTimeout(() => router.push(dest), 2000)
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
          {/* Loading state */}
          {preparing && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Vérification du lien...</p>
            </div>
          )}

          {/* Success */}
          {!preparing && success && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-dim)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={30} color="var(--teal)" />
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Mot de passe défini !</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Connexion automatique en cours...</p>
            </div>
          )}

          {/* Error only (no form) */}
          {!preparing && !success && error && (
            <div>
              <div style={{ display: 'flex', gap: 10, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, alignItems: 'flex-start' }}>
                <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13, marginBottom: 4 }}>Lien invalide ou expiré</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>{error}</div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => router.push('/auth/login')}>
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Form */}
          {!preparing && !success && !error && (
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

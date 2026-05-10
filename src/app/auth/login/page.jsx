'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, Car, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', data.user.id).single()
    const role = profile?.role || 'passenger'
    router.push(role === 'admin' ? '/admin/dashboard' : role === 'driver' ? '/driver/dashboard' : '/passenger/search')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(0,201,177,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="animate-fade-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Car size={26} color="#0A0F1C" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>Bienvenue sur وصلّني</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Connectez-vous pour continuer</p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="label">Email</label>
              <div className="input-icon">
                <Mail size={16} className="icon" />
                <input className="input" style={{ paddingLeft: 44 }} type="email" placeholder="votre@email.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="input-icon" style={{ position: 'relative' }}>
                <Lock size={16} className="icon" />
                <input className="input" style={{ paddingLeft: 44, paddingRight: 44 }}
                  type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px' }}>
                <AlertCircle size={15} color="var(--red)" />
                <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ justifyContent: 'center', width: '100%', padding: '14px', fontSize: 15, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid #0A0F1C', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />Connexion...</> : <>Se connecter <ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Pas encore de compte ? </span>
            <Link href="/auth/register" style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              S'inscrire
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
          En continuant, vous acceptez nos{' '}
          <span style={{ color: 'var(--teal)', cursor: 'pointer' }}>Conditions d'utilisation</span> et notre{' '}
          <span style={{ color: 'var(--teal)', cursor: 'pointer' }}>Politique de confidentialité</span>
        </p>
      </div>
    </div>
  )
}

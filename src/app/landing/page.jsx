'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Car, Users, Shield, Star, MapPin, Phone, ArrowRight, CheckCircle, Heart, Lock } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // Detect Supabase auth hash tokens and redirect appropriately
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const type = params.get('type')
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (type === 'recovery') {
        router.replace('/auth/reset-password' + window.location.hash)
        return
      }
      if (type === 'invite' || type === 'signup' || type === 'magiclink') {
        router.replace('/auth/callback?access_token=' + accessToken + '&refresh_token=' + refreshToken + '&type=' + type)
        return
      }
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,15,28,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={17} color="#0A0F1C" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>وصلّني</span>
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>Waselni</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/auth/login" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600, textDecoration: 'none', padding: '8px 16px' }}>
            Se connecter
          </Link>
          <Link href="/auth/register" style={{ background: 'var(--teal)', color: '#0A0F1C', fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '10px 20px', borderRadius: 10 }}>
            Commencer →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', padding: '100px 40px 80px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(0,201,177,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 100, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 24 }}>
            <Shield size={12} />KYC VÉRIFIÉ · ESCROW · SOS 24/7
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24, maxWidth: 800, margin: '0 auto 24px' }}>
            Le covoiturage<br />
            <span style={{ color: 'var(--teal)' }}>sécurisé</span> entre<br />
            gouvernorats tunisiens
          </h1>
          <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Conducteurs vérifiés, paiement escrow, bouton SOS avec rappel humain en 2 minutes.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--teal)', color: '#0A0F1C', textDecoration: 'none', padding: '16px 32px', borderRadius: 14, fontWeight: 800, fontSize: 16 }}>
              <Users size={18} />Je veux voyager
            </Link>
            <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold)', color: '#0A0F1C', textDecoration: 'none', padding: '16px 32px', borderRadius: 14, fontWeight: 800, fontSize: 16 }}>
              <Car size={18} />Je suis conducteur
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 56, flexWrap: 'wrap' }}>
            {[
              { num: '500+', label: 'Conducteurs vérifiés' },
              { num: '24', label: 'Gouvernorats couverts' },
              { num: '< 2 min', label: 'Temps réponse SOS' },
              { num: '10%', label: 'Commission seulement' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal)' }}>{s.num}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEUX ESPACES */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>Deux espaces. Une plateforme.</h2>
          <p style={{ color: 'var(--muted)', fontSize: 16 }}>Choisissez votre rôle et accédez à votre espace dédié.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* VOYAGEUR */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(0,201,177,0.08) 0%, transparent 70%)' }} />
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Users size={26} color="var(--teal)" />
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Espace Voyageur</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              Trouvez un trajet vérifié, réservez en 30 secondes, payez en sécurité.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Conducteurs avec badge KYC vérifié','Paiement escrow — remboursé si annulation','QR code d\'embarquement sécurisé','Bouton SOS avec rappel humain 2 min','Option trajets féminins uniquement'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle size={15} color="var(--teal)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--teal)', color: '#0A0F1C', textDecoration: 'none', padding: '14px 24px', borderRadius: 12, fontWeight: 800, fontSize: 15 }}>
              Créer mon compte voyageur <ArrowRight size={16} />
            </Link>
          </div>

          {/* CONDUCTEUR */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)' }} />
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Car size={26} color="var(--gold)" />
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Espace Conducteur</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              Rentabilisez vos trajets existants. Publiez en 2 minutes, encaissez directement.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Vérification KYC rapide (2h ouvrables)','Publication trajet en 2 minutes','Trajets récurrents automatiques','Portefeuille intégré — retrait Flouci / D17','Tableau de bord revenus en temps réel'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle size={15} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--gold)', color: '#0A0F1C', textDecoration: 'none', padding: '14px 24px', borderRadius: 12, fontWeight: 800, fontSize: 15 }}>
              Devenir conducteur <ArrowRight size={16} />
            </Link>
            <div style={{ marginTop: 16, background: 'var(--surface-2)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>💰 Tunis → Sfax (30 DT) × 3 passagers</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)' }}>= 81 DT nets par trajet</div>
            </div>
          </div>
        </div>
      </section>

      {/* SÉCURITÉ */}
      <section style={{ padding: '80px 40px', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>Sécurité au cœur de tout</h2>
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { icon: Shield, color: 'var(--teal)', title: 'KYC Conducteur', desc: 'Chaque conducteur est vérifié manuellement : CIN, permis, carte grise, selfie.' },
            { icon: Lock, color: 'var(--gold)', title: 'Paiement Escrow', desc: 'Votre argent est sécurisé jusqu\'à confirmation d\'arrivée à destination.' },
            { icon: Phone, color: 'var(--red)', title: 'SOS — Rappel 2 min', desc: 'Appui prolongé → alerte immédiate → rappel humain dans les 2 minutes.' },
            { icon: Heart, color: 'var(--gold)', title: 'Règle féminine', desc: 'Blocage automatique si une femme voyagerait seule avec un conducteur masculin.' },
            { icon: MapPin, color: 'var(--teal)', title: 'Hubs certifiés', desc: '13 points de rendez-vous officiels dans les principales villes tunisiennes.' },
            { icon: Star, color: 'var(--gold)', title: 'Notation mutuelle', desc: 'Chaque trajet noté des deux côtés. Les mauvais acteurs sont exclus.' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <f.icon size={20} color={f.color} />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>Prêt à voyager autrement ?</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
            <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--teal)', color: '#0A0F1C', textDecoration: 'none', padding: '16px 32px', borderRadius: 14, fontWeight: 800, fontSize: 16 }}>
              Créer un compte gratuit <ArrowRight size={16} />
            </Link>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', color: 'var(--text)', textDecoration: 'none', padding: '16px 28px', borderRadius: 14, fontWeight: 700, fontSize: 15, border: '1px solid var(--border)' }}>
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={13} color="#0A0F1C" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Waselni · وصلّني</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>© 2025 Waselni. Covoiturage sécurisé en Tunisie.</span>
      </footer>
    </div>
  )
}

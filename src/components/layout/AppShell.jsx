'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Map, Car, Wallet, User, Shield, LayoutDashboard,
  Plus, List, Menu, X, LogOut, Bell, ChevronRight,
  AlertOctagon, UserCheck, BarChart2, Settings
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import SOSButton from './SOSButton'

const NAV_PASSENGER = [
  { icon: Map, label: 'Rechercher', href: '/passenger/search' },
  { icon: List, label: 'Mes trajets', href: '/passenger/trips' },
  { icon: User, label: 'Mon profil', href: '/passenger/profile' },
]

const NAV_DRIVER = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/driver/dashboard' },
  { icon: Plus, label: 'Publier un trajet', href: '/driver/publish' },
  { icon: List, label: 'Mes trajets', href: '/driver/trips' },
  { icon: Wallet, label: 'Portefeuille', href: '/driver/wallet' },
  { icon: UserCheck, label: 'Vérification KYC', href: '/driver/kyc' },
  { icon: User, label: 'Mon profil', href: '/passenger/profile' },
]

const NAV_ADMIN = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: AlertOctagon, label: 'Alertes SOS', href: '/admin/dashboard#sos' },
  { icon: UserCheck, label: 'Vérifications KYC', href: '/admin/dashboard#kyc' },
  { icon: BarChart2, label: 'Statistiques', href: '/admin/dashboard#stats' },
]

export default function AppShell({ children, user, profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  const role = profile?.role || 'passenger'
  const nav = role === 'admin' ? NAV_ADMIN : role === 'driver' ? NAV_DRIVER : NAV_PASSENGER

  useEffect(() => {
    if (!user) return
    loadNotifications()
    const channel = supabase.channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnread(u => u + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) {
      setNotifications(data)
      setUnread(data.filter(n => !n.is_read).length)
    }
  }

  async function markAllRead() {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false)
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'WS'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 29 }} />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={17} color="#0A0F1C" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>وصلّني</span>
          </Link>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge-${profile?.badge_level || 'nouveau'}`}>
              {(profile?.badge_level || 'Nouveau').charAt(0).toUpperCase() + (profile?.badge_level || 'nouveau').slice(1)}
            </span>
            {profile?.is_driver_verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', color: 'var(--teal)', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                <Shield size={10} />Vérifié
              </span>
            )}
          </div>
        </div>

        {/* User info */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="avatar-fallback" style={{ width: 38, height: 38, fontSize: 13 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'Utilisateur'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{role}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 12px', flex: 1 }}>
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '0 8px', letterSpacing: '1px' }}>
            NAVIGATION
          </div>
          {nav.map(({ icon: Icon, label, href }) => (
            <Link key={href} href={href} className={`sidebar-link ${pathname.startsWith(href.split('#')[0]) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
              {pathname.startsWith(href.split('#')[0]) && (
                <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              )}
            </Link>
          ))}

          {/* Switch role for driver who wants to also travel */}
          {role === 'driver' && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '0 8px', letterSpacing: '1px' }}>EN TANT QUE PASSAGER</div>
              <Link href="/passenger/search" className="sidebar-link">
                <Map size={18} /><span>Trouver un trajet</span>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border)' }}>
          <button className="sidebar-link btn-ghost" onClick={handleLogout}
            style={{ width: '100%', border: 'none', justifyContent: 'flex-start' }}>
            <LogOut size={16} /><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content" style={{ flex: 1 }}>
        {/* Top bar */}
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,15,28,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 4 }}
            className="mobile-menu-btn">
            <Menu size={22} />
          </button>
          <div style={{ flex: 1 }} />
          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAllRead() }}
              style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', transition: 'all 0.2s' }}>
              <Bell size={18} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, background: 'var(--red)', borderRadius: '50%', fontSize: 10, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div style={{ position: 'absolute', right: 0, top: 48, width: 320, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>Tout marquer lu</button>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Aucune notification
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: n.is_read ? 'transparent' : 'var(--surface-2)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : 'var(--teal)', marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{n.body}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            {new Date(n.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="avatar-fallback" style={{ width: 36, height: 36, fontSize: 13, cursor: 'pointer' }}
            onClick={() => router.push('/passenger/profile')}>
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: '28px 24px', maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </main>
      </div>

      {/* SOS Button — only during active trip */}
      <SOSButton user={user} />

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

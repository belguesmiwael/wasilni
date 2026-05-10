'use client'
import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, ArrowDown, Clock, CheckCircle, XCircle, AlertCircle, Smartphone, CreditCard, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const WITHDRAWAL_METHODS = [
  { id: 'flouci', label: 'Flouci', icon: Smartphone, placeholder: 'Numéro Flouci (ex: 216XXXXXXXX)' },
  { id: 'd17', label: 'D17', icon: CreditCard, placeholder: 'Numéro de carte D17' },
  { id: 'bank', label: 'Virement bancaire', icon: Building2, placeholder: 'RIB / IBAN', disabled: true, comingSoon: true },
]

export default function WalletPage() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'flouci', account: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadWallet() }, [])

  async function loadWallet() {
    const { data: { user } } = await supabase.auth.getUser()
    const [walletRes, txRes, wdRes] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('transactions').select('*').eq('wallets.user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])
    setWallet(walletRes.data)
    setTransactions(txRes.data || [])
    setWithdrawals(wdRes.data || [])
    setLoading(false)
  }

  async function handleWithdraw() {
    setError('')
    const amount = parseFloat(withdrawForm.amount)
    if (!amount || amount < 100) { setError('Montant minimum : 100 DT'); return }
    if (amount > (wallet?.balance || 0)) { setError('Solde insuffisant'); return }
    if (!withdrawForm.account) { setError('Entrez votre numéro de compte'); return }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('withdrawal_requests').insert({
      user_id: user.id, wallet_id: wallet.id,
      amount, method: withdrawForm.method,
      account_details: { account: withdrawForm.account, method: withdrawForm.method },
      status: 'pending'
    })
    if (!err) {
      // Deduct from balance temporarily
      await supabase.from('wallets').update({ balance: (wallet.balance - amount) }).eq('id', wallet.id)
      setSuccess(`Demande de retrait de ${amount} DT envoyée ! Traitement sous 24-48h.`)
      setShowWithdraw(false)
      loadWallet()
    } else { setError(err.message) }
    setSubmitting(false)
  }

  const txTypeConfig = {
    credit: { label: 'Gain trajet', color: '#10B981', sign: '+' },
    debit: { label: 'Débit', color: 'var(--red)', sign: '-' },
    withdrawal: { label: 'Retrait', color: 'var(--gold)', sign: '-' },
    refund: { label: 'Remboursement', color: '#10B981', sign: '+' },
    commission: { label: 'Commission', color: 'var(--muted)', sign: '-' },
  }

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Mon portefeuille</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Gérez vos revenus et demandes de retrait.</p>
      </div>

      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
          <CheckCircle size={16} color="#10B981" />
          <span style={{ fontSize: 13, color: '#10B981' }}>{success}</span>
        </div>
      )}

      {/* Balance card */}
      <div style={{ background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Solde disponible</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>{(wallet?.balance || 0).toFixed(2)}</div>
            <div style={{ fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>DT</div>
          </div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--teal-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={26} color="var(--teal)" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Total gagné', value: `${(wallet?.total_earned || 0).toFixed(0)} DT`, color: '#10B981', icon: TrendingUp },
            { label: 'Retiré', value: `${(wallet?.total_withdrawn || 0).toFixed(0)} DT`, color: 'var(--gold)', icon: ArrowDown },
            { label: 'En attente', value: `${Math.max(0, (wallet?.total_earned || 0) - (wallet?.balance || 0) - (wallet?.total_withdrawn || 0)).toFixed(0)} DT`, color: 'var(--muted)', icon: Clock },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: '14px' }}
          onClick={() => setShowWithdraw(true)}
          disabled={(wallet?.balance || 0) < 100}>
          <ArrowDown size={16} />Retirer mes gains
        </button>
        {(wallet?.balance || 0) < 100 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
            Minimum 100 DT · Manque {Math.max(0, 100 - (wallet?.balance || 0)).toFixed(2)} DT
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Transactions */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Historique des transactions</h3>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>Aucune transaction</div>
          ) : transactions.map(tx => {
            const cfg = txTypeConfig[tx.type] || txTypeConfig.debit
            return (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(tx.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>
                  {cfg.sign}{tx.amount.toFixed(2)} DT
                </div>
              </div>
            )
          })}
        </div>

        {/* Withdrawal requests */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Demandes de retrait</h3>
          {withdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>Aucune demande</div>
          ) : withdrawals.map(wd => (
            <div key={wd.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{wd.amount.toFixed(2)} DT</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{wd.method}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(wd.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</div>
                </div>
                <span className={`status-badge ${wd.status === 'paid' ? 'status-active-b' : wd.status === 'pending' ? 'status-pending-b' : wd.status === 'rejected' ? 'status-cancelled' : 'status-confirmed'}`}>
                  {wd.status === 'paid' ? 'Payé' : wd.status === 'pending' ? 'En attente' : wd.status === 'approved' ? 'Approuvé' : 'Refusé'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal modal */}
      {showWithdraw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ padding: 28, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontWeight: 800, marginBottom: 20 }}>Retirer mes gains</h3>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Montant (min. 100 DT)</label>
              <input className="input" type="number" min="100" max={wallet?.balance || 0} step="0.5"
                placeholder="100"
                value={withdrawForm.amount} onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))} />
              {withdrawForm.amount && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Solde restant : {((wallet?.balance || 0) - parseFloat(withdrawForm.amount || 0)).toFixed(2)} DT
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label" style={{ marginBottom: 10 }}>Méthode</label>
              {WITHDRAWAL_METHODS.map(m => (
                <button key={m.id} onClick={() => !m.disabled && setWithdrawForm(f => ({ ...f, method: m.id }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', marginBottom: 8, background: withdrawForm.method === m.id ? 'var(--teal-dim)' : 'var(--surface-2)', border: `1px solid ${withdrawForm.method === m.id ? 'var(--teal-border)' : 'var(--border)'}`, borderRadius: 10, cursor: m.disabled ? 'not-allowed' : 'pointer', opacity: m.disabled ? 0.5 : 1, fontFamily: 'var(--font)' }}>
                  <m.icon size={16} color={withdrawForm.method === m.id ? 'var(--teal)' : 'var(--muted)'} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: withdrawForm.method === m.id ? 'var(--teal)' : 'var(--text)' }}>{m.label}</span>
                  {m.comingSoon && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', background: 'var(--surface)', borderRadius: 4, padding: '2px 6px' }}>Bientôt</span>}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">
                {WITHDRAWAL_METHODS.find(m => m.id === withdrawForm.method)?.placeholder || 'Numéro de compte'}
              </label>
              <input className="input" placeholder={WITHDRAWAL_METHODS.find(m => m.id === withdrawForm.method)?.placeholder}
                value={withdrawForm.account} onChange={e => setWithdrawForm(f => ({ ...f, account: e.target.value }))} />
            </div>
            {error && (
              <div style={{ display: 'flex', gap: 8, color: 'var(--red)', fontSize: 13, marginBottom: 14, alignItems: 'center' }}>
                <AlertCircle size={14} />{error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowWithdraw(false)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleWithdraw} disabled={submitting}>
                {submitting ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { Upload, CheckCircle, Clock, AlertCircle, Shield, Car, Camera, FileText, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { title: 'Documents identité', icon: FileText, desc: 'CIN + Permis de conduire' },
  { title: 'Véhicule', icon: Car, desc: 'Carte grise + Photos' },
  { title: 'Soumission', icon: Shield, desc: 'Révision & envoi' },
]

export default function KYCPage() {
  const [kycStatus, setKycStatus] = useState(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState({})
  const [files, setFiles] = useState({ cin_front: null, cin_back: null, selfie: null, license: null, carte_grise: null, vehicle_photos: [] })
  const [vehicle, setVehicle] = useState({ brand: '', model: '', color: '', plate: '', seats: 5, year: new Date().getFullYear() - 2 })
  const [userId, setUserId] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { loadKYC() }, [])

  async function loadKYC() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)
    const { data } = await supabase.from('driver_kyc').select('*').eq('user_id', user.id).single()
    if (data) setKycStatus(data)
  }

  async function uploadFile(field, file) {
    if (!file || !userId) return null
    setUploading(u => ({ ...u, [field]: true }))
    const ext = file.name.split('.').pop()
    const path = `kyc/${userId}/${field}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    setUploading(u => ({ ...u, [field]: false }))
    if (error) return null
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    setFiles(f => ({ ...f, [field]: urlData.publicUrl }))
    return urlData.publicUrl
  }

  async function uploadVehiclePhoto(file) {
    if (!file || !userId) return
    setUploading(u => ({ ...u, vehicle_photos: true }))
    const path = `kyc/${userId}/vehicle_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    setUploading(u => ({ ...u, vehicle_photos: false }))
    if (!error) {
      const { data } = supabase.storage.from('documents').getPublicUrl(path)
      setFiles(f => ({ ...f, vehicle_photos: [...(f.vehicle_photos || []), data.publicUrl] }))
    }
  }

  async function handleSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const kycData = {
      user_id: user.id,
      cin_front_url: files.cin_front, cin_back_url: files.cin_back,
      selfie_url: files.selfie, license_url: files.license,
      carte_grise_url: files.carte_grise, vehicle_photos: files.vehicle_photos,
      vehicle_brand: vehicle.brand, vehicle_model: vehicle.model,
      vehicle_color: vehicle.color, vehicle_plate: vehicle.plate,
      vehicle_seats: vehicle.seats, vehicle_year: vehicle.year,
      status: 'pending', submitted_at: new Date().toISOString()
    }
    const { error } = await supabase.from('driver_kyc').upsert(kycData, { onConflict: 'user_id' })
    if (!error) {
      // Notify admins
      const { data: admins } = await supabase.from('user_profiles').select('id').eq('role', 'admin')
      if (admins?.length > 0) {
        await supabase.from('notifications').insert(admins.map(a => ({
          user_id: a.id,
          title: 'Nouvelle demande KYC',
          body: `Un conducteur attend sa vérification. À examiner.`,
          type: 'kyc', action_url: '/admin/dashboard'
        })))
      }
      setSubmitted(true)
    }
    setLoading(false)
  }

  const FileUploadBox = ({ field, label, icon: Icon = Upload, accept = 'image/*' }) => (
    <div>
      <label className="label">{label}</label>
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 16px', background: files[field] ? 'rgba(16,185,129,0.08)' : 'var(--surface-2)', border: `2px dashed ${files[field] ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
        {uploading[field] ? (
          <div style={{ width: 24, height: 24, border: '2px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        ) : files[field] ? (
          <CheckCircle size={24} color="#10B981" />
        ) : (
          <Icon size={24} color="var(--muted)" />
        )}
        <span style={{ fontSize: 13, color: files[field] ? '#10B981' : 'var(--muted)', textAlign: 'center' }}>
          {files[field] ? '✓ Téléchargé' : 'Cliquez ou glissez le fichier ici'}
        </span>
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadFile(field, e.target.files[0])} />
      </label>
    </div>
  )

  // Already verified
  if (kycStatus?.status === 'approved') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-dim)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Shield size={28} color="var(--teal)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--teal)' }}>Conducteur Vérifié ✓</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
            Votre identité et votre véhicule ont été validés. Vous pouvez maintenant publier des trajets.
          </p>
        </div>
      </div>
    )
  }

  // Pending review
  if (kycStatus?.status === 'pending' || submitted) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Clock size={28} color="var(--gold)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--gold)' }}>Dossier en cours d'examen</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Votre dossier a été soumis avec succès. Notre équipe l'examine sous <strong style={{ color: 'var(--text)' }}>2 heures ouvrables</strong>.
          </p>
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>
            Soumis le : {kycStatus?.submitted_at ? new Date(kycStatus.submitted_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'maintenant'}
          </div>
        </div>
      </div>
    )
  }

  // Rejected
  if (kycStatus?.status === 'rejected') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ padding: 32, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
            <AlertCircle size={20} color="var(--red)" style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>Dossier refusé</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text)' }}>Raison :</strong> {kycStatus.rejection_reason || 'Documents insuffisants ou illisibles.'}
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setKycStatus(null)}>Re-soumettre le dossier</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Vérification KYC</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Complétez votre dossier pour devenir conducteur vérifié Waselni.</p>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={i} onClick={() => i < step && setStep(i)}
            style={{ flex: 1, background: i === step ? 'var(--teal-dim)' : 'var(--surface)', border: `1px solid ${i === step ? 'var(--teal-border)' : i < step ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px', cursor: i < step ? 'pointer' : 'default', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {i < step ? <CheckCircle size={16} color="#10B981" /> : <s.icon size={16} color={i === step ? 'var(--teal)' : 'var(--muted)'} />}
              <span style={{ fontSize: 13, fontWeight: 700, color: i === step ? 'var(--teal)' : i < step ? '#10B981' : 'var(--muted)' }}>
                {s.title}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 28 }}>
        {/* STEP 0 — Identity docs */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-in">
            <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--teal)' }}>
              ℹ️ Tous vos documents sont chiffrés et stockés de façon sécurisée. Ils sont uniquement utilisés pour la vérification.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FileUploadBox field="cin_front" label="CIN — Recto *" />
              <FileUploadBox field="cin_back" label="CIN — Verso *" />
            </div>
            <FileUploadBox field="selfie" label="Selfie tenant votre CIN *" icon={Camera} />
            <FileUploadBox field="license" label="Permis de conduire *" />
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              disabled={!files.cin_front || !files.cin_back || !files.selfie || !files.license}
              onClick={() => setStep(1)}>
              Suivant — Véhicule <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 1 — Vehicle */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Marque *</label>
                <input className="input" placeholder="Volkswagen, Toyota..." value={vehicle.brand} onChange={e => setVehicle(v => ({ ...v, brand: e.target.value }))} />
              </div>
              <div>
                <label className="label">Modèle *</label>
                <input className="input" placeholder="Golf, Corolla..." value={vehicle.model} onChange={e => setVehicle(v => ({ ...v, model: e.target.value }))} />
              </div>
              <div>
                <label className="label">Couleur *</label>
                <input className="input" placeholder="Blanc, Noir..." value={vehicle.color} onChange={e => setVehicle(v => ({ ...v, color: e.target.value }))} />
              </div>
              <div>
                <label className="label">Immatriculation *</label>
                <input className="input" placeholder="123 TU 4567" value={vehicle.plate} onChange={e => setVehicle(v => ({ ...v, plate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nombre de places (total)</label>
                <select className="input" value={vehicle.seats} onChange={e => setVehicle(v => ({ ...v, seats: parseInt(e.target.value) }))}>
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} places</option>)}
                </select>
              </div>
              <div>
                <label className="label">Année</label>
                <input className="input" type="number" min="2000" max={new Date().getFullYear()} value={vehicle.year} onChange={e => setVehicle(v => ({ ...v, year: parseInt(e.target.value) }))} />
              </div>
            </div>
            <FileUploadBox field="carte_grise" label="Carte grise *" />
            <div>
              <label className="label">Photos du véhicule (4 angles recommandés)</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 16px', background: 'var(--surface-2)', border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer' }}>
                <Upload size={22} color="var(--muted)" />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Ajouter des photos ({files.vehicle_photos.length}/4)</span>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => Array.from(e.target.files).forEach(f => uploadVehiclePhoto(f))} />
              </label>
              {files.vehicle_photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {files.vehicle_photos.map((url, i) => (
                    <div key={i} style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(0)}>← Retour</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                disabled={!vehicle.brand || !vehicle.model || !vehicle.plate || !files.carte_grise}
                onClick={() => setStep(2)}>
                Vérifier et soumettre <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Review & submit */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-in">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Récapitulatif du dossier</h3>
            {[
              { label: 'CIN Recto/Verso', ok: !!files.cin_front && !!files.cin_back },
              { label: 'Selfie avec CIN', ok: !!files.selfie },
              { label: 'Permis de conduire', ok: !!files.license },
              { label: 'Carte grise', ok: !!files.carte_grise },
              { label: `Véhicule : ${vehicle.brand} ${vehicle.model} ${vehicle.year}`, ok: true },
              { label: `Immatriculation : ${vehicle.plate}`, ok: !!vehicle.plate },
              { label: `Photos du véhicule (${files.vehicle_photos.length})`, ok: files.vehicle_photos.length > 0 },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: item.ok ? 'rgba(16,185,129,0.08)' : 'var(--red-dim)', borderRadius: 10 }}>
                {item.ok ? <CheckCircle size={16} color="#10B981" /> : <AlertCircle size={16} color="var(--red)" />}
                <span style={{ fontSize: 13, color: item.ok ? '#10B981' : 'var(--red)' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: 'var(--teal)', lineHeight: 1.7 }}>
              🔒 En soumettant, vous certifiez que tous les documents fournis sont authentiques. Notre équipe examinera votre dossier sous <strong>2 heures ouvrables</strong>.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Modifier</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Envoi en cours...' : '✓ Soumettre le dossier KYC'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

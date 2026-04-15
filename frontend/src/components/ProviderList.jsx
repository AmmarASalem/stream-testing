import { useState, useEffect } from 'react'
import { api } from '../api'

export default function ProviderList({ project, onBack, onRequestSent }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null) // seller id being requested
  const [error, setError] = useState(null)

  const providerType = project.stage === 'design' ? 'engineering_office' : 'contractor'
  const providerLabel = providerType === 'engineering_office' ? 'Engineering Office' : 'Contractor'

  useEffect(() => {
    api(`/api/providers?type=${providerType}`)
      .then(setProviders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [providerType])

  async function sendRequest(sellerId) {
    setSending(sellerId)
    setError(null)
    try {
      const request = await api('/api/negotiations/requests', {
        body: { project_id: project.id, seller_id: sellerId }
      })
      onRequestSent(request)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(null)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← Back to Project</button>
        <div>
          <h2 style={s.title}>Find a {providerLabel}</h2>
          <p style={s.sub}>Verified providers for: <strong>{project.title}</strong></p>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {loading ? (
        <p style={s.empty}>Loading providers...</p>
      ) : providers.length === 0 ? (
        <p style={s.empty}>No verified {providerLabel.toLowerCase()}s registered yet.</p>
      ) : (
        <div style={s.grid}>
          {providers.map(p => (
            <div key={p.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.avatar}>{p.name[0]}</div>
                <div>
                  <p style={s.name}>{p.name}</p>
                  <span style={s.badge}>
                    {p.provider_type === 'engineering_office' ? 'SCE Verified' : 'Muqawil Verified'}
                  </span>
                </div>
              </div>

              <div style={s.details}>
                <p style={s.detail}>📧 {p.email}</p>
                <p style={s.detail}>📞 {p.phone}</p>
                {p.membership_id && <p style={s.detail}>🪪 SCE #{p.membership_id}</p>}
                {p.contractor_id && <p style={s.detail}>🏗 Muqawil #{p.contractor_id}</p>}
              </div>

              <button
                style={s.btn}
                onClick={() => sendRequest(p.id)}
                disabled={sending === p.id}
              >
                {sending === p.id ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  header: { marginBottom: 24 },
  back: { background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  sub: { margin: '4px 0 0', color: '#666', fontSize: 14 },
  error: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 16 },
  empty: { color: '#999', textAlign: 'center', marginTop: 60, fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  name: { margin: 0, fontWeight: 700, fontSize: 15, color: '#1a1a1a' },
  badge: { fontSize: 11, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 10 },
  details: { marginBottom: 14, borderTop: '1px solid #f0f0f0', paddingTop: 12 },
  detail: { margin: '4px 0', fontSize: 13, color: '#555' },
  btn: { width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
}

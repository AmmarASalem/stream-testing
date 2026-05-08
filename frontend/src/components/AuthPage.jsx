import { useState } from 'react'

const API = 'http://localhost:3001/api/auth'

const ROLES = [
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
]

export default function AuthPage({ onAuth }) {
  const [role, setRole] = useState('buyer')
  const [mode, setMode] = useState('signup')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function switchRole(r) { setRole(r); setError(null) }
  function switchMode(m) { setMode(m); setError(null) }
  function handleInput(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = mode === 'signup' ? `/signup/${role}` : `/login/${role}`
      const body = mode === 'signup'
        ? { name: form.name, email: form.email, phone: form.phone, password: form.password }
        : { email: form.email, password: form.password }

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Something went wrong.')
      } else {
        onAuth(data.user)
      }
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.logoRow}>
          <span style={s.logo}>Marketplace</span>
        </div>

        <div style={s.toggle}>
          {ROLES.map(r => (
            <button
              key={r.key}
              type="button"
              style={role === r.key ? s.toggleActive : s.toggleInactive}
              onClick={() => switchRole(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={s.modeRow}>
          <button type="button" style={mode === 'signup' ? s.modeActive : s.modeInactive} onClick={() => switchMode('signup')}>Sign Up</button>
          <button type="button" style={mode === 'login' ? s.modeActive : s.modeInactive} onClick={() => switchMode('login')}>Log In</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>

          {isSignup && (
            <>
              <label style={s.label}>Full Name</label>
              <input style={s.input} name="name" placeholder="Your full name" value={form.name} onChange={handleInput} required />
            </>
          )}

          <label style={s.label}>Email</label>
          <input style={s.input} name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleInput} required />

          {isSignup && (
            <>
              <label style={s.label}>Phone</label>
              <input style={s.input} name="phone" type="tel" placeholder="+966 5X XXX XXXX" value={form.phone} onChange={handleInput} />
            </>
          )}

          <label style={s.label}>Password</label>
          <input style={s.input} name="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={handleInput} minLength={8} required />

          {error && <div style={s.errorBox}>{error}</div>}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>

      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
    fontFamily: "'Segoe UI', sans-serif",
    padding: 20
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '2rem',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 4px 24px rgba(0,0,0,0.09)'
  },
  logoRow: { textAlign: 'center', marginBottom: 24 },
  logo: { fontSize: 26, fontWeight: 800, color: '#1a1a1a', display: 'block' },
  logoSub: { fontSize: 12, color: '#888', marginTop: 2, display: 'block' },
  toggle: {
    display: 'flex',
    background: '#f0f2f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    gap: 4
  },
  toggleActive: {
    flex: 1, padding: '9px 0', border: 'none', borderRadius: 8,
    background: '#fff', fontWeight: 700, fontSize: 14, color: '#1a1a1a',
    cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)'
  },
  toggleInactive: {
    flex: 1, padding: '9px 0', border: 'none', borderRadius: 8,
    background: 'transparent', fontWeight: 500, fontSize: 14, color: '#777',
    cursor: 'pointer'
  },
  modeRow: { display: 'flex', gap: 16, marginBottom: 20 },
  modeActive: {
    flex: 1, padding: '8px 0', border: 'none', borderBottom: '2px solid #1a73e8',
    background: 'transparent', fontWeight: 700, fontSize: 14, color: '#1a73e8',
    cursor: 'pointer'
  },
  modeInactive: {
    flex: 1, padding: '8px 0', border: 'none', borderBottom: '2px solid #e0e0e0',
    background: 'transparent', fontWeight: 500, fontSize: 14, color: '#999',
    cursor: 'pointer'
  },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  input: {
    padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd',
    fontSize: 14, outline: 'none', color: '#111'
  },
  errorBox: {
    background: '#fce8e6', border: '1px solid #f5c6c2',
    borderRadius: 8, padding: '10px 12px',
    fontSize: 13, color: '#c62828'
  },
  btn: {
    marginTop: 4, padding: '12px', borderRadius: 8, border: 'none',
    background: '#1a73e8', color: '#fff', fontSize: 15,
    fontWeight: 700, cursor: 'pointer'
  },
  hint: { textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 14 }
}

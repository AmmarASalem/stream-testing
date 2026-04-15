import { useState } from 'react'

const API = 'http://localhost:3001/api/auth'

// 'homeowner' | 'engineering_office' | 'contractor'
const ROLES = [
  { key: 'homeowner', label: 'Homeowner' },
  { key: 'engineering_office', label: 'Engineering Office' },
  { key: 'contractor', label: 'Contractor' },
]

export default function AuthPage({ onAuth }) {
  const [role, setRole] = useState('homeowner')
  const [mode, setMode] = useState('signup')

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', contractor_id: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const isProvider = role === 'engineering_office' || role === 'contractor'

  function switchRole(r) {
    setRole(r)
    setError(null)
    setFile(null)
    setPreview(null)
  }

  function switchMode(m) {
    setMode(m)
    setError(null)
  }

  function handleInput(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let res, data

      if (mode === 'signup' && role === 'homeowner') {
        res = await fetch(`${API}/signup/buyer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone })
        })

      } else if (mode === 'login' && role === 'homeowner') {
        res = await fetch(`${API}/login/buyer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email })
        })

      } else if (mode === 'signup' && role === 'engineering_office') {
        if (!file) { setError('Please upload your SCE certificate.'); setLoading(false); return }
        const body = new FormData()
        body.append('name', form.name)
        body.append('email', form.email)
        body.append('phone', form.phone)
        body.append('password', form.password)
        body.append('certificate', file)
        res = await fetch(`${API}/signup/engineering_office`, { method: 'POST', body })

      } else if (mode === 'signup' && role === 'contractor') {
        if (!form.contractor_id) { setError('Please enter your Muqawil contractor ID.'); setLoading(false); return }
        res = await fetch(`${API}/signup/contractor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password, contractor_id: form.contractor_id })
        })

      } else {
        // login — engineering_office or contractor both use the same seller login
        res = await fetch(`${API}/login/seller`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password })
        })
      }

      data = await res.json()

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

        {/* Logo / title */}
        <div style={s.logoRow}>
          <span style={s.logo}>Banna</span>
          <span style={s.logoSub}>Home Building Marketplace</span>
        </div>

        {/* Role toggle */}
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

        {/* Mode toggle */}
        <div style={s.modeRow}>
          <button type="button" style={mode === 'signup' ? s.modeActive : s.modeInactive} onClick={() => switchMode('signup')}>Sign Up</button>
          <button type="button" style={mode === 'login' ? s.modeActive : s.modeInactive} onClick={() => switchMode('login')}>Log In</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>

          {/* Name — signup only */}
          {isSignup && (
            <>
              <label style={s.label}>Full Name</label>
              <input style={s.input} name="name" placeholder="Your full name" value={form.name} onChange={handleInput} required />
            </>
          )}

          {/* Email — always */}
          <label style={s.label}>Email</label>
          <input style={s.input} name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleInput} required />

          {/* Phone — signup only */}
          {isSignup && (
            <>
              <label style={s.label}>Phone</label>
              <input style={s.input} name="phone" type="tel" placeholder="+966 5X XXX XXXX" value={form.phone} onChange={handleInput} required />
            </>
          )}

          {/* Password — providers only */}
          {isProvider && (
            <>
              <label style={s.label}>Password</label>
              <input style={s.input} name="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={handleInput} minLength={8} required />
            </>
          )}

          {/* Engineering Office: SCE certificate upload */}
          {role === 'engineering_office' && isSignup && (
            <>
              <label style={s.label}>SCE Certificate Image</label>
              <label style={s.fileLabel}>
                {file ? file.name : 'Click to upload certificate'}
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              </label>
              {preview && (
                <div style={s.previewBox}>
                  <img src={preview} alt="Certificate" style={s.previewImg} />
                  <p style={s.previewNote}>QR code will be scanned to verify your SCE membership.</p>
                </div>
              )}
            </>
          )}

          {/* Contractor: Muqawil ID */}
          {role === 'contractor' && isSignup && (
            <>
              <label style={s.label}>Muqawil Contractor ID</label>
              <input
                style={s.input}
                name="contractor_id"
                placeholder="e.g. 100005440"
                value={form.contractor_id}
                onChange={handleInput}
                required
              />
              <p style={s.hint}>Your ID will be verified against the Muqawil registry.</p>
            </>
          )}

          {error && <div style={s.errorBox}>{error}</div>}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading
              ? (role === 'engineering_office' && isSignup ? 'Verifying certificate...'
                : role === 'contractor' && isSignup ? 'Checking Muqawil registry...'
                : 'Please wait...')
              : (isSignup ? 'Create Account' : 'Log In')}
          </button>
        </form>

        {/* Homeowner login note */}
        {role === 'homeowner' && mode === 'login' && (
          <p style={s.hint}>No password needed — we'll find your account by email.</p>
        )}
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
  fileLabel: {
    display: 'block', padding: '10px 12px', borderRadius: 8,
    border: '1.5px dashed #ccc', fontSize: 13, color: '#555',
    cursor: 'pointer', textAlign: 'center'
  },
  previewBox: {
    border: '1px solid #e8e8e8', borderRadius: 8,
    padding: 10, textAlign: 'center', background: '#fafafa'
  },
  previewImg: { maxWidth: '100%', maxHeight: 200, borderRadius: 6 },
  previewNote: { margin: '8px 0 0', fontSize: 11, color: '#999' },
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

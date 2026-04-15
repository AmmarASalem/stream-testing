import { useState } from 'react'

export default function SellerRegister() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message }
  const [loading, setLoading] = useState(false)

  function handleInput(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleFile(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setStatus({ type: 'error', message: 'Please upload your SCE certificate image.' })
      return
    }

    setLoading(true)
    setStatus(null)

    const body = new FormData()
    body.append('name', form.name)
    body.append('email', form.email)
    body.append('password', form.password)
    body.append('certificate', file)

    try {
      const res = await fetch('http://localhost:3001/api/sellers/register', {
        method: 'POST',
        body
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', message: data.message || 'Registration failed.' })
      } else {
        setStatus({ type: 'success', message: data.message, seller: data.seller })
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not reach the server. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Seller Registration</h2>
        <p style={styles.subtitle}>Engineering offices &amp; contractors</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Full Name</label>
          <input
            style={styles.input}
            name="name"
            placeholder="Al-Banna Engineering Office"
            value={form.name}
            onChange={handleInput}
            required
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            name="email"
            type="email"
            placeholder="you@office.sa"
            value={form.email}
            onChange={handleInput}
            required
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            name="password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={handleInput}
            minLength={8}
            required
          />

          <label style={styles.label}>SCE Certificate Image</label>
          <input
            style={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handleFile}
            required
          />

          {preview && (
            <div style={styles.previewBox}>
              <img src={preview} alt="Certificate preview" style={styles.previewImg} />
              <p style={styles.previewNote}>The QR code on this certificate will be scanned for verification.</p>
            </div>
          )}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Verifying & Registering...' : 'Register as Seller'}
          </button>
        </form>

        {status && status.type === 'success' && (
          <div style={styles.successBox}>
            <span style={styles.badge}>Verified</span>
            <p style={styles.successText}>{status.message}</p>
            <p style={styles.meta}>Membership ID: {status.seller?.membership_id}</p>
          </div>
        )}

        {status && status.type === 'error' && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{status.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    fontFamily: 'sans-serif'
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#111' },
  subtitle: { margin: '4px 0 24px', color: '#666', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 13, fontWeight: 600, color: '#333' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none'
  },
  fileInput: { fontSize: 14 },
  previewBox: {
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: 10,
    textAlign: 'center'
  },
  previewImg: { maxWidth: '100%', maxHeight: 220, borderRadius: 6 },
  previewNote: { margin: '8px 0 0', fontSize: 12, color: '#888' },
  button: {
    marginTop: 8,
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: '#1a73e8',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer'
  },
  successBox: {
    marginTop: 20,
    background: '#e6f4ea',
    border: '1px solid #a8d5b0',
    borderRadius: 8,
    padding: '14px 16px'
  },
  badge: {
    display: 'inline-block',
    background: '#34a853',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 20,
    marginBottom: 8
  },
  successText: { margin: '4px 0', color: '#1e4d2b', fontSize: 14 },
  meta: { margin: '4px 0 0', fontSize: 12, color: '#555' },
  errorBox: {
    marginTop: 20,
    background: '#fce8e6',
    border: '1px solid #f5c6c2',
    borderRadius: 8,
    padding: '14px 16px'
  },
  errorText: { margin: 0, color: '#c62828', fontSize: 14 }
}

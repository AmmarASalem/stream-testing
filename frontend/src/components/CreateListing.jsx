import { useState } from 'react'
import { api } from '../api'

export default function CreateListing({ onCreated, onBack }) {
  const [form, setForm] = useState({ title: '', description: '', price: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleInput(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const listing = await api('/api/listings', {
        body: { title: form.title, description: form.description, price: Number(form.price) }
      })
      onCreated(listing)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topRow}>
          <button style={s.back} onClick={onBack}>← Back</button>
          <h2 style={s.title}>New Listing</h2>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Title</label>
          <input style={s.input} name="title" placeholder="What are you selling?" value={form.title} onChange={handleInput} required />

          <label style={s.label}>Description</label>
          <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} name="description" placeholder="Describe the item..." value={form.description} onChange={handleInput} />

          <label style={s.label}>Price (SAR)</label>
          <input style={s.input} name="price" type="number" placeholder="0" value={form.price} onChange={handleInput} required min="1" />

          {error && <div style={s.error}>{error}</div>}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  card: { background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 480, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  topRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  back: { background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' },
  error: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828' },
  btn: { padding: 12, borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
}

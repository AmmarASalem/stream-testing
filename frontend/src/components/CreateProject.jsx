import { useState } from 'react'
import { api } from '../api'

export default function CreateProject({ onCreated, onBack }) {
  const [form, setForm] = useState({
    title: '', location: '', land_size: '', budget: '',
    floors: '1', rooms: '3', design_style: 'modern'
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleInput(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('Property deed (Suk) image is required.'); return }
    setLoading(true)
    setError(null)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([k, v]) => body.append(k, v))
      body.append('suk', file)
      const project = await api('/api/projects', { body })
      onCreated(project)
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
          <h2 style={s.title}>New Project</h2>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <Row label="Project Title">
            <input style={s.input} name="title" placeholder="My Villa in Riyadh" value={form.title} onChange={handleInput} required />
          </Row>
          <Row label="Location">
            <input style={s.input} name="location" placeholder="Riyadh, Al Olaya District" value={form.location} onChange={handleInput} required />
          </Row>

          <div style={s.twoCol}>
            <Row label="Land Size (m²)">
              <input style={s.input} name="land_size" type="number" placeholder="400" value={form.land_size} onChange={handleInput} required />
            </Row>
            <Row label="Budget (SAR)">
              <input style={s.input} name="budget" type="number" placeholder="500000" value={form.budget} onChange={handleInput} required />
            </Row>
          </div>

          <div style={s.twoCol}>
            <Row label="Floors">
              <select style={s.input} name="floors" value={form.floors} onChange={handleInput}>
                {[1,2,3,4].map(n => <option key={n}>{n}</option>)}
              </select>
            </Row>
            <Row label="Bedrooms">
              <select style={s.input} name="rooms" value={form.rooms} onChange={handleInput}>
                {[2,3,4,5,6,7].map(n => <option key={n}>{n}</option>)}
              </select>
            </Row>
          </div>

          <Row label="Design Style">
            <select style={s.input} name="design_style" value={form.design_style} onChange={handleInput}>
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
              <option value="neoclassic">Neo-Classic</option>
              <option value="contemporary">Contemporary</option>
            </select>
          </Row>

          <Row label="Property Deed (Suk)">
            <label style={s.fileLabel}>
              {file ? file.name : 'Click to upload deed image'}
              <input type="file" accept="image/*,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
            </label>
            {preview && <img src={preview} alt="Deed" style={s.preview} />}
          </Row>

          {error && <div style={s.error}>{error}</div>}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating project...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  card: { background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 560, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  topRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  back: { background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' },
  fileLabel: { display: 'block', padding: '10px 12px', borderRadius: 8, border: '1.5px dashed #ccc', fontSize: 13, color: '#555', cursor: 'pointer', textAlign: 'center' },
  preview: { width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginTop: 8 },
  error: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828' },
  btn: { padding: 12, borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
}

import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Dashboard({ user, onCreateProject, onOpenProject, onOpenRequest }) {
  const isBuyer = user.role === 'buyer'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const path = isBuyer ? '/api/projects' : '/api/negotiations/requests'
    api(path)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isBuyer])

  const stageColor = { design: '#1a73e8', contractor: '#f57c00', complete: '#34a853' }
  const statusColor = { pending: '#f57c00', active: '#1a73e8', paid: '#34a853', complete: '#34a853', cancelled: '#999' }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>{isBuyer ? 'My Projects' : 'Incoming Requests'}</h2>
          <p style={s.sub}>Welcome back, {user.name}</p>
        </div>
        {isBuyer && (
          <button style={s.newBtn} onClick={onCreateProject}>+ New Project</button>
        )}
      </div>

      {loading ? (
        <p style={s.empty}>Loading...</p>
      ) : items.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyText}>
            {isBuyer ? 'No projects yet.' : 'No requests yet.'}
          </p>
          {isBuyer && (
            <button style={s.newBtn} onClick={onCreateProject}>Create your first project</button>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {isBuyer
            ? items.map(p => (
                <div key={p.id} style={s.card} onClick={() => onOpenProject(p)}>
                  <div style={s.cardHeader}>
                    <h3 style={s.cardTitle}>{p.title}</h3>
                    <span style={{ ...s.badge, background: stageColor[p.stage] }}>
                      {p.stage === 'design' ? 'Design' : p.stage === 'contractor' ? 'Contractor' : 'Complete'}
                    </span>
                  </div>
                  <p style={s.cardMeta}>📍 {p.location}</p>
                  <p style={s.cardMeta}>💰 {Number(p.budget).toLocaleString()} SAR · {p.land_size} m²</p>
                  <p style={s.cardMeta}>🏠 {p.floors} floor{p.floors > 1 ? 's' : ''} · {p.rooms} rooms · {p.design_style}</p>
                  <p style={s.cardDate}>{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              ))
            : items.map(r => (
                <div key={r.id} style={s.card} onClick={() => onOpenRequest(r)}>
                  <div style={s.cardHeader}>
                    <h3 style={s.cardTitle}>{r.projects?.title || 'Project'}</h3>
                    <span style={{ ...s.badge, background: statusColor[r.status] || '#999' }}>
                      {r.status}
                    </span>
                  </div>
                  <p style={s.cardMeta}>👤 {r.buyers?.name}</p>
                  <p style={s.cardMeta}>📍 {r.projects?.location}</p>
                  <p style={s.cardMeta}>💰 Budget: {Number(r.projects?.budget || 0).toLocaleString()} SAR</p>
                  <p style={s.cardMeta}>📋 Stage: {r.stage}</p>
                  <p style={s.cardDate}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  sub: { margin: '4px 0 0', color: '#666', fontSize: 14 },
  newBtn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  empty: { color: '#999', textAlign: 'center', marginTop: 60 },
  emptyState: { textAlign: 'center', marginTop: 60 },
  emptyText: { color: '#999', marginBottom: 16, fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'box-shadow 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
  badge: { color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, flexShrink: 0 },
  cardMeta: { margin: '3px 0', fontSize: 13, color: '#555' },
  cardDate: { margin: '8px 0 0', fontSize: 11, color: '#bbb' }
}

import { useState } from 'react'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import CreateListing from './components/CreateListing'
import NegotiationView from './components/NegotiationView'
import { setUser } from './api'

export default function App() {
  const [user, setCurrentUser] = useState(null)
  const [view, setView] = useState({ name: 'dashboard' })

  function handleAuth(u) {
    setCurrentUser(u)
    setUser(u)
    setView({ name: 'dashboard' })
  }

  function handleLogout() {
    setCurrentUser(null)
    setUser(null)
    setView({ name: 'dashboard' })
  }

  if (!user) return <AuthPage onAuth={handleAuth} />

  return (
    <div>
      <div style={nav.bar}>
        <span style={nav.logo} onClick={() => setView({ name: 'dashboard' })}>Banna</span>
        <div style={nav.right}>
          <span style={nav.userName}>{user.name}</span>
          <span style={nav.rolePill}>{user.role}</span>
          <button style={nav.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {view.name === 'dashboard' && (
        <Dashboard
          user={user}
          onOpenNegotiation={request => setView({ name: 'negotiation', request })}
          onCreateListing={() => setView({ name: 'create_listing' })}
        />
      )}

      {view.name === 'create_listing' && (
        <CreateListing
          onBack={() => setView({ name: 'dashboard' })}
          onCreated={() => setView({ name: 'dashboard' })}
        />
      )}

      {view.name === 'negotiation' && (
        <NegotiationView
          request={view.request}
          user={user}
          onBack={() => setView({ name: 'dashboard' })}
        />
      )}
    </div>
  )
}

const nav = {
  bar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', background: '#fff',
    borderBottom: '1px solid #e8e8e8', fontFamily: "'Segoe UI', sans-serif"
  },
  logo: { fontSize: 20, fontWeight: 800, color: '#1a1a1a', cursor: 'pointer' },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  userName: { fontSize: 14, color: '#444' },
  rolePill: { fontSize: 11, fontWeight: 700, background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize' },
  logoutBtn: { padding: '6px 14px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, color: '#555', cursor: 'pointer' }
}

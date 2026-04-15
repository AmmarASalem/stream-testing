import { useState } from 'react'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import CreateProject from './components/CreateProject'
import ProviderList from './components/ProviderList'
import ProjectView from './components/ProjectView'
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

  function navigate(v) { setView(v) }

  if (!user) return <AuthPage onAuth={handleAuth} />

  return (
    <div>
      {/* Top nav */}
      <div style={nav.bar}>
        <span style={nav.logo} onClick={() => navigate({ name: 'dashboard' })}>Banna</span>
        <div style={nav.right}>
          <span style={nav.userName}>{user.name}</span>
          {user.is_verified && <span style={nav.verified}>Verified</span>}
          <button style={nav.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {/* Views */}
      {view.name === 'dashboard' && (
        <Dashboard
          user={user}
          onCreateProject={() => navigate({ name: 'create_project' })}
          onOpenProject={project => navigate({ name: 'project', project })}
          onOpenRequest={request => navigate({ name: 'request', request })}
        />
      )}

      {view.name === 'create_project' && (
        <CreateProject
          onBack={() => navigate({ name: 'dashboard' })}
          onCreated={project => navigate({ name: 'project', project })}
        />
      )}

      {view.name === 'project' && (
        <ProjectView
          project={view.project}
          user={user}
          onBack={() => navigate({ name: 'dashboard' })}
          onFindProvider={project => navigate({ name: 'providers', project })}
        />
      )}

      {view.name === 'providers' && (
        <ProviderList
          project={view.project}
          onBack={() => navigate({ name: 'project', project: view.project })}
          onRequestSent={() => navigate({ name: 'project', project: view.project })}
        />
      )}

      {view.name === 'request' && (
        // Provider opens a request directly from their dashboard
        <ProjectView
          project={view.request.projects}
          user={user}
          onBack={() => navigate({ name: 'dashboard' })}
          onFindProvider={() => {}}
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
  verified: { fontSize: 11, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 10 },
  logoutBtn: { padding: '6px 14px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 13, color: '#555', cursor: 'pointer' }
}

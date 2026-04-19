import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Dashboard({ user, onOpenNegotiation, onCreateListing }) {
  const isBuyer = user.role === 'buyer'
  const [tab, setTab] = useState(isBuyer ? 'browse' : 'listings')
  const [listings, setListings] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [offerForm, setOfferForm] = useState(null) // listing id being offered on

  useEffect(() => {
    setLoading(true)
    const fetches = isBuyer
      ? [api('/api/listings'), api('/api/negotiations/requests')]
      : [api('/api/listings/mine'), api('/api/negotiations/requests')]

    Promise.all(fetches)
      .then(([a, b]) => { setListings(a); setMyRequests(b) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isBuyer])

  const statusColor = { pending: '#f57c00', active: '#1a73e8', paid: '#34a853', cancelled: '#999' }

  async function sendRequest(listingId, amount) {
    try {
      const body = { listing_id: listingId, ...(amount ? { amount: Number(amount), expiry_hours: 24 } : {}) }
      await api('/api/negotiations/requests', { body })
      const requests = await api('/api/negotiations/requests')
      setMyRequests(requests)
      setOfferForm(null)
      setTab('requests')
    } catch (err) {
      alert(err.message)
    }
  }

  const myRequestListingIds = new Set(myRequests.filter(r => r.status !== 'cancelled').map(r => r.listing_id))

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>{isBuyer ? 'Marketplace' : 'My Store'}</h2>
          <p style={s.sub}>Welcome back, {user.name}</p>
        </div>
        {!isBuyer && (
          <button style={s.newBtn} onClick={onCreateListing}>+ New Listing</button>
        )}
      </div>

      <div style={s.tabs}>
        {isBuyer ? (
          <>
            <button style={tab === 'browse' ? s.tabActive : s.tabInactive} onClick={() => setTab('browse')}>Browse Listings</button>
            <button style={tab === 'requests' ? s.tabActive : s.tabInactive} onClick={() => setTab('requests')}>
              My Requests {myRequests.length > 0 && <span style={s.badge}>{myRequests.length}</span>}
            </button>
          </>
        ) : (
          <>
            <button style={tab === 'listings' ? s.tabActive : s.tabInactive} onClick={() => setTab('listings')}>My Listings</button>
            <button style={tab === 'requests' ? s.tabActive : s.tabInactive} onClick={() => setTab('requests')}>
              Requests {myRequests.length > 0 && <span style={s.badge}>{myRequests.length}</span>}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p style={s.empty}>Loading...</p>
      ) : (
        <>
          {/* Browse listings (buyer) */}
          {tab === 'browse' && (
            listings.length === 0
              ? <p style={s.empty}>No listings available yet.</p>
              : <div style={s.grid}>
                  {listings.map(l => {
                    const requested = myRequestListingIds.has(l.id)
                    return (
                      <div key={l.id} style={s.card}>
                        <div style={s.cardHeader}>
                          <h3 style={s.cardTitle}>{l.title}</h3>
                          <span style={{ ...s.pill, background: l.status === 'sold' ? '#e0e0e0' : '#e8f5e9', color: l.status === 'sold' ? '#999' : '#2e7d32' }}>
                            {l.status === 'sold' ? 'Sold' : 'Available'}
                          </span>
                        </div>
                        {l.description && <p style={s.cardDesc}>{l.description}</p>}
                        <p style={s.cardPrice}>{Number(l.price).toLocaleString()} SAR</p>
                        <p style={s.cardMeta}>Seller: {l.sellers?.name}</p>
                        {l.status === 'active' && (
                          requested
                            ? <button style={s.btnDisabled} disabled>Request Sent</button>
                            : offerForm === l.id
                              ? <OfferForm onSend={amount => sendRequest(l.id, amount)} onCancel={() => setOfferForm(null)} />
                              : <button style={s.btnPrimary} onClick={() => setOfferForm(l.id)}>Send Request</button>
                        )}
                      </div>
                    )
                  })}
                </div>
          )}

          {/* Seller's own listings */}
          {tab === 'listings' && (
            listings.length === 0
              ? (
                <div style={s.emptyState}>
                  <p style={s.emptyText}>No listings yet.</p>
                  <button style={s.newBtn} onClick={onCreateListing}>Create your first listing</button>
                </div>
              )
              : <div style={s.grid}>
                  {listings.map(l => (
                    <div key={l.id} style={s.card}>
                      <div style={s.cardHeader}>
                        <h3 style={s.cardTitle}>{l.title}</h3>
                        <span style={{ ...s.pill, background: l.status === 'sold' ? '#e0e0e0' : '#e8f5e9', color: l.status === 'sold' ? '#999' : '#2e7d32' }}>
                          {l.status === 'sold' ? 'Sold' : 'Active'}
                        </span>
                      </div>
                      {l.description && <p style={s.cardDesc}>{l.description}</p>}
                      <p style={s.cardPrice}>{Number(l.price).toLocaleString()} SAR</p>
                      <p style={s.cardDate}>{new Date(l.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
          )}

          {/* Requests (both roles) */}
          {tab === 'requests' && (
            myRequests.length === 0
              ? <p style={s.empty}>No requests yet.</p>
              : <div style={s.grid}>
                  {myRequests.map(r => (
                    <div key={r.id} style={s.card} onClick={() => onOpenNegotiation(r)} role="button">
                      <div style={s.cardHeader}>
                        <h3 style={s.cardTitle}>{r.listings?.title || 'Listing'}</h3>
                        <span style={{ ...s.pill, background: '#fff3e0', color: statusColor[r.status] || '#999' }}>
                          {r.status}
                        </span>
                      </div>
                      <p style={s.cardPrice}>{Number(r.listings?.price || 0).toLocaleString()} SAR (listed)</p>
                      <p style={s.cardMeta}>{isBuyer ? `Seller: ${r.sellers?.name}` : `Buyer: ${r.buyers?.name}`}</p>
                      <p style={s.cardDate}>{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
          )}
        </>
      )}
    </div>
  )
}

function OfferForm({ onSend, onCancel }) {
  const [amount, setAmount] = useState('')
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
        type="number" placeholder="Your offer (SAR)" value={amount}
        onChange={e => setAmount(e.target.value)} autoFocus
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          onClick={() => onSend(amount)} disabled={!amount}>
          Send
        </button>
        <button style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  sub: { margin: '4px 0 0', color: '#666', fontSize: 14 },
  newBtn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e8e8e8' },
  tabActive: { padding: '8px 20px', border: 'none', borderBottom: '2px solid #1a73e8', marginBottom: -2, background: 'transparent', fontWeight: 700, fontSize: 14, color: '#1a73e8', cursor: 'pointer' },
  tabInactive: { padding: '8px 20px', border: 'none', borderBottom: '2px solid transparent', marginBottom: -2, background: 'transparent', fontWeight: 500, fontSize: 14, color: '#888', cursor: 'pointer' },
  badge: { background: '#1a73e8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10, marginLeft: 6 },
  empty: { color: '#999', textAlign: 'center', marginTop: 60, fontSize: 15 },
  emptyState: { textAlign: 'center', marginTop: 60 },
  emptyText: { color: '#999', marginBottom: 16, fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
  pill: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, flexShrink: 0 },
  cardDesc: { margin: '0 0 8px', fontSize: 13, color: '#666', lineHeight: 1.4 },
  cardPrice: { margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#1a73e8' },
  cardMeta: { margin: '0 0 12px', fontSize: 13, color: '#888' },
  cardDate: { margin: 0, fontSize: 11, color: '#bbb' },
  btnPrimary: { width: '100%', marginTop: 4, padding: '10px 0', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnDisabled: { width: '100%', marginTop: 4, padding: '10px 0', borderRadius: 8, border: 'none', background: '#e0e0e0', color: '#999', fontWeight: 700, fontSize: 14, cursor: 'not-allowed' },
}

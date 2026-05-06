import { useState, useEffect } from 'react'
import { api } from '../api'

export default function NegotiationView({ request: initialRequest, user, onBack }) {
  const [data, setData] = useState(null)  // { request, offers }
  const [loading, setLoading] = useState(true)
  const [offerAmount, setOfferAmount] = useState('')
  const [expiryHours, setExpiryHours] = useState('24')
  const [isFinal, setIsFinal] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')
  const [showCounter, setShowCounter] = useState(false)
  const [paymentMode, setPaymentMode] = useState('one_time')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const isBuyer = user.role === 'buyer'

  async function load() {
    try {
      const result = await api(`/api/negotiations/requests/${initialRequest.id}`)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [initialRequest.id])

  const activeOffer = data?.offers?.filter(o => o.outcome === 'pending').slice(-1)[0]
  const agreedOffer = data?.offers?.find(o => o.outcome === 'accepted')
  const request = data?.request

  async function sendOffer(amount, extra = {}) {
    setActionLoading(true); setError(null)
    try {
      await api('/api/negotiations/offer', {
        body: { request_id: initialRequest.id, amount: Number(amount), expiry_hours: expiryHours, is_final: isFinal, ...extra }
      })
      await load()
      setOfferAmount(''); setCounterAmount(''); setIsFinal(false)
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function acceptOffer() {
    setActionLoading(true); setError(null)
    try {
      await api(`/api/negotiations/offer/${activeOffer.id}/accept`, { method: 'PATCH', body: {} })
      await load()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function payOffer() {
    setActionLoading(true); setError(null)
    try {
      const result = await api(`/api/negotiations/offer/${agreedOffer.id}/pay`, {
        method: 'PATCH',
        body: { payment_mode: paymentMode }
      })
      if (result.payment_url) window.open(result.payment_url, '_blank')
      await load()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function rejectOffer() {
    setActionLoading(true); setError(null)
    try {
      await api(`/api/negotiations/offer/${activeOffer.id}/reject`, { method: 'PATCH', body: {} })
      await load()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  if (loading) return <div style={s.page}><p style={s.empty}>Loading...</p></div>

  const listing = request?.listing
  const buyer = request?.buyer?.appuser
  const seller = request?.seller?.appuser

  return (
    <div style={s.page}>
      <button style={s.back} onClick={onBack}>← Back</button>

      {/* Listing summary */}
      <div style={s.section}>
        <div style={s.listingHeader}>
          <div>
            <h2 style={s.listingTitle}>{listing?.title}</h2>
            {listing?.description && <p style={s.listingDesc}>{listing.description}</p>}
          </div>
          <span style={s.listedPrice}>{Number(listing?.price || 0).toLocaleString()} SAR <span style={s.listedLabel}>listed</span></span>
        </div>
        <div style={s.parties}>
          <span>Buyer: <strong>{buyer?.name}</strong></span>
          <span>Seller: <strong>{seller?.name}</strong></span>
          <span style={{ ...s.statusPill, background: statusBg(request?.status) }}>{request?.status}</span>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Offer history */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Negotiation</h3>

        {data?.offers?.length === 0 && <p style={s.empty}>No offers yet.</p>}

        <div style={s.offerList}>
          {data?.offers?.map(o => (
            <div key={o.id} style={{ ...s.offerRow, opacity: o.outcome === 'pending' ? 1 : 0.5 }}>
              <div style={s.offerLeft}>
                <span style={s.offerWho}>{o.offered_by_role === 'seller' ? seller?.name : buyer?.name}</span>
                <span style={s.offerAmount}>{Number(o.amount).toLocaleString()} SAR</span>
                {o.is_final && <span style={s.finalTag}>Final</span>}
              </div>
              <span style={{ ...s.statusPill, background: statusBg(o.outcome) }}>{o.outcome}</span>
            </div>
          ))}
        </div>

        {/* Offer accepted — buyer picks payment method */}
        {agreedOffer?.outcome === 'accepted' && agreedOffer?.payment_mode === 'pending_buyer_choice' && isBuyer && (
          <div style={s.acceptedBox}>
            <p style={s.acceptedText}>
              Offer accepted at <strong>{Number(agreedOffer.amount).toLocaleString()} SAR</strong>. Choose how you'd like to pay:
            </p>
            <div style={{ ...s.paymentModeOptions, marginBottom: 14 }}>
              {['one_time', 'installment'].map(m => (
                <button key={m} type="button" onClick={() => setPaymentMode(m)}
                  style={paymentMode === m ? s.modeSelected : s.modeUnselected}>
                  {m === 'one_time' ? 'One-time' : 'Installments'}
                </button>
              ))}
            </div>
            <button style={s.payBtn} onClick={payOffer} disabled={actionLoading}>
              {actionLoading ? 'Creating link...' : 'Get Payment Link'}
            </button>
          </div>
        )}

        {/* Offer accepted — waiting for buyer to pay */}
        {agreedOffer?.outcome === 'accepted' && agreedOffer?.payment_mode === 'pending_buyer_choice' && !isBuyer && (
          <div style={s.acceptedBox}>
            <p style={s.acceptedText}>
              You accepted <strong>{Number(agreedOffer.amount).toLocaleString()} SAR</strong>. Waiting for the buyer to complete payment.
            </p>
          </div>
        )}

        {/* Payment link ready */}
        {agreedOffer?.outcome === 'accepted' && agreedOffer?.payment_mode !== 'pending_buyer_choice' && (
          <div style={s.acceptedBox}>
            <p style={s.acceptedText}>
              Deal at <strong>{Number(agreedOffer.amount).toLocaleString()} SAR</strong>
              {' '}· {agreedOffer.payment_mode === 'installment' ? 'Installments' : 'One-time'}
            </p>
            {agreedOffer.stream_payment_url && (
              <a href={agreedOffer.stream_payment_url} target="_blank" rel="noreferrer" style={{ ...s.payBtn, textDecoration: 'none' }}>
                Pay via Stream →
              </a>
            )}
          </div>
        )}

        {/* Pending offer — other party's turn */}
        {activeOffer && !agreedOffer && activeOffer.offered_by_role !== user.role && (
          <div style={s.actionBox}>
            <p style={s.actionPrompt}>
              Offer: <strong>{Number(activeOffer.amount).toLocaleString()} SAR</strong>
              {activeOffer.is_final ? ' (Final)' : ''}
            </p>

            {isBuyer && (
              <div style={s.paymentModeRow}>
                <span style={s.paymentModeLabel}>Payment method:</span>
                <div style={s.paymentModeOptions}>
                  {['one_time', 'installment'].map(m => (
                    <button key={m} type="button" onClick={() => setPaymentMode(m)}
                      style={paymentMode === m ? s.modeSelected : s.modeUnselected}>
                      {m === 'one_time' ? 'One-time' : 'Installments'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={s.actionBtns}>
              <button style={s.btnGreen} onClick={acceptOffer} disabled={actionLoading}>
                Accept & Get Payment Link
              </button>
              <button style={s.btnRed} onClick={rejectOffer} disabled={actionLoading}>Reject</button>
              {!activeOffer.is_final && (
                <button style={s.btnOutline} type="button" onClick={() => setShowCounter(v => !v)}>
                  {showCounter ? 'Cancel Counter' : 'Counter Offer'}
                </button>
              )}
            </div>

            {showCounter && !activeOffer.is_final && (
              <div style={s.counterRow}>
                <input style={s.counterInput} type="number" placeholder="Your counter amount (SAR)"
                  value={counterAmount} onChange={e => setCounterAmount(e.target.value)} autoFocus />
                <button style={s.btnPrimary} onClick={() => { sendOffer(counterAmount); setShowCounter(false) }}
                  disabled={actionLoading || !counterAmount}>
                  Send Counter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Waiting for other party */}
        {activeOffer && !agreedOffer && activeOffer.offered_by_role === user.role && (
          <p style={s.waiting}>Offer sent — waiting for response.</p>
        )}

        {/* Seller: send first offer */}
        {!isBuyer && !activeOffer && !agreedOffer && request?.status !== 'paid' && (
          <div style={s.offerForm}>
            <p style={s.offerFormTitle}>Send Offer</p>
            <div style={s.offerFormRow}>
              <input style={s.input} type="number" placeholder="Amount (SAR)" value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)} />
              <select style={s.input} value={expiryHours} onChange={e => setExpiryHours(e.target.value)}>
                <option value="12">Expires in 12h</option>
                <option value="24">Expires in 24h</option>
                <option value="48">Expires in 48h</option>
                <option value="72">Expires in 72h</option>
              </select>
            </div>
            <label style={s.checkLabel}>
              <input type="checkbox" checked={isFinal} onChange={e => setIsFinal(e.target.checked)} />
              Mark as Final Offer
            </label>
            <button style={s.btnPrimary} onClick={() => sendOffer(offerAmount)} disabled={actionLoading || !offerAmount}>
              {actionLoading ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function statusBg(status) {
  return { pending: '#fff3e0', active: '#e3f2fd', paid: '#e8f5e9', accepted: '#e8f5e9', rejected: '#fce8e6', countered: '#f3e5f5', cancelled: '#f5f5f5' }[status] || '#f5f5f5'
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  back: { background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'block' },
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16, maxWidth: 660 },
  listingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  listingTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  listingDesc: { margin: '4px 0 0', fontSize: 13, color: '#666' },
  listedPrice: { fontSize: 20, fontWeight: 700, color: '#1a73e8', flexShrink: 0, marginLeft: 16 },
  listedLabel: { fontSize: 12, fontWeight: 400, color: '#aaa' },
  parties: { display: 'flex', gap: 16, fontSize: 13, color: '#555', alignItems: 'center', flexWrap: 'wrap' },
  statusPill: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: '#333' },
  errorBox: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 12, maxWidth: 660 },
  sectionTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 700 },
  empty: { color: '#999', fontSize: 14, textAlign: 'center', padding: '20px 0' },
  offerList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  offerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', borderRadius: 8, padding: '10px 14px' },
  offerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  offerWho: { fontSize: 12, color: '#888' },
  offerAmount: { fontWeight: 700, fontSize: 16, color: '#1a1a1a' },
  finalTag: { fontSize: 11, background: '#fff3e0', color: '#e65100', padding: '2px 6px', borderRadius: 8 },
  acceptedBox: { background: '#e8f5e9', borderRadius: 10, padding: 16, textAlign: 'center' },
  acceptedText: { margin: '0 0 12px', fontSize: 15 },
  payBtn: { display: 'inline-block', background: '#34a853', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14, border: 'none', cursor: 'pointer' },
  actionBox: { background: '#f8f9fa', borderRadius: 10, padding: 16 },
  actionPrompt: { margin: '0 0 12px', fontSize: 14 },
  paymentModeRow: { marginBottom: 14 },
  paymentModeLabel: { fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 },
  paymentModeOptions: { display: 'flex', gap: 8 },
  modeSelected: { flex: 1, padding: '9px 0', borderRadius: 8, border: '2px solid #1a73e8', background: '#e8f0fe', color: '#1a73e8', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  modeUnselected: { flex: 1, padding: '9px 0', borderRadius: 8, border: '2px solid #ddd', background: '#fff', color: '#666', fontWeight: 500, fontSize: 13, cursor: 'pointer' },
  actionBtns: { display: 'flex', gap: 10, marginBottom: 12 },
  counterRow: { display: 'flex', gap: 10 },
  counterInput: { flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  waiting: { color: '#888', fontSize: 14, textAlign: 'center', padding: '12px 0' },
  offerForm: { background: '#f8f9fa', borderRadius: 10, padding: 16 },
  offerFormTitle: { margin: '0 0 12px', fontWeight: 600, fontSize: 14 },
  offerFormRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', marginBottom: 10 },
  btnPrimary: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnOutline: { padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#444', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnGreen: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#34a853', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnRed: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
}

import { useState, useEffect } from 'react'
import { api } from '../api'

export default function ProjectView({ project: initialProject, user, onBack, onFindProvider }) {
  const [project, setProject] = useState(initialProject)
  const [requestData, setRequestData] = useState(null) // { request, offers, files }
  const [loading, setLoading] = useState(true)
  const [offerForm, setOfferForm] = useState({ amount: '', expiry_hours: '24', is_final: false })
  const [paymentMode, setPaymentMode] = useState('one_time') // buyer chooses this at accept time
  const [counterAmount, setCounterAmount] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const isBuyer = user.role === 'buyer'

  async function loadRequest() {
    try {
      // Find active request for this project
      const requests = await api(`/api/negotiations/requests`)
      const active = requests.find(r => r.project_id === project.id && r.status !== 'cancelled')
      if (active) {
        const detail = await api(`/api/negotiations/requests/${active.id}`)
        setRequestData(detail)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequest() }, [project.id])

  const activeOffer = requestData?.offers?.findLast(o => o.status === 'pending')
  const acceptedOffer = requestData?.offers?.find(o => o.status === 'accepted')
  const request = requestData?.request

  async function sendOffer() {
    setActionLoading(true); setError(null)
    try {
      await api('/api/negotiations/offer', {
        body: { request_id: request.id, amount: Number(offerForm.amount), expiry_hours: offerForm.expiry_hours, is_final: offerForm.is_final }
      })
      await loadRequest()
      setOfferForm({ amount: '', payment_mode: 'one_time', expiry_hours: '24', is_final: false })
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function sendCounter() {
    setActionLoading(true); setError(null)
    try {
      await api('/api/negotiations/offer', {
        body: { request_id: request.id, amount: Number(counterAmount), payment_mode: activeOffer.payment_mode, expiry_hours: 24 }
      })
      await loadRequest()
      setCounterAmount('')
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function acceptOffer() {
    setActionLoading(true); setError(null)
    try {
      const result = await api(`/api/negotiations/offer/${activeOffer.id}/accept`, {
        method: 'PATCH',
        body: { payment_mode: paymentMode }
      })
      if (result.payment_url) window.open(result.payment_url, '_blank')
      await loadRequest()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function rejectOffer() {
    setActionLoading(true); setError(null)
    try {
      await api(`/api/negotiations/offer/${activeOffer.id}/reject`, { method: 'PATCH', body: {} })
      await loadRequest()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function uploadDeliverable() {
    if (!uploadFile) return
    setActionLoading(true); setError(null)
    try {
      const body = new FormData()
      body.append('file', uploadFile)
      await api(`/api/negotiations/files/${request.id}`, { body })
      await loadRequest()
      setUploadFile(null)
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  async function completeStage() {
    setActionLoading(true); setError(null)
    try {
      const result = await api(`/api/negotiations/requests/${request.id}/complete`, { method: 'PATCH', body: {} })
      setProject(p => ({ ...p, stage: result.next_stage }))
      setRequestData(null)
      await loadRequest()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(false) }
  }

  const stageLabel = { design: 'Design Stage', contractor: 'Contractor Stage', complete: 'Complete' }
  const stageColor = { design: '#1a73e8', contractor: '#f57c00', complete: '#34a853' }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.back} onClick={onBack}>← My Projects</button>
        <div style={s.headerInfo}>
          <h2 style={s.title}>{project.title}</h2>
          <span style={{ ...s.stageBadge, background: stageColor[project.stage] }}>
            {stageLabel[project.stage]}
          </span>
        </div>
        <div style={s.meta}>
          <span>📍 {project.location}</span>
          <span>📐 {project.land_size} m²</span>
          <span>💰 {Number(project.budget).toLocaleString()} SAR</span>
          <span>🏠 {project.floors} floor{project.floors > 1 ? 's' : ''} · {project.rooms} rooms</span>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <p style={s.empty}>Loading...</p>
      ) : !request ? (
        // No active request yet
        <div style={s.emptyCard}>
          <p style={s.emptyText}>
            {project.stage === 'complete'
              ? 'Project complete.'
              : `No active ${project.stage === 'design' ? 'engineering office' : 'contractor'} yet.`}
          </p>
          {project.stage !== 'complete' && isBuyer && (
            <button style={s.btnPrimary} onClick={() => onFindProvider(project)}>
              Find {project.stage === 'design' ? 'Engineering Office' : 'Contractor'}
            </button>
          )}
        </div>
      ) : (
        <div style={s.body}>

          {/* Request info */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Active Request</h3>
            <div style={s.infoRow}>
              <span style={s.infoKey}>{isBuyer ? 'Provider' : 'Homeowner'}</span>
              <span>{isBuyer ? request.sellers?.name : request.buyers?.name}</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoKey}>Status</span>
              <span style={{ ...s.statusPill, background: statusColor(request.status) }}>{request.status}</span>
            </div>
          </div>

          {/* Negotiation */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Negotiation</h3>

            {/* Offer history */}
            {requestData.offers.length > 0 && (
              <div style={s.offerHistory}>
                {requestData.offers.map((o) => (
                  <div key={o.id} style={{ ...s.offerRow, opacity: o.status === 'pending' ? 1 : 0.55 }}>
                    <div style={{ flex: 1 }}>
                      <div style={s.offerTop}>
                        <span style={s.offerWho}>{o.offered_by_role === 'seller' ? request.sellers?.name : request.buyers?.name}</span>
                        <span style={s.offerAmount}>{Number(o.amount).toLocaleString()} SAR</span>
                        <span style={s.offerMode}>{o.payment_mode === 'installment' ? 'Installment' : 'One-time'}</span>
                        {o.is_final && <span style={s.finalTag}>Final Offer</span>}
                        <span style={{ ...s.statusPill, background: statusColor(o.status) }}>{o.status}</span>
                      </div>
                      {/* Stream payment link shown on the offer itself */}
                      {o.stream_payment_url && o.status === 'pending' && (
                        <div style={s.streamLinkRow}>
                          <span style={s.streamLabel}>Stream Payment Link:</span>
                          <a href={o.stream_payment_url} target="_blank" rel="noreferrer" style={s.streamLink}>
                            Pay {Number(o.amount).toLocaleString()} SAR via Stream →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Accepted offer */}
            {acceptedOffer && (
              <div style={s.acceptedBox}>
                <p style={s.acceptedText}>
                  Deal agreed at <strong>{Number(acceptedOffer.amount).toLocaleString()} SAR</strong>
                  {' '}({acceptedOffer.payment_mode === 'installment' ? 'Installment' : 'One-time'})
                </p>
                {acceptedOffer.stream_payment_url && (
                  <a href={acceptedOffer.stream_payment_url} target="_blank" rel="noreferrer" style={s.payBtn}>
                    Pay via Stream
                  </a>
                )}
              </div>
            )}

            {/* Pending offer actions */}
            {activeOffer && !acceptedOffer && (
              <div style={s.actionBox}>
                {/* The other party made an offer — current user can act */}
                {activeOffer.offered_by_role !== user.role && (
                  <>
                    <p style={s.actionPrompt}>
                      Offer received: <strong>{Number(activeOffer.amount).toLocaleString()} SAR</strong>
                      {activeOffer.is_final ? ' (Final — accept or reject only)' : ''}
                    </p>

                    {/* Buyer chooses payment mode before accepting */}
                    {isBuyer && (
                      <div style={s.paymentModeRow}>
                        <span style={s.paymentModeLabel}>How would you like to pay?</span>
                        <div style={s.paymentModeOptions}>
                          {['one_time', 'installment'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setPaymentMode(mode)}
                              style={paymentMode === mode ? s.modeSelected : s.modeUnselected}
                            >
                              {mode === 'one_time' ? 'One-time Payment' : 'Installments'}
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
                    </div>
                    {!activeOffer.is_final && (
                      <div style={s.counterRow}>
                        <input
                          style={s.counterInput}
                          type="number"
                          placeholder="Counter amount (SAR)"
                          value={counterAmount}
                          onChange={e => setCounterAmount(e.target.value)}
                        />
                        <button style={s.btnPrimary} onClick={sendCounter} disabled={actionLoading || !counterAmount}>
                          Counter
                        </button>
                      </div>
                    )}
                  </>
                )}
                {/* Current user already made an offer — waiting */}
                {activeOffer.offered_by_role === user.role && (
                  <p style={s.waiting}>Offer sent — waiting for response.</p>
                )}
              </div>
            )}

            {/* Seller: send first offer if no pending one */}
            {!isBuyer && !activeOffer && !acceptedOffer && (
              <div style={s.offerForm}>
                <p style={s.offerFormTitle}>Send Offer</p>
                <div style={s.offerFormRow}>
                  <input style={s.input} type="number" placeholder="Amount (SAR)" value={offerForm.amount}
                    onChange={e => setOfferForm(f => ({ ...f, amount: e.target.value }))} />
                  <select style={s.input} value={offerForm.expiry_hours}
                    onChange={e => setOfferForm(f => ({ ...f, expiry_hours: e.target.value }))}>
                    <option value="12">Expires in 12h</option>
                    <option value="24">Expires in 24h</option>
                    <option value="48">Expires in 48h</option>
                    <option value="72">Expires in 72h</option>
                  </select>
                </div>
                <label style={s.checkLabel}>
                  <input type="checkbox" checked={offerForm.is_final}
                    onChange={e => setOfferForm(f => ({ ...f, is_final: e.target.checked }))} />
                  Mark as Final Offer
                </label>
                <button style={s.btnPrimary} onClick={sendOffer} disabled={actionLoading || !offerForm.amount}>
                  {actionLoading ? 'Sending...' : 'Send Offer'}
                </button>
              </div>
            )}
          </div>

          {/* Document Vault */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Document Vault</h3>

            {requestData.files.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>No files uploaded yet.</p>
            ) : (
              <div style={s.fileList}>
                {requestData.files.map(f => (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" style={s.fileRow}>
                    📄 {f.file_name}
                    <span style={s.fileDate}>{new Date(f.created_at).toLocaleDateString()}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Provider: upload deliverable after payment */}
            {!isBuyer && request.status === 'paid' && (
              <div style={s.uploadRow}>
                <label style={s.fileLabel}>
                  {uploadFile ? uploadFile.name : 'Upload deliverable'}
                  <input type="file" onChange={e => setUploadFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
                <button style={s.btnPrimary} onClick={uploadDeliverable} disabled={actionLoading || !uploadFile}>
                  {actionLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            )}

            {/* Homeowner: approve deliverable */}
            {isBuyer && requestData.files.length > 0 && request.status === 'paid' && (
              <button style={{ ...s.btnGreen, marginTop: 12 }} onClick={completeStage} disabled={actionLoading}>
                Approve Deliverable & Advance Stage
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

function statusColor(status) {
  return { pending: '#fff3e0', active: '#e3f2fd', paid: '#e8f5e9', complete: '#34a853', rejected: '#fce8e6', countered: '#f3e5f5', accepted: '#e8f5e9', expired: '#f5f5f5' }[status] || '#f5f5f5'
}

const s = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: 24, fontFamily: "'Segoe UI', sans-serif" },
  header: { marginBottom: 24 },
  back: { background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  stageBadge: { color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  meta: { display: 'flex', gap: 20, fontSize: 13, color: '#666', flexWrap: 'wrap' },
  errorBox: { background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 16 },
  empty: { color: '#999', textAlign: 'center', marginTop: 60 },
  emptyCard: { background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  emptyText: { color: '#666', marginBottom: 16 },
  body: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 },
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  sectionTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1a1a1a' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 },
  infoKey: { color: '#888', fontWeight: 600 },
  statusPill: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: '#333' },
  offerHistory: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  offerRow: { background: '#fafafa', borderRadius: 8, padding: '10px 14px' },
  offerTop: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  offerWho: { fontSize: 12, color: '#888' },
  offerAmount: { fontWeight: 700, fontSize: 15, color: '#1a1a1a' },
  offerMode: { fontSize: 12, color: '#555' },
  finalTag: { fontSize: 11, background: '#fff3e0', color: '#e65100', padding: '2px 6px', borderRadius: 8 },
  streamLinkRow: { marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 },
  streamLabel: { fontSize: 12, color: '#888' },
  streamLink: { fontSize: 13, fontWeight: 600, color: '#1a73e8', textDecoration: 'none', background: '#e8f0fe', padding: '4px 10px', borderRadius: 6 },
  acceptedBox: { background: '#e8f5e9', borderRadius: 10, padding: 16, textAlign: 'center' },
  acceptedText: { margin: '0 0 12px', fontSize: 15 },
  payBtn: { display: 'inline-block', background: '#34a853', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14 },
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
  waiting: { color: '#888', fontSize: 14, textAlign: 'center' },
  offerForm: { background: '#f8f9fa', borderRadius: 10, padding: 16 },
  offerFormTitle: { margin: '0 0 12px', fontWeight: 600, fontSize: 14 },
  offerFormRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555' },
  fileList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  fileRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, textDecoration: 'none', color: '#1a73e8', fontSize: 14 },
  fileDate: { color: '#aaa', fontSize: 12 },
  uploadRow: { display: 'flex', gap: 10, marginTop: 12 },
  fileLabel: { flex: 1, display: 'block', padding: '9px 12px', borderRadius: 8, border: '1.5px dashed #ccc', fontSize: 13, color: '#555', cursor: 'pointer', textAlign: 'center' },
  btnPrimary: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnGreen: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#34a853', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnRed: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
}

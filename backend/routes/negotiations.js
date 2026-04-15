const express = require('express')
const multer = require('multer')
const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')
const userAuth = require('../middleware/userAuth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const base64Token = Buffer.from(
  `${process.env.STREAM_API_KEY}:${process.env.STREAM_API_SECRET}`
).toString('base64')
const streamHeaders = { 'x-api-key': base64Token, 'Content-Type': 'application/json' }

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// ── REQUESTS ─────────────────────────────────────────────────────────────────

// POST /api/negotiations/requests — homeowner sends request to provider
router.post('/requests', userAuth, async (req, res) => {
  const { project_id, seller_id } = req.body
  if (!project_id || !seller_id) {
    return res.status(400).json({ message: 'project_id and seller_id are required.' })
  }

  // Get project to know the stage
  const { data: project } = await supabase.from('projects').select('stage').eq('id', project_id).single()
  if (!project) return res.status(404).json({ message: 'Project not found.' })

  // Check no active request already exists for this project+stage
  const { data: existing } = await supabase
    .from('requests')
    .select('id')
    .eq('project_id', project_id)
    .eq('stage', project.stage)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) {
    return res.status(409).json({ message: 'An active request already exists for this stage.' })
  }

  const { data: request, error } = await supabase
    .from('requests')
    .insert({ project_id, buyer_id: req.userId, seller_id, stage: project.stage })
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json(request)
})

// GET /api/negotiations/requests — list requests for current user
router.get('/requests', userAuth, async (req, res) => {
  let query = supabase
    .from('requests')
    .select(`*, projects(id, title, location, stage, budget), buyers(name, email), sellers(name, email, provider_type)`)
    .order('created_at', { ascending: false })

  if (req.userRole === 'buyer') {
    query = query.eq('buyer_id', req.userId)
  } else {
    query = query.eq('seller_id', req.userId)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// GET /api/negotiations/requests/:requestId — get request + full negotiation history
router.get('/requests/:requestId', userAuth, async (req, res) => {
  const { data: request, error } = await supabase
    .from('requests')
    .select(`*, projects(*), buyers(name, email, phone), sellers(name, email, phone, provider_type)`)
    .eq('id', req.params.requestId)
    .single()

  if (error || !request) return res.status(404).json({ message: 'Request not found.' })

  // Get negotiation history
  const { data: offers } = await supabase
    .from('negotiations')
    .select('*')
    .eq('request_id', req.params.requestId)
    .order('created_at', { ascending: true })

  // Get project files for this request
  const { data: files } = await supabase
    .from('project_files')
    .select('*')
    .eq('request_id', req.params.requestId)
    .order('created_at', { ascending: false })

  res.json({ request, offers: offers || [], files: files || [] })
})

// ── OFFERS ────────────────────────────────────────────────────────────────────

// POST /api/negotiations/offer — create a new offer or counteroffer
// Stream payment link is generated immediately so it's part of the offer, not an afterthought
router.post('/offer', userAuth, async (req, res) => {
  const { request_id, amount, payment_mode, expiry_hours, is_final } = req.body

  if (!request_id || !amount) {
    return res.status(400).json({ message: 'request_id and amount are required.' })
  }

  // Mark any existing pending offer as 'countered'
  await supabase
    .from('negotiations')
    .update({ status: 'countered' })
    .eq('request_id', request_id)
    .eq('status', 'pending')

  const expires_at = expiry_hours
    ? new Date(Date.now() + Number(expiry_hours) * 3600 * 1000).toISOString()
    : null

  const { data: offer, error } = await supabase
    .from('negotiations')
    .insert({
      request_id,
      offered_by: req.userId,
      offered_by_role: req.userRole,
      amount: Number(amount),
      payment_mode: 'pending_buyer_choice', // buyer picks this at acceptance time
      expires_at,
      is_final: !!is_final,
      status: 'pending'
    })
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })

  // Mark request as active
  await supabase.from('requests').update({ status: 'active' }).eq('id', request_id)

  res.status(201).json(offer)
})

// PATCH /api/negotiations/offer/:id/accept — buyer accepts + chooses payment mode → Stream link generated
router.patch('/offer/:id/accept', userAuth, async (req, res) => {
  const { payment_mode } = req.body // 'one_time' | 'installment' — buyer's choice

  if (!payment_mode) {
    return res.status(400).json({ message: 'payment_mode is required (one_time or installment).' })
  }

  const { data: offer } = await supabase
    .from('negotiations')
    .select('*, requests(id, project_id)')
    .eq('id', req.params.id)
    .single()

  if (!offer) return res.status(404).json({ message: 'Offer not found.' })
  if (offer.status !== 'pending') return res.status(400).json({ message: 'This offer is no longer active.' })

  // Buyer chose their payment mode — create a deal-specific product then generate the Stream link
  let streamUrl = null
  try {
    // 1. Create a product priced at the negotiated amount
    const productRes = await axios.post(
      'https://stream-app-service.streampay.sa/api/v2/products',
      {
        name: `Project Payment – ${Number(offer.amount).toLocaleString()} SAR`,
        description: `Agreed service payment (${payment_mode === 'installment' ? 'Installment' : 'One-time'})`,
        price: Number(offer.amount),
        currency: 'SAR'
      },
      { headers: streamHeaders }
    )
    const productId = productRes.data.id

    // 2. Create the payment link using the freshly created product
    const streamRes = await axios.post(
      'https://stream-app-service.streampay.sa/api/v2/payment_links',
      {
        name: `Project Payment – ${Number(offer.amount).toLocaleString()} SAR`,
        description: `Agreed service payment (${payment_mode === 'installment' ? 'Installment' : 'One-time'})`,
        items: [{ product_id: productId, quantity: 1 }],
        contact_information_type: 'PHONE',
        currency: 'SAR',
        max_number_of_payments: payment_mode === 'installment' ? 6 : 1,
        organization_consumer_id: process.env.STREAM_CONSUMER_ID,
        success_redirect_url: 'http://localhost:5173/success',
        failure_redirect_url: 'http://localhost:5173/failure'
      },
      { headers: streamHeaders }
    )
    streamUrl = streamRes.data.url

    // 3. Delete the temporary product — the link already has it baked in
    await axios.delete(
      `https://stream-app-service.streampay.sa/api/v2/products/${productId}`,
      { headers: streamHeaders }
    ).catch(() => {}) // non-fatal if delete fails
  } catch (err) {
    console.error('Stream error:', JSON.stringify(err.response?.data || err.message, null, 2))
  }

  const { data: updated } = await supabase
    .from('negotiations')
    .update({ status: 'accepted', payment_mode, stream_payment_url: streamUrl })
    .eq('id', req.params.id)
    .select()
    .single()

  await supabase.from('requests').update({ status: 'paid' }).eq('id', offer.requests.id)

  res.json({ offer: updated, payment_url: streamUrl })
})

// PATCH /api/negotiations/offer/:id/reject
router.patch('/offer/:id/reject', userAuth, async (req, res) => {
  const { data: updated } = await supabase
    .from('negotiations')
    .update({ status: 'rejected' })
    .eq('id', req.params.id)
    .select()
    .single()

  res.json(updated)
})

// ── FILE UPLOAD ───────────────────────────────────────────────────────────────

// POST /api/negotiations/files/:requestId — provider uploads deliverable
router.post('/files/:requestId', userAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File is required.' })

  const { data: request } = await supabase
    .from('requests')
    .select('project_id, stage')
    .eq('id', req.params.requestId)
    .single()

  if (!request) return res.status(404).json({ message: 'Request not found.' })

  const fileName = `deliverable_${Date.now()}_${req.file.originalname}`
  const { data: storageData, error: storageError } = await supabase.storage
    .from('certificates')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype })

  if (storageError) return res.status(500).json({ message: 'Failed to upload file.' })

  const { data: { publicUrl } } = supabase.storage
    .from('certificates')
    .getPublicUrl(storageData.path)

  const { data: fileRecord, error } = await supabase
    .from('project_files')
    .insert({
      project_id: request.project_id,
      request_id: req.params.requestId,
      uploaded_by: req.userId,
      uploaded_by_role: req.userRole,
      file_name: req.file.originalname,
      file_url: publicUrl,
      file_type: 'deliverable',
      stage: request.stage
    })
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json(fileRecord)
})

// PATCH /api/negotiations/requests/:requestId/complete — homeowner approves deliverable
router.patch('/requests/:requestId/complete', userAuth, async (req, res) => {
  const { data: request } = await supabase
    .from('requests')
    .update({ status: 'complete' })
    .eq('id', req.params.requestId)
    .select('project_id, stage')
    .single()

  if (!request) return res.status(404).json({ message: 'Request not found.' })

  // If design stage complete → advance project to contractor stage
  if (request.stage === 'design') {
    await supabase.from('projects').update({ stage: 'contractor' }).eq('id', request.project_id)
  }

  res.json({ message: 'Stage complete.', next_stage: request.stage === 'design' ? 'contractor' : 'complete' })
})

module.exports = router

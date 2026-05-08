const express = require('express')
const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')
const userAuth = require('../middleware/userAuth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const streamHeaders = { 'x-api-key': process.env.x_api_key, 'Content-Type': 'application/json' }

// ── REQUESTS ──────────────────────────────────────────────────────────────────

// POST /api/negotiations/requests — buyer sends a request on a listing, optionally with an initial offer
router.post('/requests', userAuth, async (req, res) => {
  if (req.userRole !== 'buyer') return res.status(403).json({ message: 'Only buyers can send requests.' })

  const { listing_id, amount, expiry_hours } = req.body
  if (!listing_id) return res.status(400).json({ message: 'listing_id is required.' })

  const { data: listing } = await supabase
    .from('listing')
    .select('id, seller_id, status')
    .eq('id', listing_id)
    .single()

  if (!listing) return res.status(404).json({ message: 'Listing not found.' })
  if (listing.status !== 'active') return res.status(400).json({ message: 'This listing is no longer available.' })

  const { data: existing } = await supabase
    .from('request')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('buyer_id', req.userId)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) return res.status(409).json({ message: 'You already have an active request for this listing.' })

  const { data: request, error } = await supabase
    .from('request')
    .insert({ listing_id, buyer_id: req.userId, seller_id: listing.seller_id })
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })

  if (amount) {
    const expires_at = expiry_hours
      ? new Date(Date.now() + Number(expiry_hours) * 3600 * 1000).toISOString()
      : null
    await supabase.from('negotiation').insert({
      request_id: request.id,
      offered_by: req.userId,
      offered_by_role: 'buyer',
      amount: Number(amount),
      expires_at,
      outcome: 'pending'
    })
    await supabase.from('request').update({ status: 'active' }).eq('id', request.id)
  }

  res.status(201).json(request)
})

// GET /api/negotiations/requests — list requests for current user
router.get('/requests', userAuth, async (req, res) => {
  let query = supabase
    .from('request')
    .select('*, listing(id, title, price, description), buyer(appuser(id, name, email)), seller(appuser(id, name, email))')
    .order('created_at', { ascending: false })

  if (req.userRole === 'buyer') {
    query = query.eq('buyer_id', req.userId)
  } else {
    query = query.eq('seller_id', req.userId)
  }

  const { data: requests, error } = await query
  if (error) return res.status(500).json({ message: error.message })

  if (requests.length === 0) return res.json([])

  const requestIds = requests.map(r => r.id)
  const { data: negotiations } = await supabase
    .from('negotiation')
    .select('id, request_id, amount, outcome, offered_by_role, created_at')
    .in('request_id', requestIds)
    .order('created_at', { ascending: true })

  const negsByRequest = {}
  for (const n of negotiations || []) {
    if (!negsByRequest[n.request_id]) negsByRequest[n.request_id] = []
    negsByRequest[n.request_id].push(n)
  }

  res.json(requests.map(r => ({ ...r, negotiation: negsByRequest[r.id] || [] })))
})

// GET /api/negotiations/requests/:requestId — request detail + offer history
router.get('/requests/:requestId', userAuth, async (req, res) => {
  const { data: request, error } = await supabase
    .from('request')
    .select('*, listing(*), buyer(appuser(id, name, email, phone_number)), seller(appuser(id, name, email, phone_number))')
    .eq('id', req.params.requestId)
    .single()

  if (error || !request) return res.status(404).json({ message: 'Request not found.' })

  const { data: offers } = await supabase
    .from('negotiation')
    .select('*')
    .eq('request_id', req.params.requestId)
    .order('created_at', { ascending: true })

  res.json({ request, offers: offers || [] })
})

// ── OFFERS ────────────────────────────────────────────────────────────────────

// POST /api/negotiations/offer — create an offer or counteroffer
router.post('/offer', userAuth, async (req, res) => {
  const { request_id, amount, expiry_hours, is_final } = req.body
  if (!request_id || !amount) return res.status(400).json({ message: 'request_id and amount are required.' })

  await supabase
    .from('negotiation')
    .update({ outcome: 'countered' })
    .eq('request_id', request_id)
    .eq('outcome', 'pending')

  const expires_at = expiry_hours
    ? new Date(Date.now() + Number(expiry_hours) * 3600 * 1000).toISOString()
    : null

  const { data: offer, error } = await supabase
    .from('negotiation')
    .insert({
      request_id,
      offered_by: req.userId,
      offered_by_role: req.userRole,
      amount: Number(amount),
      expires_at,
      is_final: !!is_final,
      outcome: 'pending'
    })
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })

  await supabase.from('request').update({ status: 'active' }).eq('id', request_id)

  res.status(201).json(offer)
})

// PATCH /api/negotiations/offer/:id/accept — either party accepts the other's offer
router.patch('/offer/:id/accept', userAuth, async (req, res) => {
  const { data: offer } = await supabase
    .from('negotiation')
    .select('*, request(id, listing_id)')
    .eq('id', req.params.id)
    .single()

  if (!offer) return res.status(404).json({ message: 'Offer not found.' })
  if (offer.outcome !== 'pending') return res.status(400).json({ message: 'This offer is no longer active.' })
  if (offer.offered_by_role === req.userRole) return res.status(400).json({ message: "You can't accept your own offer." })

  // Block if the listing already has an accepted deal from a different request
  const { data: sibling } = await supabase
    .from('request')
    .select('id')
    .eq('listing_id', offer.request.listing_id)
    .neq('id', offer.request.id)

  if (sibling?.length > 0) {
    const { data: existingDeal } = await supabase
      .from('negotiation')
      .select('id')
      .in('request_id', sibling.map(r => r.id))
      .eq('outcome', 'accepted')
      .maybeSingle()

    if (existingDeal) {
      return res.status(409).json({ message: 'This listing already has an accepted deal from another buyer.' })
    }
  }

  const { data: updated } = await supabase
    .from('negotiation')
    .update({ outcome: 'accepted' })
    .eq('id', req.params.id)
    .select()
    .single()

  await supabase.from('request').update({ status: 'active' }).eq('id', offer.request.id)

  res.json(updated)
})

// PATCH /api/negotiations/offer/:id/pay — buyer chooses payment mode and creates Stream product + link
router.patch('/offer/:id/pay', userAuth, async (req, res) => {
  if (req.userRole !== 'buyer') return res.status(403).json({ message: 'Only the buyer completes payment.' })

  const { payment_mode } = req.body
  if (!payment_mode) return res.status(400).json({ message: 'payment_mode is required (one_time or installment).' })

  const { data: offer } = await supabase
    .from('negotiation')
    .select('*, request(id, listing_id)')
    .eq('id', req.params.id)
    .single()

  if (!offer) return res.status(404).json({ message: 'Offer not found.' })
  if (offer.outcome !== 'accepted' || offer.payment_mode !== 'pending_buyer_choice') {
    return res.status(400).json({ message: 'Offer has not been accepted yet or payment already initiated.' })
  }

  const { data: listing } = await supabase
    .from('listing')
    .select('title')
    .eq('id', offer.request.listing_id)
    .single()

  const itemName = listing?.title || 'Item'
  const installment = payment_mode === 'installment'

  let productRes
  try {
    productRes = await axios.post(
      'https://stream-app-service.streampay.sa/api/v2/products',
      {
        name: `${itemName} – ${Number(offer.amount).toLocaleString()} SAR`,
        description: `Payment (${installment ? 'Installment' : 'One-time'})`,
        price: Number(offer.amount),
        currency: 'SAR',
        type: 'ONE_OFF'
      },
      { headers: streamHeaders }
    )
  } catch (err) {
    const detail = err.response?.data || err.message
    console.error('Stream create product error:', JSON.stringify(detail, null, 2))
    return res.status(502).json({ message: 'Failed to create Stream product.', detail })
  }

  const productId = productRes.data.id

  let streamUrl = null
  try {
    const linkRes = await axios.post(
      'https://stream-app-service.streampay.sa/api/v2/payment_links',
      {
        name: `${itemName} – ${Number(offer.amount).toLocaleString()} SAR`,
        description: `Payment (${installment ? 'Installment' : 'One-time'})`,
        items: [{ product_id: productId, quantity: 1 }],
        contact_information_type: 'PHONE',
        currency: 'SAR',
        max_number_of_payments: 1,
        ...(installment ? { payment_methods: { installment: true } } : {}),
        organization_consumer_id: process.env.STREAM_CONSUMER_ID,
        success_redirect_url: 'http://localhost:5173/success',
        failure_redirect_url: 'http://localhost:5173/failure'
      },
      { headers: streamHeaders }
    )
    streamUrl = linkRes.data.url
  } catch (err) {
    const detail = err.response?.data || err.message
    console.error('Stream create payment link error:', JSON.stringify(detail, null, 2))
    return res.status(502).json({ message: 'Failed to create Stream payment link.', detail })
  }

  const { data: updated } = await supabase
    .from('negotiation')
    .update({ payment_mode, stream_payment_url: streamUrl })
    .eq('id', req.params.id)
    .select()
    .single()

  await supabase.from('request').update({ status: 'awaiting_payment' }).eq('id', offer.request.id)

  res.json({ offer: updated, payment_url: streamUrl })
})

// PATCH /api/negotiations/offer/:id/confirm-payment — buyer confirms payment was completed
router.patch('/offer/:id/confirm-payment', userAuth, async (req, res) => {
  if (req.userRole !== 'buyer') return res.status(403).json({ message: 'Only the buyer can confirm payment.' })

  const { data: offer } = await supabase
    .from('negotiation')
    .select('*, request(id, listing_id, status)')
    .eq('id', req.params.id)
    .single()

  if (!offer) return res.status(404).json({ message: 'Offer not found.' })
  if (offer.request.status !== 'awaiting_payment') {
    return res.status(400).json({ message: 'Payment has not been initiated or is already confirmed.' })
  }

  await supabase.from('request').update({ status: 'paid' }).eq('id', offer.request.id)
  await supabase.from('listing').update({ status: 'sold' }).eq('id', offer.request.listing_id)

  res.json({ success: true })
})

// PATCH /api/negotiations/offer/:id/reject
router.patch('/offer/:id/reject', userAuth, async (req, res) => {
  const { data: updated } = await supabase
    .from('negotiation')
    .update({ outcome: 'rejected' })
    .eq('id', req.params.id)
    .select()
    .single()

  res.json(updated)
})

module.exports = router

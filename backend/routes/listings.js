const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const userAuth = require('../middleware/userAuth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// GET /api/listings — browse all active listings
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('listing')
    .select('*, seller(appuser(id, name, email, phone_number))')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// GET /api/listings/mine — seller's own listings
router.get('/mine', userAuth, async (req, res) => {
  if (req.userRole !== 'seller') return res.status(403).json({ message: 'Only sellers have listings.' })

  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .eq('seller_id', req.userId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('listing')
    .select('*, seller(appuser(id, name, email, phone_number))')
    .eq('id', req.params.id)
    .single()

  if (error || !data) return res.status(404).json({ message: 'Listing not found.' })
  res.json(data)
})

// POST /api/listings — seller creates a listing
router.post('/', userAuth, async (req, res) => {
  if (req.userRole !== 'seller') return res.status(403).json({ message: 'Only sellers can create listings.' })

  const { title, description, price } = req.body
  if (!title || !price) return res.status(400).json({ message: 'title and price are required.' })

  const { data, error } = await supabase
    .from('listing')
    .insert({ seller_id: req.userId, title, description, price: Number(price) })
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json(data)
})

// PATCH /api/listings/:id — seller updates their listing
router.patch('/:id', userAuth, async (req, res) => {
  if (req.userRole !== 'seller') return res.status(403).json({ message: 'Only sellers can update listings.' })

  const { title, description, price, status } = req.body

  const { data: existing } = await supabase
    .from('listing')
    .select('seller_id')
    .eq('id', req.params.id)
    .single()

  if (!existing) return res.status(404).json({ message: 'Listing not found.' })
  if (existing.seller_id !== req.userId) return res.status(403).json({ message: 'Not your listing.' })

  const updates = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (price !== undefined) updates.price = Number(price)
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('listing')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// DELETE /api/listings/:id — seller removes their listing
router.delete('/:id', userAuth, async (req, res) => {
  if (req.userRole !== 'seller') return res.status(403).json({ message: 'Only sellers can delete listings.' })

  const { data: existing } = await supabase
    .from('listing')
    .select('seller_id')
    .eq('id', req.params.id)
    .single()

  if (!existing) return res.status(404).json({ message: 'Listing not found.' })
  if (existing.seller_id !== req.userId) return res.status(403).json({ message: 'Not your listing.' })

  const { error } = await supabase.from('listing').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ message: error.message })
  res.status(204).send()
})

module.exports = router

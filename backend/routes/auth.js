const express = require('express')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ── BUYER ─────────────────────────────────────────────────────────────────────

router.post('/signup/buyer', async (req, res) => {
  const { name, email, phone, password } = req.body
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'name, email, phone, and password are required.' })
  }

  const hashed_password = await bcrypt.hash(password, 10)

  const { data: user, error } = await supabase
    .from('appuser')
    .insert({ name, email, hashed_password, phone_number: phone, role: 'buyer' })
    .select('id, name, email, phone_number, role, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' })
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  const stream_consumer_id = crypto.randomUUID()
  const { error: buyerError } = await supabase
    .from('buyer')
    .insert({ id: user.id, stream_consumer_id })

  if (buyerError) {
    await supabase.from('appuser').delete().eq('id', user.id)
    return res.status(500).json({ message: 'Failed to create buyer profile.' })
  }

  res.status(201).json({ user })
})

router.post('/login/buyer', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password are required.' })

  const { data: user, error } = await supabase
    .from('appuser')
    .select('id, name, email, phone_number, role, hashed_password, created_at')
    .eq('email', email)
    .eq('role', 'buyer')
    .single()

  if (error || !user) return res.status(404).json({ message: 'No buyer account found with this email.' })

  const match = await bcrypt.compare(password, user.hashed_password)
  if (!match) return res.status(401).json({ message: 'Incorrect password.' })

  const { hashed_password, ...safeData } = user
  res.json({ user: safeData })
})

// ── SELLER ────────────────────────────────────────────────────────────────────

router.post('/signup/seller', async (req, res) => {
  const { name, email, phone, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' })
  }

  const hashed_password = await bcrypt.hash(password, 10)

  const { data: user, error } = await supabase
    .from('appuser')
    .insert({ name, email, hashed_password, phone_number: phone || '', role: 'seller' })
    .select('id, name, email, phone_number, role, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' })
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  const { error: sellerError } = await supabase
    .from('seller')
    .insert({ id: user.id })

  if (sellerError) {
    await supabase.from('appuser').delete().eq('id', user.id)
    return res.status(500).json({ message: 'Failed to create seller profile.' })
  }

  res.status(201).json({ user })
})

router.post('/login/seller', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password are required.' })

  const { data: user, error } = await supabase
    .from('appuser')
    .select('id, name, email, phone_number, role, hashed_password, created_at')
    .eq('email', email)
    .eq('role', 'seller')
    .single()

  if (error || !user) return res.status(404).json({ message: 'No seller account found with this email.' })

  const match = await bcrypt.compare(password, user.hashed_password)
  if (!match) return res.status(401).json({ message: 'Incorrect password.' })

  const { hashed_password, ...safeData } = user
  res.json({ user: safeData })
})

module.exports = router

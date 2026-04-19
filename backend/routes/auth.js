const express = require('express')
const bcrypt = require('bcrypt')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ── BUYER ─────────────────────────────────────────────────────────────────────

router.post('/signup/buyer', async (req, res) => {
  const { name, email, phone } = req.body
  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'name, email, and phone are required.' })
  }

  const { data: buyer, error } = await supabase
    .from('buyers')
    .insert({ name, email, phone })
    .select('id, name, email, phone, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' })
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  res.status(201).json({ user: { ...buyer, role: 'buyer' } })
})

router.post('/login/buyer', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'email is required.' })

  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('id, name, email, phone, created_at')
    .eq('email', email)
    .single()

  if (error || !buyer) return res.status(404).json({ message: 'No buyer account found with this email.' })
  res.json({ user: { ...buyer, role: 'buyer' } })
})

// ── SELLER ────────────────────────────────────────────────────────────────────

router.post('/signup/seller', async (req, res) => {
  const { name, email, phone, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const { data: seller, error } = await supabase
    .from('sellers')
    .insert({ name, email, phone, password_hash: passwordHash })
    .select('id, name, email, phone, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' })
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  res.status(201).json({ user: { ...seller, role: 'seller' } })
})

router.post('/login/seller', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password are required.' })

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, name, email, phone, password_hash, created_at')
    .eq('email', email)
    .single()

  if (error || !seller) return res.status(404).json({ message: 'No seller account found with this email.' })

  const match = await bcrypt.compare(password, seller.password_hash)
  if (!match) return res.status(401).json({ message: 'Incorrect password.' })

  const { password_hash, ...safeData } = seller
  res.json({ user: { ...safeData, role: 'seller' } })
})

module.exports = router

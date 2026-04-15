const express = require('express')
const multer = require('multer')
const bcrypt = require('bcrypt')
const { createClient } = require('@supabase/supabase-js')
const { verifyCertificate } = require('../middleware/verifyCertificate')
const { verifyContractor } = require('../middleware/verifyContractor')

const router = express.Router()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are accepted.'))
    cb(null, true)
  }
})

// ── BUYER SIGNUP ─────────────────────────────────────────────────────────────
router.post('/signup/buyer', async (req, res) => {
  const { name, email, phone } = req.body
  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Name, email, and phone are required.' })
  }

  const { data: buyer, error } = await supabase
    .from('buyers')
    .insert({ name, email, phone })
    .select('id, name, email, phone, stream_consumer_id, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    console.error('DB error:', error)
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  res.status(201).json({ user: { ...buyer, role: 'buyer' } })
})

// ── BUYER LOGIN (email only — no password needed for buyers) ─────────────────
router.post('/login/buyer', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required.' })

  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('id, name, email, phone, stream_consumer_id, created_at')
    .eq('email', email)
    .single()

  if (error || !buyer) {
    return res.status(404).json({ message: 'No buyer account found with this email.' })
  }

  res.json({ user: { ...buyer, role: 'buyer' } })
})

// ── ENGINEERING OFFICE SIGNUP (SCE certificate QR scan) ──────────────────────
router.post('/signup/engineering_office', upload.single('certificate'), async (req, res) => {
  const { name, email, phone, password } = req.body

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Name, email, phone, and password are required.' })
  }
  if (!req.file) {
    return res.status(400).json({ message: 'An SCE certificate image is required.' })
  }

  const result = await verifyCertificate(req.file.buffer)
  if (!result.verified) {
    return res.status(422).json({ message: result.message, reason: result.reason })
  }

  const fileName = `${Date.now()}_${req.file.originalname}`
  const { data: storageData, error: storageError } = await supabase.storage
    .from('certificates')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype })

  if (storageError) {
    console.error('Storage error:', storageError)
    return res.status(500).json({ message: 'Failed to upload certificate. Please try again.' })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('certificates')
    .getPublicUrl(storageData.path)

  const passwordHash = await bcrypt.hash(password, 10)

  const { data: seller, error: dbError } = await supabase
    .from('sellers')
    .insert({
      name, email, phone,
      password_hash: passwordHash,
      provider_type: 'engineering_office',
      membership_id: result.membershipId,
      is_verified: true,
      certificate_url: publicUrl
    })
    .select('id, name, email, phone, provider_type, membership_id, is_verified, created_at')
    .single()

  if (dbError) {
    if (dbError.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' })
    console.error('DB error:', dbError)
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  res.status(201).json({ user: { ...seller, role: 'seller' } })
})

// ── CONTRACTOR SIGNUP (Muqawil ID lookup) ────────────────────────────────────
router.post('/signup/contractor', async (req, res) => {
  const { name, email, phone, password, contractor_id } = req.body

  if (!name || !email || !phone || !password || !contractor_id) {
    return res.status(400).json({ message: 'Name, email, phone, password, and contractor ID are required.' })
  }

  const result = await verifyContractor(contractor_id)
  if (!result.verified) {
    return res.status(422).json({ message: result.message, reason: result.reason })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const { data: seller, error: dbError } = await supabase
    .from('sellers')
    .insert({
      name, email, phone,
      password_hash: passwordHash,
      provider_type: 'contractor',
      contractor_id: result.contractorId,
      is_verified: true
    })
    .select('id, name, email, phone, provider_type, contractor_id, is_verified, created_at')
    .single()

  if (dbError) {
    if (dbError.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' })
    console.error('DB error:', dbError)
    return res.status(500).json({ message: 'Failed to create account.' })
  }

  res.status(201).json({ user: { ...seller, role: 'seller' } })
})

// ── SELLER LOGIN ──────────────────────────────────────────────────────────────
router.post('/login/seller', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, name, email, phone, password_hash, provider_type, membership_id, contractor_id, is_verified, created_at')
    .eq('email', email)
    .single()

  if (error || !seller) {
    return res.status(404).json({ message: 'No seller account found with this email.' })
  }

  const match = await bcrypt.compare(password, seller.password_hash)
  if (!match) {
    return res.status(401).json({ message: 'Incorrect password.' })
  }

  const { password_hash, ...safeData } = seller
  res.json({ user: { ...safeData, role: 'seller' } })
})

module.exports = router

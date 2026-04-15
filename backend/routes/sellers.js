const express = require('express')
const multer = require('multer')
const bcrypt = require('bcrypt')
const { createClient } = require('@supabase/supabase-js')
const { verifyCertificate } = require('../middleware/verifyCertificate')

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service role key — bypasses RLS
)

// Store file in memory so we can pass the buffer to verifyCertificate
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are accepted.'))
    }
    cb(null, true)
  }
})

// POST /api/sellers/register
router.post('/register', upload.single('certificate'), async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' })
  }
  if (!req.file) {
    return res.status(400).json({ message: 'A certificate image is required.' })
  }

  // 1. Verify the certificate QR code
  const result = await verifyCertificate(req.file.buffer)
  if (!result.verified) {
    return res.status(422).json({ message: result.message, reason: result.reason })
  }

  // 2. Upload certificate image to Supabase Storage
  const fileName = `${Date.now()}_${req.file.originalname}`
  const { data: storageData, error: storageError } = await supabase.storage
    .from('certificates')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype })

  if (storageError) {
    console.error('Storage upload error:', storageError)
    return res.status(500).json({ message: 'Failed to upload certificate. Please try again.' })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('certificates')
    .getPublicUrl(storageData.path)

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // 4. Insert seller into DB
  const { data: seller, error: dbError } = await supabase
    .from('sellers')
    .insert({
      name,
      email,
      password_hash: passwordHash,
      membership_id: result.membershipId,
      is_verified: true,
      certificate_url: publicUrl
    })
    .select('id, name, email, membership_id, is_verified, created_at')
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    console.error('DB insert error:', dbError)
    return res.status(500).json({ message: 'Failed to create account. Please try again.' })
  }

  res.status(201).json({
    message: 'Registration successful. Your SCE certificate has been verified.',
    seller
  })
})

// GET /api/sellers/:id
router.get('/:id', async (req, res) => {
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, name, email, membership_id, is_verified, certificate_url, created_at')
    .eq('id', req.params.id)
    .single()

  if (error || !seller) {
    return res.status(404).json({ message: 'Seller not found.' })
  }

  res.json(seller)
})

module.exports = router

const express = require('express')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const userAuth = require('../middleware/userAuth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

// GET /api/projects — homeowner's projects
router.get('/', userAuth, async (req, res) => {
  if (req.userRole !== 'buyer') {
    return res.status(403).json({ message: 'Only homeowners have projects.' })
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('buyer_id', req.userId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

// GET /api/projects/:id
router.get('/:id', userAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error || !data) return res.status(404).json({ message: 'Project not found.' })
  res.json(data)
})

// POST /api/projects — create project with Suk upload
router.post('/', userAuth, upload.single('suk'), async (req, res) => {
  if (req.userRole !== 'buyer') {
    return res.status(403).json({ message: 'Only homeowners can create projects.' })
  }

  const { title, location, land_size, budget, floors, rooms, design_style } = req.body

  if (!title || !location || !land_size || !budget) {
    return res.status(400).json({ message: 'title, location, land_size, and budget are required.' })
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Property deed (Suk) image is required.' })
  }

  // Upload Suk to storage
  const fileName = `suk_${Date.now()}_${req.file.originalname}`
  const { data: storageData, error: storageError } = await supabase.storage
    .from('certificates')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype })

  if (storageError) {
    console.error('Suk upload error:', storageError)
    return res.status(500).json({ message: 'Failed to upload deed. Please try again.' })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('certificates')
    .getPublicUrl(storageData.path)

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      buyer_id: req.userId,
      title,
      location,
      land_size: Number(land_size),
      budget: Number(budget),
      floors: Number(floors) || 1,
      rooms: Number(rooms) || 3,
      design_style: design_style || 'modern',
      stage: 'design',
      suk_url: publicUrl
    })
    .select()
    .single()

  if (error) {
    console.error('Project insert error:', error)
    return res.status(500).json({ message: 'Failed to create project.' })
  }

  res.status(201).json(project)
})

// PATCH /api/projects/:id/stage — advance stage (design → contractor)
router.patch('/:id/stage', userAuth, async (req, res) => {
  const { stage } = req.body
  const { data, error } = await supabase
    .from('projects')
    .update({ stage })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

module.exports = router

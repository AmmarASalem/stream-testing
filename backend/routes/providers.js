const express = require('express')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// GET /api/providers?type=engineering_office|contractor
router.get('/', async (req, res) => {
  const { type } = req.query

  let query = supabase
    .from('sellers')
    .select('id, name, email, phone, provider_type, membership_id, contractor_id, is_verified, created_at')
    .eq('is_verified', true)

  if (type) query = query.eq('provider_type', type)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

module.exports = router

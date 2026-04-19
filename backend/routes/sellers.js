const express = require('express')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// GET /api/sellers/:id
router.get('/:id', async (req, res) => {
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, name, email, phone, created_at')
    .eq('id', req.params.id)
    .single()

  if (error || !seller) return res.status(404).json({ message: 'Seller not found.' })
  res.json(seller)
})

module.exports = router

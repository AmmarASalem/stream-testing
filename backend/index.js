 
const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const sellersRouter = require('./routes/sellers')
const authRouter = require('./routes/auth')
const projectsRouter = require('./routes/projects')
const providersRouter = require('./routes/providers')
const negotiationsRouter = require('./routes/negotiations')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/sellers', sellersRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/providers', providersRouter)
app.use('/api/negotiations', negotiationsRouter)

// Build the base64 token from your key and secret
const base64Token = Buffer.from(`${process.env.STREAM_API_KEY}:${process.env.STREAM_API_SECRET}`).toString('base64')

const streamHeaders = {
  'x-api-key': base64Token,
  'Content-Type': 'application/json'
}

// Route 1: Create a consumer
app.post('/create-consumer', async (req, res) => {
  const { name, email, phone_number, user_id } = req.body

  try {
    // 1. Create consumer in Stream
    const streamRes = await axios.post(
      'https://stream-app-service.streampay.sa/api/v2/consumers',
      { name, email, phone_number },
      { headers: streamHeaders }
    )
    const streamConsumerId = streamRes.data.id

    // 2. Save customer in your database
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, email, phone: phone_number, stream_consumer_id: streamConsumerId, user_id })
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    res.status(400).json(error.response?.data || error.message || { message: 'Something went wrong' })
  }
})

// Route 2: Create a payment link
app.post('/create-payment-link', async (req, res) => {
  const { organization_consumer_id, customer_id } = req.body

  try {
    // 1. Create payment link in Stream
    const streamRes = await axios.post(
      'https://stream-app-service.streampay.sa/api/v2/payment_links',
      {
        name: "Test Payment",
        description: "Practice payment",
        items: [{ product_id: "9cd93bd3-bc0f-4288-9282-9ee6ba6377ee", quantity: 1 }],
        contact_information_type: "PHONE",
        currency: "SAR",
        max_number_of_payments: 1,
        organization_consumer_id,
        success_redirect_url: "http://localhost:3000/success",
        failure_redirect_url: "http://localhost:3000/failure"
      },
      { headers: streamHeaders }
    )

    const { url, id: stream_payment_link_id } = streamRes.data

    // 2. Save payment in your database
    const { data, error } = await supabase
      .from('payments')
      .insert({ customer_id, stream_payment_link_id, stream_payment_link_url: url, amount: 3, status: 'pending' })
      .select()
      .single()

    if (error) {
  console.log("Supabase error:", error)
  throw error
}

    res.json({ ...data, url })
  } catch (error) {
    res.status(400).json(error.response?.data || error.message || { message: 'Something went wrong' })
  }
})

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001')
})
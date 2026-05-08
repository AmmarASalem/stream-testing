require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')

const authRouter = require('./routes/auth')
const sellersRouter = require('./routes/sellers')
const listingsRouter = require('./routes/listings')
const negotiationsRouter = require('./routes/negotiations')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/sellers', sellersRouter)
app.use('/api/listings', listingsRouter)
app.use('/api/negotiations', negotiationsRouter)

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001')
})

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import db from './db/database.js'

import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import leaveRoutes from './routes/leaveRequests.js'
import teamRoutes from './routes/teams.js'
import companyRoutes from './routes/calendar.js'
import hrRoutes from './routes/hr.js'
import accountingRoutes from './routes/accounting.js'
import adminRoutes from './routes/admin.js'
import donationRoutes from './routes/donations.js'
import wellnessRoutes from './routes/wellness.js'
import notificationRoutes from './routes/notifications.js'
import employeeRoutes from './routes/employee.js'

dotenv.config()

const app = express()

// Middleware
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

// Initialize database before starting server
async function start() {
  try {
    await db.init()
    console.log('Database initialized')
  } catch (err) {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  }

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/me', meRoutes)
  app.use('/api/leave-requests', leaveRoutes)
  app.use('/api/teams', teamRoutes)
  app.use('/api/company', companyRoutes)
  app.use('/api/hr', hrRoutes)
  app.use('/api/accounting', accountingRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/donations', donationRoutes)
  app.use('/api/wellness', wellnessRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/employees', employeeRoutes)

  // Error handling middleware (optional)
  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`Happen API running on http://localhost:${PORT}`)
  })
}

start()

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.close()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await db.close()
  process.exit(0)
})

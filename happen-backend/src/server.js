import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './db/mongoose.js'

import authRoutes         from './routes/auth.js'
import meRoutes           from './routes/me.js'
import leaveRoutes        from './routes/leaveRequests.js'
import teamRoutes         from './routes/teams.js'
import companyRoutes      from './routes/calendar.js'
import notificationRoutes from './routes/notifications.js'
import managerLeaveRoutes from './routes/managerLeave.js'

// Stub routes that haven't been migrated yet (return empty arrays)
import express2 from 'express'
const stub = (router) => { router.get('/', (_, res) => res.json([])); router.get('/:id', (_, res) => res.json({})); return router }
const hrRoutes          = stub(express2.Router())
const accountingRoutes  = stub(express2.Router())
const adminRoutes       = stub(express2.Router())
const donationRoutes    = stub(express2.Router())
const wellnessRoutes    = stub(express2.Router())
const employeeRoutes    = stub(express2.Router())

dotenv.config()

const app = express()

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

async function start() {
  await connectDB()

  app.use('/api/auth',          authRoutes)
  app.use('/api/me',            meRoutes)
  app.use('/api/leave-requests',leaveRoutes)
  app.use('/api/teams',         teamRoutes)
  app.use('/api/company',       companyRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/manager-leave', managerLeaveRoutes)
  app.use('/api/hr',            hrRoutes)
  app.use('/api/accounting',    accountingRoutes)
  app.use('/api/admin',         adminRoutes)
  app.use('/api/donations',     donationRoutes)
  app.use('/api/wellness',      wellnessRoutes)
  app.use('/api/employees',     employeeRoutes)

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => console.log(`✅ Happen API running on http://localhost:${PORT}`))
}

start().catch(e => { console.error(e); process.exit(1) })

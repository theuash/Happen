import express from 'express'
import db from '../db/database.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/me/leave-balance
router.get('/leave-balance', verifyToken, (req, res) => {
  const user = db.prepare('SELECT leave_balance_annual, leave_balance_sick, wellness_days_used, emergency_leaves_used FROM users WHERE id = ?').get([req.user.id])
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({
    annual: user.leave_balance_annual,
    sick: user.leave_balance_sick,
    wellness_used: user.wellness_days_used,
    emergency_used: user.emergency_leaves_used
  })
})

// GET /api/me/leave-requests
router.get('/leave-requests', verifyToken, (req, res) => {
  const requests = db.prepare('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC').all([req.user.id])
  res.json(requests)
})

// GET /api/me/queue-position
router.get('/queue-position', verifyToken, (req, res) => {
  const request = db.prepare('SELECT id, queue_position FROM leave_requests WHERE user_id = ? AND status = "queued" ORDER BY created_at LIMIT 1').get([req.user.id])
  if (!request) {
    return res.json({ position: null, request_id: null, estimated_date: null })
  }
  // Simple estimation: 1 week per position ahead
  const estimated_date = new Date(Date.now() + request.queue_position * 7 * 24 * 60 * 60 * 1000).toISOString()
  res.json({
    position: request.queue_position,
    request_id: request.id,
    estimated_date: estimated_date
  })
})

// GET /api/me/activity
router.get('/activity', verifyToken, (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all([req.user.id])
  res.json(logs)
})

// GET /api/me/wellness-balance
router.get('/wellness-balance', verifyToken, (req, res) => {
  const user = db.prepare('SELECT wellness_days_used FROM users WHERE id = ?').get([req.user.id])
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({
    used: user.wellness_days_used,
    total: 2
  })
})

export default router

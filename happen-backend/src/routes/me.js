import express from 'express'
import User from '../db/models/User.js'
import LeaveRequest from '../db/models/LeaveRequest.js'
import AuditLog from '../db/models/AuditLog.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/leave-balance', verifyToken, async (req, res) => {
  try {
    const u = await User.findById(req.user.id).lean()
    if (!u) return res.status(404).json({ error: 'Not found' })
    res.json({
      annual:        u.leave_balance_annual,
      sick:          u.leave_balance_sick,
      wellness_used: u.wellness_days_used,
      emergency_used:u.emergency_leaves_used,
    })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/leave-requests', verifyToken, async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ user_id: req.user.id }).sort({ createdAt: -1 }).lean()
    res.json(requests.map(r => ({ ...r, id: r._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/queue-position', verifyToken, async (req, res) => {
  try {
    const req_ = await LeaveRequest.findOne({ user_id: req.user.id, status: 'queued' }).sort({ createdAt: 1 }).lean()
    if (!req_) return res.json({ position: null, request_id: null, estimated_date: null })
    const estimated_date = new Date(Date.now() + req_.queue_position * 7 * 24 * 60 * 60 * 1000).toISOString()
    res.json({ position: req_.queue_position, request_id: req_._id, estimated_date })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/activity', verifyToken, async (req, res) => {
  try {
    const logs = await AuditLog.find({ user_id: req.user.id }).sort({ createdAt: -1 }).limit(10).lean()
    res.json(logs.map(l => ({ ...l, id: l._id, created_at: l.createdAt })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/wellness-balance', verifyToken, async (req, res) => {
  try {
    const u = await User.findById(req.user.id).lean()
    res.json({ used: u?.wellness_days_used ?? 0, total: 2 })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

import express from 'express'
import LeaveRequest from '../db/models/LeaveRequest.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import AuditLog from '../db/models/AuditLog.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/queue  — all queued requests, globally sorted by position
router.get('/', verifyToken, async (req, res) => {
  try {
    const queue = await LeaveRequest.find({ status: 'queued' })
      .populate('user_id', 'first_name last_name avatar team_id')
      .sort({ queue_position: 1, createdAt: 1 })
      .lean()

    res.json(queue.map(r => ({
      ...r,
      id:         r._id,
      first_name: r.user_id?.first_name,
      last_name:  r.user_id?.last_name,
      avatar:     r.user_id?.avatar,
      team_id:    r.user_id?.team_id,
      user_id:    r.user_id?._id,
    })))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/queue/grant-next  — manager/HR only, 4-hour cooldown
router.post('/grant-next', verifyToken, requireRole('manager', 'hr'), async (req, res) => {
  try {
    const COOLDOWN_MS = 4 * 60 * 60 * 1000

    const lastGrant = await AuditLog.findOne({
      user_id: req.user.id,
      action: 'queue.grant_next',
    }).sort({ createdAt: -1 }).lean()

    if (lastGrant) {
      const elapsed = Date.now() - new Date(lastGrant.createdAt).getTime()
      if (elapsed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000)
        return res.status(429).json({
          error: 'Cooldown active',
          detail: `You can grant the next leave in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
          remaining_minutes: remaining,
        })
      }
    }

    // Top of queue
    const top = await LeaveRequest.findOne({ status: 'queued' })
      .sort({ queue_position: 1, createdAt: 1 })
      .populate('user_id', 'first_name last_name')
      .lean()

    if (!top) {
      return res.status(404).json({ error: 'No requests in queue' })
    }

    // Approve it
    await LeaveRequest.findByIdAndUpdate(top._id, {
      status: 'approved',
      decision_date: new Date(),
    })

    // Shift everyone else down by 1
    await LeaveRequest.updateMany(
      { status: 'queued', queue_position: { $gt: top.queue_position } },
      { $inc: { queue_position: -1 } }
    )

    // Notify the approved employee
    await Notification.create({
      user_id: top.user_id._id,
      title: '✅ Leave Approved',
      message: `Your annual leave (${top.start_date} → ${top.end_date}) has been approved from the queue.`,
      type: 'success',
    })

    // Audit log
    const granter = await User.findById(req.user.id).lean()
    await AuditLog.create({
      user_id: req.user.id,
      action: 'queue.grant_next',
      details: `${granter.first_name} ${granter.last_name} granted queue leave to ${top.user_id.first_name} ${top.user_id.last_name}`,
      ip_address: req.ip,
    })

    res.json({
      message: `Leave granted to ${top.user_id.first_name} ${top.user_id.last_name}`,
      approved: { ...top, id: top._id },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

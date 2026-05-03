import express from 'express'
import User from '../db/models/User.js'
import LeaveRequest from '../db/models/LeaveRequest.js'
import Notification from '../db/models/Notification.js'
import Team from '../db/models/Team.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const WELLNESS_TOTAL = 2

// GET /api/wellness/balance
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })
    const used = user.wellness_days_used || 0
    res.json({ used, total: WELLNESS_TOTAL, remaining: WELLNESS_TOTAL - used })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// POST /api/wellness/request  — take a full wellness day (auto-approved)
router.post('/request', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const used = user.wellness_days_used || 0
    if (used >= WELLNESS_TOTAL) {
      return res.status(400).json({
        error: `You have used all ${WELLNESS_TOTAL} wellness days for this year.`,
      })
    }

    const today = new Date().toISOString().split('T')[0]

    const lr = await LeaveRequest.create({
      user_id: user._id,
      type: 'wellness',
      start_date: today,
      end_date: today,
      days_count: 1,
      status: 'approved',
      decision_date: new Date(),
    })

    // Increment counter
    await User.findByIdAndUpdate(user._id, { $inc: { wellness_days_used: 1 } })

    // Notify team lead + manager
    const [team, manager] = await Promise.all([
      user.team_id ? Team.findById(user.team_id).lean() : null,
      User.findOne({ role: 'manager' }, '_id').lean(),
    ])
    const notifyIds = [team?.team_lead_id, manager?._id].filter(Boolean)
    if (notifyIds.length) {
      await Notification.insertMany(notifyIds.map(id => ({
        user_id: id,
        title: 'Wellness Day Taken',
        message: `${user.first_name} ${user.last_name} has taken a wellness day today.`,
        type: 'info',
        link: '/current-leaves',
      })))
    }

    const newUsed = used + 1
    res.json({
      request: { ...lr.toObject(), id: lr._id },
      status: 'approved',
      message: `Wellness day approved! You have ${WELLNESS_TOTAL - newUsed} wellness day(s) remaining.`,
      used: newUsed,
      remaining: WELLNESS_TOTAL - newUsed,
      total: WELLNESS_TOTAL,
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

export default router

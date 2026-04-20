import express from 'express'
import LeaveRequest from '../db/models/LeaveRequest.js'
import User from '../db/models/User.js'
import Team from '../db/models/Team.js'
import Notification from '../db/models/Notification.js'
import AuditLog from '../db/models/AuditLog.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

router.post('/', verifyToken, requireRole('manager','hr'), async (req, res) => {
  try {
    const { start_date, end_date, reason } = req.body
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date required' })

    const me = await User.findById(req.user.id).lean()
    const teams = await Team.find({}, 'workload_current').lean()
    const avg = teams.length ? Math.round(teams.reduce((s,t) => s + (t.workload_current||0), 0) / teams.length) : 0

    if (avg > 50) {
      return res.status(409).json({
        error: 'Leave cannot be scheduled right now',
        detail: `Company workload is ${avg}% (above 50% threshold).`,
        workload: avg,
      })
    }

    const days = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1
    const lr = await LeaveRequest.create({
      user_id: me._id, start_date, end_date, days_count: days,
      type: 'annual', reason: reason || null, status: 'approved', decision_date: new Date(),
    })

    const recipients = await User.find({ role: { $in: ['employee','team_lead','accounting'] }, is_active: true }, '_id').lean()
    const roleLabel = me.role === 'hr' ? 'HR' : 'Manager'
    const docs = recipients.map(r => ({
      user_id: r._id,
      title: `${roleLabel} Leave Notice`,
      message: `${me.first_name} ${me.last_name} (${roleLabel}) will be on leave ${start_date} → ${end_date}.${reason ? ` Note: ${reason}` : ''}`,
      type: 'info',
    }))
    await Notification.insertMany(docs)
    await AuditLog.create({ user_id: me._id, action: 'manager_leave.scheduled', details: `${start_date}→${end_date}`, ip_address: req.ip })

    res.json({ leave: { ...lr.toObject(), id: lr._id }, workload: avg, notified: recipients.length })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

router.get('/', verifyToken, async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ status: 'approved' })
      .populate({ path: 'user_id', match: { role: { $in: ['manager','hr'] } }, select: 'first_name last_name role' })
      .sort({ start_date: -1 }).limit(20).lean()
    const filtered = leaves.filter(l => l.user_id)
    res.json(filtered.map(l => ({ ...l, id: l._id, first_name: l.user_id?.first_name, last_name: l.user_id?.last_name, role: l.user_id?.role })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

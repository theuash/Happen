import express from 'express'
import LeaveRequest from '../db/models/LeaveRequest.js'
import User from '../db/models/User.js'
import Team from '../db/models/Team.js'
import Notification from '../db/models/Notification.js'
import AuditLog from '../db/models/AuditLog.js'
import Override from '../db/models/Override.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

const fmt = (d) => new Date(d).toISOString().split('T')[0]
const today = () => fmt(new Date())
const tomorrow = () => fmt(new Date(Date.now() + 86400000))
const oneWeekAhead = () => fmt(new Date(Date.now() + 7 * 86400000))

// Notify a list of user IDs
async function notify(userIds, title, message, type = 'info') {
  const docs = userIds.filter(Boolean).map(uid => ({ user_id: uid, title, message, type }))
  if (docs.length) await Notification.insertMany(docs)
}

// GET /api/leave-requests/all
router.get('/all', verifyToken, requireRole('team_lead','manager','hr','admin'), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    const filter = me.role === 'team_lead' && me.team_id ? {} : {}

    let query = LeaveRequest.find(filter)
      .populate('user_id', 'first_name last_name email avatar team_id role')
      .sort({ createdAt: -1 })

    const requests = await query.lean()

    // For team_lead: only their team
    const filtered = me.role === 'team_lead' && me.team_id
      ? requests.filter(r => r.user_id?.team_id?.toString() === me.team_id.toString())
      : requests

    res.json(filtered.map(r => ({
      ...r,
      id: r._id,
      first_name: r.user_id?.first_name,
      last_name:  r.user_id?.last_name,
      email:      r.user_id?.email,
      avatar:     r.user_id?.avatar,
      team_id:    r.user_id?.team_id,
    })))
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/leave-requests
// Rules:
//   annual   → start_date must be >= 1 week from today
//   sick     → start_date must be today or tomorrow, end_date = start_date (1 day)
//   wellness → half-day only (today), reason required (sick|wellness)
//   emergency→ no dates, instant, notifies HR + manager
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, start_date, reason, half_day, am_pm } = req.body

    if (!['annual','sick','wellness','emergency'].includes(type)) {
      return res.status(400).json({ error: 'Invalid leave type' })
    }

    const me = await User.findById(req.user.id).lean()
    if (!me) return res.status(404).json({ error: 'User not found' })

    const team = me.team_id ? await Team.findById(me.team_id).lean() : null
    const workload = team?.workload_current ?? 0

    // ── EMERGENCY ────────────────────────────────────────────────────────────
    if (type === 'emergency') {
      const lr = await LeaveRequest.create({
        user_id:       me._id,
        type:          'emergency',
        start_date:    null,
        end_date:      null,
        days_count:    1,
        status:        'emergency',
        proof_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        decision_date: new Date(),
      })

      // Notify HR + manager + team lead
      const hrUsers = await User.find({ role: 'hr' }, '_id').lean()
      const manager  = await User.findOne({ role: 'manager' }, '_id').lean()
      const teamLead = team?.team_lead_id

      const notifyIds = [...hrUsers.map(h => h._id), manager?._id, teamLead].filter(Boolean)
      await notify(notifyIds,
        '🚨 Emergency Leave',
        `${me.first_name} ${me.last_name} has taken emergency leave. Proof required within 24 hours.`,
        'error'
      )

      await AuditLog.create({ user_id: me._id, action: 'leave_request.emergency', details: 'Emergency leave taken', ip_address: req.ip })

      return res.json({ request: { ...lr.toObject(), id: lr._id }, status: 'emergency', message: 'Emergency leave granted. HR and your manager have been notified.' })
    }

    // ── WELLNESS (half-day only) ──────────────────────────────────────────────
    if (type === 'wellness') {
      if (!reason || !['sick','wellness'].includes(reason)) {
        return res.status(400).json({ error: 'Reason required for wellness leave: sick or wellness' })
      }
      const lr = await LeaveRequest.create({
        user_id:    me._id,
        type:       'wellness',
        start_date: today(),
        end_date:   today(),
        days_count: 0.5,
        half_day:   true,
        am_pm:      am_pm || 'AM',
        reason,
        status:     'approved',
        decision_date: new Date(),
      })

      const teamLead = team?.team_lead_id
      const manager  = await User.findOne({ role: 'manager' }, '_id').lean()
      await notify([teamLead, manager?._id], 'Wellness Half-Day', `${me.first_name} ${me.last_name} is taking a wellness half-day (${am_pm || 'AM'}).`, 'info')

      return res.json({ request: { ...lr.toObject(), id: lr._id }, status: 'approved', message: 'Wellness half-day approved.' })
    }

    // ── SICK (today or tomorrow only) ────────────────────────────────────────
    if (type === 'sick') {
      const allowed = [today(), tomorrow()]
      const date = start_date || today()
      if (!allowed.includes(date)) {
        return res.status(400).json({ error: 'Sick leave can only be taken for today or tomorrow.' })
      }
      const lr = await LeaveRequest.create({
        user_id:    me._id,
        type:       'sick',
        start_date: date,
        end_date:   date,
        days_count: 1,
        reason:     reason || null,
        status:     'approved',
        decision_date: new Date(),
      })

      const teamLead = team?.team_lead_id
      const manager  = await User.findOne({ role: 'manager' }, '_id').lean()
      await notify([teamLead, manager?._id], 'Sick Leave', `${me.first_name} ${me.last_name} is on sick leave ${date === today() ? 'today' : 'tomorrow'}.`, 'warning')

      return res.json({ request: { ...lr.toObject(), id: lr._id }, status: 'approved', message: `Sick leave approved for ${date}.` })
    }

    // ── ANNUAL (min 1 week ahead) ─────────────────────────────────────────────
    if (type === 'annual') {
      if (!start_date) return res.status(400).json({ error: 'start_date required for annual leave' })
      const end_date = req.body.end_date || start_date

      if (start_date < oneWeekAhead()) {
        return res.status(400).json({ error: 'Annual leave must be requested at least 1 week in advance.' })
      }

      const days = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1
      let status = workload < 50 ? 'approved' : 'queued'
      let queue_position = null

      if (status === 'queued') {
        const count = await LeaveRequest.countDocuments({ status: 'queued' })
        queue_position = count + 1
      }

      const lr = await LeaveRequest.create({
        user_id:        me._id,
        type:           'annual',
        start_date,
        end_date,
        days_count:     days,
        reason:         reason || null,
        status,
        queue_position,
        decision_date:  status === 'approved' ? new Date() : null,
      })

      // Notify team lead + manager
      const teamLead = team?.team_lead_id
      const manager  = await User.findOne({ role: 'manager' }, '_id').lean()
      await notify([teamLead, manager?._id],
        'Annual Leave Request',
        `${me.first_name} ${me.last_name} requested annual leave ${start_date} → ${end_date}. Status: ${status}.`,
        'info'
      )

      await AuditLog.create({ user_id: me._id, action: 'leave_request.created', details: `Annual leave ${start_date}→${end_date}`, ip_address: req.ip })

      return res.json({
        request: { ...lr.toObject(), id: lr._id },
        status,
        queue_position,
        message: status === 'approved'
          ? 'Annual leave approved!'
          : `Added to queue at position #${queue_position}. Workload is currently high.`,
      })
    }
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/leave-requests/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const lr = await LeaveRequest.findById(req.params.id).populate('user_id','first_name last_name email team_id').lean()
    if (!lr) return res.status(404).json({ error: 'Not found' })
    const me = await User.findById(req.user.id).lean()
    const isOwner = lr.user_id?._id?.toString() === req.user.id
    const isPriv  = ['team_lead','manager','hr','admin'].includes(me.role)
    if (!isOwner && !isPriv) return res.status(403).json({ error: 'Forbidden' })
    res.json({ ...lr, id: lr._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/leave-requests/:id/approve
router.patch('/:id/approve', verifyToken, requireRole('team_lead','manager','hr','admin'), async (req, res) => {
  try {
    const lr = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: 'approved', decision_date: new Date() }, { new: true })
    if (!lr) return res.status(404).json({ error: 'Not found' })
    await notify([lr.user_id], 'Leave Approved ✅', `Your ${lr.type} leave request has been approved.`, 'success')
    res.json({ message: 'Approved', request: { ...lr.toObject(), id: lr._id } })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/leave-requests/:id/deny
router.patch('/:id/deny', verifyToken, requireRole('team_lead','manager','hr','admin'), async (req, res) => {
  try {
    const { reason } = req.body
    const lr = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: 'denied', decision_date: new Date(), override_reason: reason || null }, { new: true })
    if (!lr) return res.status(404).json({ error: 'Not found' })
    await notify([lr.user_id], 'Leave Denied ❌', `Your ${lr.type} leave was denied.${reason ? ` Reason: ${reason}` : ''}`, 'error')
    res.json({ message: 'Denied', request: { ...lr.toObject(), id: lr._id } })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/leave-requests/:id/override
router.patch('/:id/override', verifyToken, requireRole('team_lead','manager','hr','admin'), async (req, res) => {
  try {
    const { decision, reason } = req.body
    if (!['approved','denied'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' })
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason required for override' })

    const lr = await LeaveRequest.findByIdAndUpdate(req.params.id, {
      status: decision, decision_date: new Date(), override_reason: reason, manager_override: true, override_by: req.user.id,
    }, { new: true })
    if (!lr) return res.status(404).json({ error: 'Not found' })

    await Override.create({ manager_id: req.user.id, request_id: lr._id, decision, reason })
    await AuditLog.create({ user_id: req.user.id, action: 'leave_request.override', details: `Override ${lr._id} → ${decision}`, ip_address: req.ip })
    await notify([lr.user_id], 'Leave Override', `Your leave was overridden: ${decision}.${reason ? ` Reason: ${reason}` : ''}`, 'warning')

    res.json({ message: 'Override applied', request: { ...lr.toObject(), id: lr._id } })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

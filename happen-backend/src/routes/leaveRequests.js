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

const fmt          = (d) => new Date(d).toISOString().split('T')[0]
const todayStr     = ()  => fmt(new Date())
const tomorrowStr  = ()  => fmt(new Date(Date.now() + 86400000))
const oneWeekAhead = ()  => fmt(new Date(Date.now() + 7 * 86400000))

// Only HR + manager receive leave notifications
async function notifyHRManager(title, message, type = 'info') {
  const [hrUsers, manager] = await Promise.all([
    User.find({ role: 'hr' }, '_id').lean(),
    User.findOne({ role: 'manager' }, '_id').lean(),
  ])
  const ids = [...hrUsers.map(h => h._id), manager?._id].filter(Boolean)
  if (ids.length) await Notification.insertMany(ids.map(uid => ({ user_id: uid, title, message, type })))
}

// ── GET /api/leave-requests/queue  (all queued, global, sorted by position)
router.get('/queue', verifyToken, async (req, res) => {
  try {
    const queue = await LeaveRequest.find({ status: 'queued' })
      .populate('user_id', 'first_name last_name avatar team_id')
      .sort({ queue_position: 1, createdAt: 1 })
      .lean()
    res.json(queue.map(r => ({
      ...r, id: r._id,
      first_name: r.user_id?.first_name,
      last_name:  r.user_id?.last_name,
      avatar:     r.user_id?.avatar,
      team_id:    r.user_id?.team_id,
      user_id:    r.user_id?._id,
    })))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/leave-requests/grant-next
// Manager or HR only. Approves the #1 queued request.
// Cooldown: can only be used once every 4 hours per user.
router.post('/grant-next', verifyToken, requireRole('manager', 'hr'), async (req, res) => {
  try {
    const COOLDOWN_MS = 4 * 60 * 60 * 1000 // 4 hours

    // Check cooldown via audit log
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

    // Find the top queued request
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

    // Shift remaining queue positions down by 1
    await LeaveRequest.updateMany(
      { status: 'queued', queue_position: { $gt: top.queue_position } },
      { $inc: { queue_position: -1 } }
    )

    // Notify the employee whose leave was approved
    await Notification.create({
      user_id: top.user_id._id,
      title: '✅ Leave Approved',
      message: `Your annual leave (${top.start_date} → ${top.end_date}) has been approved from the queue.`,
      type: 'success',
    })

    // Log the action
    const granter = await User.findById(req.user.id).lean()
    await AuditLog.create({
      user_id: req.user.id,
      action: 'queue.grant_next',
      details: `${granter.first_name} ${granter.last_name} granted queue leave to ${top.user_id.first_name} ${top.user_id.last_name} (request ${top._id})`,
      ip_address: req.ip,
    })

    res.json({
      message: `Leave granted to ${top.user_id.first_name} ${top.user_id.last_name}`,
      approved: { ...top, id: top._id },
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/leave-requests
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, start_date, reason, am_pm } = req.body

    if (!['annual','sick','wellness','emergency'].includes(type)) {
      return res.status(400).json({ error: 'Invalid leave type' })
    }

    const me   = await User.findById(req.user.id).lean()
    if (!me) return res.status(404).json({ error: 'User not found' })
    const team = me.team_id ? await Team.findById(me.team_id).lean() : null
    const workload = team?.workload_current ?? 0

    // ── EMERGENCY
    if (type === 'emergency') {
      const lr = await LeaveRequest.create({
        user_id: me._id, type: 'emergency',
        start_date: null, end_date: null, days_count: 1,
        status: 'emergency',
        proof_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        decision_date: new Date(),
      })
      await notifyHRManager(
        '🚨 Emergency Leave',
        `${me.first_name} ${me.last_name} has taken emergency leave. Proof required within 24 hours.`,
        'error'
      )
      await AuditLog.create({ user_id: me._id, action: 'leave_request.emergency', details: 'Emergency leave taken', ip_address: req.ip })
      return res.json({ request: { ...lr.toObject(), id: lr._id }, status: 'emergency', message: 'Emergency leave granted. HR and your manager have been notified.' })
    }

    // ── WELLNESS
    if (type === 'wellness') {
      if (!reason || !['sick','wellness'].includes(reason)) {
        return res.status(400).json({ error: 'Reason required: sick or wellness' })
      }
      const lr = await LeaveRequest.create({
        user_id: me._id, type: 'wellness',
        start_date: todayStr(), end_date: todayStr(), days_count: 0.5,
        half_day: true, am_pm: am_pm || 'AM', reason,
        status: 'approved', decision_date: new Date(),
      })
      await notifyHRManager('Wellness Half-Day', `${me.first_name} ${me.last_name} is taking a wellness half-day (${am_pm || 'AM'}).`)
      return res.json({ request: { ...lr.toObject(), id: lr._id }, status: 'approved', message: 'Wellness half-day approved.' })
    }

    // ── SICK
    if (type === 'sick') {
      const allowed = [todayStr(), tomorrowStr()]
      const date = start_date || todayStr()
      if (!allowed.includes(date)) {
        return res.status(400).json({ error: 'Sick leave can only be taken for today or tomorrow.' })
      }
      const lr = await LeaveRequest.create({
        user_id: me._id, type: 'sick',
        start_date: date, end_date: date, days_count: 1,
        reason: reason || null, status: 'approved', decision_date: new Date(),
      })
      await notifyHRManager('Sick Leave', `${me.first_name} ${me.last_name} is on sick leave ${date === todayStr() ? 'today' : 'tomorrow'}.`, 'warning')
      return res.json({ request: { ...lr.toObject(), id: lr._id }, status: 'approved', message: `Sick leave approved for ${date}.` })
    }

    // ── ANNUAL
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
        user_id: me._id, type: 'annual', start_date, end_date, days_count: days,
        reason: reason || null, status, queue_position,
        decision_date: status === 'approved' ? new Date() : null,
      })

      await notifyHRManager(
        'New Annual Leave Request',
        `${me.first_name} ${me.last_name} requested annual leave ${start_date} → ${end_date}. Status: ${status}${status === 'queued' ? ` (queue #${queue_position})` : ''}.`
      )
      await AuditLog.create({ user_id: me._id, action: 'leave_request.created', details: `Annual leave ${start_date}→${end_date}`, ip_address: req.ip })

      return res.json({
        request: { ...lr.toObject(), id: lr._id }, status, queue_position,
        message: status === 'approved'
          ? 'Annual leave approved!'
          : `Added to queue at position #${queue_position}. Workload is currently high.`,
      })
    }
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/leave-requests/:id
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

// ── PATCH approve / deny / override (kept for admin use)
router.patch('/:id/approve', verifyToken, requireRole('manager','hr','admin'), async (req, res) => {
  try {
    const lr = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: 'approved', decision_date: new Date() }, { new: true })
    if (!lr) return res.status(404).json({ error: 'Not found' })
    await Notification.create({ user_id: lr.user_id, title: 'Leave Approved ✅', message: `Your ${lr.type} leave has been approved.`, type: 'success' })
    res.json({ message: 'Approved', request: { ...lr.toObject(), id: lr._id } })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id/deny', verifyToken, requireRole('manager','hr','admin'), async (req, res) => {
  try {
    const { reason } = req.body
    const lr = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: 'denied', decision_date: new Date(), override_reason: reason || null }, { new: true })
    if (!lr) return res.status(404).json({ error: 'Not found' })
    await Notification.create({ user_id: lr.user_id, title: 'Leave Denied ❌', message: `Your ${lr.type} leave was denied.${reason ? ` Reason: ${reason}` : ''}`, type: 'error' })
    res.json({ message: 'Denied', request: { ...lr.toObject(), id: lr._id } })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id/override', verifyToken, requireRole('manager','hr','admin'), async (req, res) => {
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
    await Notification.create({ user_id: lr.user_id, title: 'Leave Override', message: `Your leave was overridden: ${decision}.${reason ? ` Reason: ${reason}` : ''}`, type: 'warning' })
    res.json({ message: 'Override applied', request: { ...lr.toObject(), id: lr._id } })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

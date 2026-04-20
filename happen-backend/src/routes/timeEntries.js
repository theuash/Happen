import express from 'express'
import TimeEntry from '../db/models/TimeEntry.js'
import User from '../db/models/User.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// GET /api/time-entries  — my entries (or team if manager/lead)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { week, user_id } = req.query
    const me = await User.findById(req.user.id).lean()
    const isPriv = ['manager','hr','admin','team_lead'].includes(me.role)

    let filter = {}
    if (user_id && isPriv) filter.user_id = user_id
    else filter.user_id = req.user.id

    if (week) {
      // week = YYYY-WW, get Mon-Sun
      const [y, w] = week.split('-W').map(Number)
      const jan4 = new Date(y, 0, 4)
      const weekStart = new Date(jan4)
      weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
      filter.date = { $gte: weekStart.toISOString().split('T')[0], $lte: weekEnd.toISOString().split('T')[0] }
    }

    const entries = await TimeEntry.find(filter).populate('user_id','first_name last_name avatar').sort({ date: -1, createdAt: -1 }).lean()
    const totalHours = entries.reduce((s, e) => s + e.hours, 0)
    const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)
    res.json({ entries: entries.map(e => ({ ...e, id: e._id })), totalHours, billableHours })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// POST /api/time-entries
router.post('/', verifyToken, async (req, res) => {
  try {
    const { description, date, hours, billable, project_name, project_id } = req.body
    if (!description?.trim() || !date || !hours) return res.status(400).json({ error: 'description, date, hours required' })
    if (hours < 0.25 || hours > 24) return res.status(400).json({ error: 'hours must be between 0.25 and 24' })
    const entry = await TimeEntry.create({ user_id: req.user.id, description: description.trim(), date, hours, billable: billable !== false, project_name: project_name || 'General', project_id: project_id || null })
    res.json({ ...entry.toObject(), id: entry._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// DELETE /api/time-entries/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const entry = await TimeEntry.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!entry) return res.status(404).json({ error: 'Not found' })
    if (entry.approved) return res.status(400).json({ error: 'Cannot delete an approved entry' })
    await entry.deleteOne()
    res.json({ message: 'Deleted' })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/time-entries/:id/approve  — manager/team_lead
router.patch('/:id/approve', verifyToken, requireRole('manager','team_lead','hr','admin'), async (req, res) => {
  try {
    const entry = await TimeEntry.findByIdAndUpdate(req.params.id, { approved: true, approved_by: req.user.id }, { new: true })
    if (!entry) return res.status(404).json({ error: 'Not found' })
    res.json({ ...entry.toObject(), id: entry._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// GET /api/time-entries/summary  — weekly summary for team (manager/lead)
router.get('/summary', verifyToken, requireRole('manager','team_lead','hr','admin'), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    const teamFilter = me.team_id ? { team_id: me.team_id } : {}
    const teamUsers = await User.find({ ...teamFilter, role: { $in: ['employee','team_lead'] } }, '_id first_name last_name avatar').lean()
    const today = new Date()
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1); weekStart.setHours(0,0,0,0)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
    const startStr = weekStart.toISOString().split('T')[0]
    const endStr   = weekEnd.toISOString().split('T')[0]

    const summary = await Promise.all(teamUsers.map(async u => {
      const entries = await TimeEntry.find({ user_id: u._id, date: { $gte: startStr, $lte: endStr } }).lean()
      return { user: u, total_hours: entries.reduce((s,e) => s+e.hours, 0), billable_hours: entries.filter(e=>e.billable).reduce((s,e)=>s+e.hours,0), entries: entries.length }
    }))
    res.json(summary)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

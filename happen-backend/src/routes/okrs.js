import express from 'express'
import OKR from '../db/models/OKR.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/okrs  — my OKRs + my reports' OKRs (if manager/team_lead)
router.get('/', verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    let filter = { $or: [{ owner_id: me._id }, { manager_id: me._id }] }
    const okrs = await OKR.find(filter)
      .populate('owner_id', 'first_name last_name avatar role team_id')
      .populate('manager_id', 'first_name last_name avatar')
      .populate('check_ins.author_id', 'first_name last_name avatar')
      .sort({ createdAt: -1 }).lean()
    res.json(okrs.map(o => ({ ...o, id: o._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// POST /api/okrs  — create OKR
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, quarter, key_results, manager_id } = req.body
    if (!title || !quarter) return res.status(400).json({ error: 'title and quarter required' })
    const okr = await OKR.create({
      owner_id: req.user.id,
      manager_id: manager_id || null,
      title, quarter,
      key_results: (key_results || []).map(kr => ({ title: kr.title, target: kr.target || 100, unit: kr.unit || '%' })),
    })
    if (manager_id) {
      const me = await User.findById(req.user.id, 'first_name last_name').lean()
      await Notification.create({ user_id: manager_id, title: '🎯 New OKR Shared', message: `${me.first_name} ${me.last_name} shared an OKR with you: "${title}"`, type: 'info', link: '/performance' })
    }
    const populated = await OKR.findById(okr._id).populate('owner_id','first_name last_name avatar').populate('manager_id','first_name last_name').lean()
    res.json({ ...populated, id: populated._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/okrs/:id/key-results/:krId  — update KR progress
router.patch('/:id/key-results/:krId', verifyToken, async (req, res) => {
  try {
    const { current, done } = req.body
    const okr = await OKR.findOne({ _id: req.params.id, owner_id: req.user.id })
    if (!okr) return res.status(404).json({ error: 'Not found' })
    const kr = okr.key_results.id(req.params.krId)
    if (!kr) return res.status(404).json({ error: 'Key result not found' })
    if (current !== undefined) kr.current = current
    if (done !== undefined) kr.done = done
    // Auto-update status
    const allDone = okr.key_results.every(k => k.done)
    const avgPct = okr.key_results.reduce((s, k) => s + (k.target ? (k.current / k.target) * 100 : 0), 0) / (okr.key_results.length || 1)
    okr.status = allDone ? 'completed' : avgPct >= 70 ? 'on_track' : avgPct >= 40 ? 'at_risk' : 'off_track'
    await okr.save()
    res.json({ ...okr.toObject(), id: okr._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// POST /api/okrs/:id/check-ins  — add weekly check-in
router.post('/:id/check-ins', verifyToken, async (req, res) => {
  try {
    const { note, mood } = req.body
    if (!note?.trim()) return res.status(400).json({ error: 'note required' })
    const okr = await OKR.findById(req.params.id)
    if (!okr) return res.status(404).json({ error: 'Not found' })
    const canAdd = okr.owner_id.toString() === req.user.id || okr.manager_id?.toString() === req.user.id
    if (!canAdd) return res.status(403).json({ error: 'Forbidden' })
    okr.check_ins.push({ author_id: req.user.id, note: note.trim(), mood: mood || 'good' })
    await okr.save()
    const populated = await OKR.findById(okr._id).populate('check_ins.author_id','first_name last_name avatar').lean()
    res.json({ ...populated, id: populated._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

import express from 'express'
import Message from '../db/models/Message.js'
import User from '../db/models/User.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// Canonical conversation ID — always smaller id first
const convId = (a, b) => [a.toString(), b.toString()].sort().join('_')

// GET /api/messages/contacts — filtered by role-based messaging rules
router.get('/contacts', verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    if (!me) return res.status(404).json({ error: 'User not found' })

    let allowedUsers = []

    if (['accounting', 'hr', 'manager', 'admin'].includes(me.role)) {
      // Can message everyone
      allowedUsers = await User.find(
        { _id: { $ne: me._id }, is_active: true },
        'first_name last_name email avatar role team_id'
      ).populate('team_id', 'name').lean()

    } else if (me.role === 'employee') {
      // Own team members + own team lead + accounting + HR + manager
      const [teamMembers, privileged] = await Promise.all([
        // Same team (includes team lead)
        me.team_id
          ? User.find({ team_id: me.team_id, _id: { $ne: me._id }, is_active: true }, 'first_name last_name email avatar role team_id').populate('team_id', 'name').lean()
          : [],
        // Accounting + HR + Manager (regardless of team)
        User.find({ role: { $in: ['accounting', 'hr', 'manager'] }, is_active: true }, 'first_name last_name email avatar role team_id').populate('team_id', 'name').lean(),
      ])
      // Merge, deduplicate by _id
      const seen = new Set()
      for (const u of [...teamMembers, ...privileged]) {
        const id = u._id.toString()
        if (!seen.has(id)) { seen.add(id); allowedUsers.push(u) }
      }

    } else if (me.role === 'team_lead') {
      // Own team members + other team leads + accounting + HR + manager
      const [teamMembers, others] = await Promise.all([
        me.team_id
          ? User.find({ team_id: me.team_id, _id: { $ne: me._id }, is_active: true }, 'first_name last_name email avatar role team_id').populate('team_id', 'name').lean()
          : [],
        User.find({
          role: { $in: ['team_lead', 'accounting', 'hr', 'manager'] },
          _id: { $ne: me._id },
          is_active: true,
        }, 'first_name last_name email avatar role team_id').populate('team_id', 'name').lean(),
      ])
      const seen = new Set()
      for (const u of [...teamMembers, ...others]) {
        const id = u._id.toString()
        if (!seen.has(id)) { seen.add(id); allowedUsers.push(u) }
      }
    }

    // For each contact, get last message + unread count
    const contacts = await Promise.all(allowedUsers.map(async (u) => {
      const cid = convId(req.user.id, u._id)
      const [last, unread] = await Promise.all([
        Message.findOne({ conversation_id: cid }).sort({ createdAt: -1 }).lean(),
        Message.countDocuments({ conversation_id: cid, receiver_id: req.user.id, is_read: false }),
      ])
      return {
        ...u,
        id: u._id,
        team_name: u.team_id?.name || '',
        last_message: last ? { text: last.text, createdAt: last.createdAt, sender_id: last.sender_id } : null,
        unread_count: unread,
      }
    }))

    // Sort: conversations with messages first, then alphabetically
    contacts.sort((a, b) => {
      if (a.last_message && !b.last_message) return -1
      if (!a.last_message && b.last_message) return 1
      if (a.last_message && b.last_message) {
        return new Date(b.last_message.createdAt) - new Date(a.last_message.createdAt)
      }
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    })

    res.json(contacts)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// GET /api/messages/:userId — conversation with a specific user
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const cid = convId(req.user.id, req.params.userId)
    const messages = await Message.find({ conversation_id: cid })
      .sort({ createdAt: 1 })
      .lean()

    // Mark all as read
    await Message.updateMany(
      { conversation_id: cid, receiver_id: req.user.id, is_read: false },
      { is_read: true }
    )

    res.json(messages.map(m => ({ ...m, id: m._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// POST /api/messages/:userId — send a message (REST fallback, socket is primary)
router.post('/:userId', verifyToken, async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'text required' })

    const cid = convId(req.user.id, req.params.userId)
    const msg = await Message.create({
      conversation_id: cid,
      sender_id:   req.user.id,
      receiver_id: req.params.userId,
      text: text.trim(),
    })
    res.json({ ...msg.toObject(), id: msg._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

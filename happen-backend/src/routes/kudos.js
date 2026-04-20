import express from 'express'
import Kudos from '../db/models/Kudos.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

const VALUE_LABELS = { teamwork:'Teamwork 🤝', innovation:'Innovation 💡', leadership:'Leadership 🌟', helpfulness:'Helpfulness 🙌', excellence:'Excellence 🏆', above_beyond:'Above & Beyond 🚀' }

router.get('/', verifyToken, async (req, res) => {
  try {
    const kudos = await Kudos.find()
      .populate('from_id','first_name last_name avatar role')
      .populate('to_id','first_name last_name avatar role')
      .sort({ createdAt: -1 }).limit(50).lean()
    res.json(kudos.map(k => ({ ...k, id: k._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const { to_id, message, value, is_announcement } = req.body
    if (!to_id || !message?.trim()) return res.status(400).json({ error: 'to_id and message required' })
    if (to_id === req.user.id) return res.status(400).json({ error: 'Cannot give kudos to yourself' })

    const kudos = await Kudos.create({ from_id: req.user.id, to_id, message: message.trim(), value: value || 'excellence', is_announcement: is_announcement || false })

    const me = await User.findById(req.user.id, 'first_name last_name').lean()
    await Notification.create({
      user_id: to_id,
      title: `🏆 You received Kudos!`,
      message: `${me.first_name} ${me.last_name} gave you kudos for ${VALUE_LABELS[value || 'excellence']}: "${message.trim().substring(0, 80)}..."`,
      type: 'success',
      link: '/kudos',
    })

    const populated = await Kudos.findById(kudos._id).populate('from_id','first_name last_name avatar role').populate('to_id','first_name last_name avatar role').lean()
    res.json({ ...populated, id: populated._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/:id/react', verifyToken, async (req, res) => {
  try {
    const { emoji } = req.body
    if (!emoji) return res.status(400).json({ error: 'emoji required' })
    const kudos = await Kudos.findById(req.params.id)
    if (!kudos) return res.status(404).json({ error: 'Not found' })
    // Toggle reaction
    const existing = kudos.reactions.findIndex(r => r.user_id.toString() === req.user.id && r.emoji === emoji)
    if (existing >= 0) kudos.reactions.splice(existing, 1)
    else kudos.reactions.push({ user_id: req.user.id, emoji })
    await kudos.save()
    res.json({ reactions: kudos.reactions })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// Announcements — manager/HR only
router.post('/announce', verifyToken, requireRole('manager','hr','admin'), async (req, res) => {
  try {
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ error: 'message required' })
    const me = await User.findById(req.user.id, 'first_name last_name').lean()
    const announcement = await Kudos.create({ from_id: req.user.id, to_id: req.user.id, message: message.trim(), value: 'excellence', is_announcement: true })
    // Notify everyone
    const everyone = await User.find({ is_active: true, _id: { $ne: req.user.id } }, '_id').lean()
    await Notification.insertMany(everyone.map(u => ({ user_id: u._id, title: '📢 Company Announcement', message: `${me.first_name} ${me.last_name}: ${message.trim().substring(0, 100)}`, type: 'info', link: '/kudos' })))
    const populated = await Kudos.findById(announcement._id).populate('from_id','first_name last_name avatar role').lean()
    res.json({ ...populated, id: populated._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

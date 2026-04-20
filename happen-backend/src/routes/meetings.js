import express from 'express'
import Meeting from '../db/models/Meeting.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// GET /api/meetings — meetings I'm in (organizer or attendee)
router.get('/', verifyToken, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { organizer_id: req.user.id },
        { attendee_ids: req.user.id },
      ],
      status: { $ne: 'cancelled' },
    })
      .populate('organizer_id', 'first_name last_name avatar')
      .populate('attendee_ids', 'first_name last_name avatar role')
      .sort({ start_time: 1 })
      .lean()

    res.json(meetings.map(m => ({ ...m, id: m._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// POST /api/meetings — create a meeting
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, attendee_ids, start_time, end_time, link } = req.body
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'title, start_time, end_time required' })
    }

    const meeting = await Meeting.create({
      title,
      description: description || '',
      organizer_id: req.user.id,
      attendee_ids: attendee_ids || [],
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      link: link || '',
    })

    // Notify all attendees
    const organizer = await User.findById(req.user.id, 'first_name last_name').lean()
    if (attendee_ids?.length) {
      await Notification.insertMany(attendee_ids.map(uid => ({
        user_id: uid,
        title: '📅 New Meeting Scheduled',
        message: `${organizer.first_name} ${organizer.last_name} scheduled "${title}" on ${new Date(start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`,
        type: 'info',
        link: '/messages?tab=meetings',
      })))
    }

    const populated = await Meeting.findById(meeting._id)
      .populate('organizer_id', 'first_name last_name avatar')
      .populate('attendee_ids', 'first_name last_name avatar role')
      .lean()

    res.json({ ...populated, id: populated._id })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/meetings/:id/cancel
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, organizer_id: req.user.id })
    if (!meeting) return res.status(404).json({ error: 'Not found or not your meeting' })
    meeting.status = 'cancelled'
    await meeting.save()
    res.json({ message: 'Cancelled' })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

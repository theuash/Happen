import express from 'express'
import Resource from '../db/models/Resource.js'
import User from '../db/models/User.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const resources = await Resource.find({ is_active: true })
      .populate('bookings.booked_by', 'first_name last_name avatar')
      .sort({ type: 1, name: 1 }).lean()
    res.json(resources.map(r => ({ ...r, id: r._id })))
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/', verifyToken, requireRole('admin','manager','hr'), async (req, res) => {
  try {
    const { name, type, capacity, location } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name required' })
    const r = await Resource.create({ name: name.trim(), type: type || 'room', capacity: capacity || 1, location: location || '' })
    res.json({ ...r.toObject(), id: r._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/:id/book', verifyToken, async (req, res) => {
  try {
    const { title, start_time, end_time, notes } = req.body
    if (!title || !start_time || !end_time) return res.status(400).json({ error: 'title, start_time, end_time required' })
    const start = new Date(start_time), end = new Date(end_time)
    if (end <= start) return res.status(400).json({ error: 'end_time must be after start_time' })

    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    // Conflict check
    const conflict = resource.bookings.some(b => {
      const bs = new Date(b.start_time), be = new Date(b.end_time)
      return start < be && end > bs
    })
    if (conflict) return res.status(409).json({ error: 'This resource is already booked for that time slot' })

    resource.bookings.push({ booked_by: req.user.id, title, start_time: start, end_time: end, notes: notes || '' })
    await resource.save()
    const populated = await Resource.findById(resource._id).populate('bookings.booked_by','first_name last_name avatar').lean()
    res.json({ ...populated, id: populated._id })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/bookings/:bookingId', verifyToken, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Not found' })
    const booking = resource.bookings.id(req.params.bookingId)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.booked_by.toString() !== req.user.id && !['admin','manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    booking.deleteOne()
    await resource.save()
    res.json({ message: 'Booking cancelled' })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

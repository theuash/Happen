// Re-seeds only leave requests — no notifications
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import Team from './models/Team.js'
import User from './models/User.js'
import LeaveRequest from './models/LeaveRequest.js'
import Notification from './models/Notification.js'

async function seedLeaves() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected')

  await LeaveRequest.deleteMany({})
  await Notification.deleteMany({})
  console.log('Cleared leave requests & notifications')

  const today = new Date()
  const fmt   = (d) => d.toISOString().split('T')[0]
  const add   = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

  // Fetch users by email
  const get = async (email) => User.findOne({ email }).lean()

  const manager = await get('michael@creativesolutions.com')
  const hrUsers = await User.find({ role: 'hr' }, '_id').lean()

  const notifyHRManager = async (title, message) => {
    const ids = [...hrUsers.map(h => h._id), manager._id]
    await Notification.insertMany(ids.map(uid => ({ user_id: uid, title, message, type: 'info' })))
  }

  const leaveDefs = [
    // ── Queued (Design 65%, Dev 89%, Client Success 70%)
    { email: 'priya@creativesolutions.com',    type: 'annual', start: add(today,8),  end: add(today,10), status: 'queued', queue_position: 1 },
    { email: 'james.wu@creativesolutions.com', type: 'annual', start: add(today,10), end: add(today,12), status: 'queued', queue_position: 2 },
    { email: 'elena@creativesolutions.com',    type: 'annual', start: add(today,14), end: add(today,16), status: 'queued', queue_position: 3 },
    { email: 'andre@creativesolutions.com',    type: 'annual', start: add(today,9),  end: add(today,11), status: 'queued', queue_position: 1 },
    { email: 'david.o@creativesolutions.com',  type: 'annual', start: add(today,12), end: add(today,14), status: 'queued', queue_position: 2 },
    { email: 'sofia@creativesolutions.com',    type: 'annual', start: add(today,8),  end: add(today,9),  status: 'queued', queue_position: 1 },
    // ── Approved (Marketing 45% — auto-approved)
    { email: 'yuki@creativesolutions.com',     type: 'annual', start: add(today,7),  end: add(today,9),  status: 'approved' },
    { email: 'nadia@creativesolutions.com',    type: 'annual', start: add(today,9),  end: add(today,11), status: 'approved' },
    { email: 'ryan@creativesolutions.com',     type: 'annual', start: add(today,14), end: add(today,16), status: 'approved' },
    // ── Sick (today)
    { email: 'omar@creativesolutions.com',     type: 'sick',   start: today, end: today, status: 'approved' },
    { email: 'carlos@creativesolutions.com',   type: 'sick',   start: today, end: today, status: 'approved' },
    // ── Wellness half-day
    { email: 'wei@creativesolutions.com',      type: 'wellness', start: today, end: today, status: 'approved', half_day: true, am_pm: 'AM' },
    { email: 'emma@creativesolutions.com',     type: 'wellness', start: today, end: today, status: 'approved', half_day: true, am_pm: 'PM' },
    // ── Emergency
    { email: 'lena@creativesolutions.com',     type: 'emergency', start: null, end: null, status: 'emergency', proof_submitted: false },
    { email: 'ahmed@creativesolutions.com',    type: 'emergency', start: null, end: null, status: 'emergency', proof_submitted: true },
    // ── Denied
    { email: 'david.o@creativesolutions.com',  type: 'annual', start: add(today,-5), end: add(today,-3), status: 'denied', override_reason: 'Critical sprint in progress' },
    // ── Past approved (history)
    { email: 'james.wu@creativesolutions.com', type: 'annual', start: add(today,-20), end: add(today,-18), status: 'approved' },
    { email: 'priya@creativesolutions.com',    type: 'sick',   start: add(today,-10), end: add(today,-10), status: 'approved' },
    { email: 'marcus@creativesolutions.com',   type: 'annual', start: add(today,-15), end: add(today,-13), status: 'approved' },
    { email: 'jessica@creativesolutions.com',  type: 'annual', start: add(today,-8),  end: add(today,-6),  status: 'approved' },
  ]

  for (const l of leaveDefs) {
    const u = await get(l.email)
    if (!u) { console.warn('User not found:', l.email); continue }

    const days = l.start && l.end
      ? Math.ceil((l.end - l.start) / 86400000) + 1
      : 1

    await LeaveRequest.create({
      user_id:        u._id,
      start_date:     l.start ? fmt(l.start) : null,
      end_date:       l.end   ? fmt(l.end)   : null,
      days_count:     l.half_day ? 0.5 : days,
      type:           l.type,
      half_day:       l.half_day || false,
      am_pm:          l.am_pm || 'AM',
      status:         l.status,
      queue_position: l.queue_position || null,
      proof_submitted:l.proof_submitted || false,
      override_reason:l.override_reason || null,
      override_by:    l.override_reason ? manager._id : null,
      decision_date:  ['approved','denied','emergency'].includes(l.status) ? new Date() : null,
      proof_deadline: l.type === 'emergency' ? new Date(Date.now() + 24*60*60*1000) : null,
    })

    // Only notify HR + manager for new queued requests
    if (l.status === 'queued') {
      await notifyHRManager(
        'New Leave Request in Queue',
        `${u.first_name} ${u.last_name} requested annual leave ${fmt(l.start)} → ${fmt(l.end)} (queue #${l.queue_position}).`
      )
    }
    if (l.type === 'emergency') {
      const ids = [...hrUsers.map(h => h._id), manager._id]
      await Notification.insertMany(ids.map(uid => ({
        user_id: uid,
        title: '🚨 Emergency Leave',
        message: `${u.first_name} ${u.last_name} has taken emergency leave. Proof required within 24 hours.`,
        type: 'error',
      })))
    }
  }

  const lrCount = await LeaveRequest.countDocuments()
  const nCount  = await Notification.countDocuments()
  console.log(`✅ Seeded ${lrCount} leave requests, ${nCount} notifications`)
  await mongoose.disconnect()
}

seedLeaves().catch(e => { console.error(e); process.exit(1) })

import express from 'express'
import User from '../db/models/User.js'
import LeaveRequest from '../db/models/LeaveRequest.js'
import Notification from '../db/models/Notification.js'
import Team from '../db/models/Team.js'
import Project from '../db/models/Project.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const WELLNESS_TOTAL = 2

// ── helper: get today's pending tasks for a user ──────────────────────────────
async function getTodayPendingTasks(userId, teamId) {
  const today = new Date().toISOString().split('T')[0]
  const projects = await Project.find({ team_id: teamId, status: 'active' }).lean()

  const pending = []
  for (const p of projects) {
    for (const t of p.tasks) {
      if (t.due_date !== today) continue
      const isAssigned = t.assigned_to.some(uid => uid.toString() === userId.toString())
      if (!isAssigned) continue
      // Not yet completed/verified by this user
      const done = t.completed_by.some(c =>
        c.user_id.toString() === userId.toString() &&
        ['verified', 'auto_archived', 'pending_review'].includes(c.verification_status)
      )
      if (!done) {
        pending.push({ project_id: p._id, project_name: p.name, task_id: t._id, task_title: t.title, priority: t.priority, due_date: t.due_date })
      }
    }
  }
  return pending
}

// ── helper: push due dates forward by 1 day ───────────────────────────────────
async function pushTasksDueDate(taskRefs) {
  for (const ref of taskRefs) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const newDate = tomorrow.toISOString().split('T')[0]

    await Project.updateOne(
      { _id: ref.project_id, 'tasks._id': ref.task_id },
      { $set: { 'tasks.$.due_date': newDate } }
    )
  }
}

// ── GET /api/wellness/balance ─────────────────────────────────────────────────
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })
    const used = user.wellness_days_used || 0
    res.json({ used, total: WELLNESS_TOTAL, remaining: WELLNESS_TOTAL - used })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/wellness/check ───────────────────────────────────────────────────
// Returns today's pending tasks that will be pushed if wellness day is taken
router.get('/check', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const used = user.wellness_days_used || 0
    if (used >= WELLNESS_TOTAL) {
      return res.json({ can_take: false, reason: 'no_balance', tasks_to_push: [] })
    }

    if (!user.team_id) {
      return res.json({ can_take: true, tasks_to_push: [] })
    }

    const pendingTasks = await getTodayPendingTasks(req.user.id, user.team_id)

    res.json({
      can_take: true,
      tasks_to_push: pendingTasks,
      // Always allowed — tasks just get pushed forward
      message: pendingTasks.length > 0
        ? `${pendingTasks.length} task(s) due today will be automatically moved to tomorrow.`
        : 'No tasks due today. You\'re free to take a wellness day!',
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/wellness/request ────────────────────────────────────────────────
// Always approved. If tasks are due today → push them to tomorrow automatically.
router.post('/request', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const used = user.wellness_days_used || 0
    if (used >= WELLNESS_TOTAL) {
      return res.status(400).json({ error: `You have used all ${WELLNESS_TOTAL} wellness days for this year.` })
    }

    // Find today's pending tasks
    const pendingTasks = user.team_id
      ? await getTodayPendingTasks(req.user.id, user.team_id)
      : []

    // Push their due dates to tomorrow
    if (pendingTasks.length > 0) {
      await pushTasksDueDate(pendingTasks)
    }

    const today = new Date().toISOString().split('T')[0]

    // Create approved leave request
    const lr = await LeaveRequest.create({
      user_id: user._id,
      type: 'wellness',
      start_date: today,
      end_date: today,
      days_count: 1,
      status: 'approved',
      decision_date: new Date(),
    })

    // Increment wellness counter
    await User.findByIdAndUpdate(user._id, { $inc: { wellness_days_used: 1 } })

    // Notify team lead + manager
    const [team, manager] = await Promise.all([
      user.team_id ? Team.findById(user.team_id).lean() : null,
      User.findOne({ role: 'manager' }, '_id').lean(),
    ])
    const notifyIds = [team?.team_lead_id, manager?._id].filter(Boolean)

    if (notifyIds.length) {
      const taskNote = pendingTasks.length > 0
        ? ` ${pendingTasks.length} task(s) due today have been automatically moved to tomorrow: ${pendingTasks.map(t => `"${t.task_title}"`).join(', ')}.`
        : ''

      await Notification.insertMany(notifyIds.map(id => ({
        user_id: id,
        title: '🌿 Wellness Day Taken',
        message: `${user.first_name} ${user.last_name} has taken a wellness day today.${taskNote}`,
        type: 'info',
        link: '/current-leaves',
      })))
    }

    const newUsed = used + 1
    const pushedCount = pendingTasks.length

    res.json({
      request: { ...lr.toObject(), id: lr._id },
      status: 'approved',
      tasks_pushed: pushedCount,
      pushed_tasks: pendingTasks.map(t => ({ title: t.task_title, project: t.project_name })),
      message: pushedCount > 0
        ? `Wellness day approved! ${pushedCount} task(s) due today have been moved to tomorrow. You have ${WELLNESS_TOTAL - newUsed} wellness day(s) remaining.`
        : `Wellness day approved! You have ${WELLNESS_TOTAL - newUsed} wellness day(s) remaining.`,
      used: newUsed,
      remaining: WELLNESS_TOTAL - newUsed,
      total: WELLNESS_TOTAL,
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

export default router

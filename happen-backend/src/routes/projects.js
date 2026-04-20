import express from 'express'
import Project from '../db/models/Project.js'
import Team from '../db/models/Team.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import AuditLog from '../db/models/AuditLog.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roleGuard.js'

const router = express.Router()

// ── Auto-archive threshold: 48 hours ─────────────────────────────────────────
const AUTO_ARCHIVE_MS = 48 * 60 * 60 * 1000

// ── syncWorkload: only VERIFIED completions count ────────────────────────────
// This is the core integrity rule — pending_review completions are "phantom"
export async function syncWorkload(teamId) {
  const projects = await Project.find({ team_id: teamId, status: 'active' }).lean()
  if (!projects.length) {
    await Team.findByIdAndUpdate(teamId, { workload_current: 0 })
    return 0
  }

  let total = 0, done = 0
  for (const p of projects) {
    for (const t of p.tasks) {
      total++
      // Task is "done" only if ALL assigned members have a VERIFIED or AUTO_ARCHIVED completion
      const allVerified = t.assigned_to.length > 0 &&
        t.assigned_to.every(uid =>
          t.completed_by.some(c =>
            c.user_id.toString() === uid.toString() &&
            ['verified', 'auto_archived'].includes(c.verification_status)
          )
        )
      if (allVerified) done++
    }
  }

  const workload = total === 0 ? 0 : Math.round(((total - done) / total) * 100)
  await Team.findByIdAndUpdate(teamId, { workload_current: workload })
  return workload
}

// ── Auto-archive stale pending_review completions ────────────────────────────
async function autoArchiveStale() {
  const cutoff = new Date(Date.now() - AUTO_ARCHIVE_MS)
  const projects = await Project.find({ 'tasks.completed_by.verification_status': 'pending_review' })

  let archived = 0
  for (const project of projects) {
    let changed = false
    for (const task of project.tasks) {
      for (const completion of task.completed_by) {
        if (
          completion.verification_status === 'pending_review' &&
          new Date(completion.completed_at) < cutoff
        ) {
          completion.verification_status = 'auto_archived'
          completion.verified_at = new Date()
          changed = true
          archived++

          // Notify the employee
          await Notification.create({
            user_id: completion.user_id,
            title: '✅ Task Auto-Verified',
            message: `Your completion of "${task.title}" was auto-verified after 48 hours with no review. It now counts toward your progress.`,
            type: 'info',
            link: '/tasks',
          })
        }
      }
    }
    if (changed) {
      await project.save()
      await syncWorkload(project.team_id)
    }
  }
  return archived
}

// ── getEmployeeTaskStats (used by leave system) ───────────────────────────────
export async function getEmployeeTaskStats(userId, teamId) {
  // Run auto-archive first to ensure stale tasks are counted
  await autoArchiveStale()

  const today = new Date().toISOString().split('T')[0]
  const projects = await Project.find({ team_id: teamId, status: 'active' }).lean()

  let totalAssigned = 0, completedByUser = 0, overdueHighPriority = 0
  let todayTasksDue = 0, todayTasksDoneByUser = 0

  for (const p of projects) {
    for (const t of p.tasks) {
      const isAssigned = t.assigned_to.some(uid => uid.toString() === userId.toString())
      if (!isAssigned) continue
      totalAssigned++

      // Only VERIFIED completions count as "done"
      const verifiedCompletion = t.completed_by.find(c =>
        c.user_id.toString() === userId.toString() &&
        ['verified', 'auto_archived'].includes(c.verification_status)
      )
      if (verifiedCompletion) completedByUser++

      if (!verifiedCompletion && t.due_date && t.due_date < today && t.priority === 'high') overdueHighPriority++
      if (t.due_date === today) {
        todayTasksDue++
        if (verifiedCompletion) todayTasksDoneByUser++
      }
    }
  }

  const completionRate = totalAssigned === 0 ? 100 : Math.round((completedByUser / totalAssigned) * 100)
  const allTodayDone   = todayTasksDue === 0 || todayTasksDoneByUser === todayTasksDue
  const isInsignificant = totalAssigned >= 3 && completionRate < 30

  return { totalAssigned, completedByUser, completionRate, overdueHighPriority, todayTasksDue, todayTasksDoneByUser, allTodayDone, isInsignificant }
}

// ── GET /api/projects/my-task-stats ──────────────────────────────────────────
router.get('/my-task-stats', verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    if (!me.team_id) return res.json({ totalAssigned: 0, completionRate: 100, allTodayDone: true, overdueHighPriority: 0, isInsignificant: false })
    const stats = await getEmployeeTaskStats(req.user.id, me.team_id)
    res.json(stats)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/projects/insignificant-employees ─────────────────────────────────
router.get('/insignificant-employees', verifyToken, requireRole('manager', 'hr', 'admin'), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee', is_active: true }).populate('team_id', 'name').lean()
    const flagged = []
    for (const emp of employees) {
      if (!emp.team_id) continue
      const stats = await getEmployeeTaskStats(emp._id, emp.team_id)
      if (stats.isInsignificant) {
        flagged.push({ id: emp._id, first_name: emp.first_name, last_name: emp.last_name, email: emp.email, avatar: emp.avatar, team_name: emp.team_id?.name, ...stats })
      }
    }
    flagged.sort((a, b) => a.completionRate - b.completionRate)
    res.json(flagged)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/projects/pending-verifications ───────────────────────────────────
// Team lead sees all completions awaiting their review
router.get('/pending-verifications', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    const filter = ['manager', 'hr', 'admin'].includes(me.role) ? {} : { team_lead_id: me._id }
    const projects = await Project.find(filter)
      .populate('tasks.assigned_to', 'first_name last_name avatar')
      .populate('tasks.completed_by.user_id', 'first_name last_name avatar')
      .lean()

    const pending = []
    for (const p of projects) {
      for (const t of p.tasks) {
        for (const c of t.completed_by) {
          if (c.verification_status === 'pending_review') {
            const hoursAgo = Math.floor((Date.now() - new Date(c.completed_at)) / 3600000)
            const autoArchiveIn = Math.max(0, 48 - hoursAgo)
            pending.push({
              project_id:   p._id,
              project_name: p.name,
              task_id:      t._id,
              task_title:   t.title,
              task_priority:t.priority,
              completion_id:c._id,
              employee:     c.user_id,
              message:      c.message,
              completed_at: c.completed_at,
              resubmit_count: c.resubmit_count || 0,
              hours_ago:    hoursAgo,
              auto_archive_in_hours: autoArchiveIn,
            })
          }
        }
      }
    }

    // Sort: oldest first (most urgent)
    pending.sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    res.json(pending)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── PATCH /api/projects/:id/tasks/:taskId/completions/:completionId/verify ────
// Team lead verifies a completion → counts toward workload
router.patch('/:id/tasks/:taskId/completions/:completionId/verify', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    // Only the team lead of this project (or manager/hr/admin) can verify
    const me = await User.findById(req.user.id).lean()
    const isLead = project.team_lead_id.toString() === req.user.id
    if (!isLead && !['manager', 'hr', 'admin'].includes(me.role)) {
      return res.status(403).json({ error: 'Only the team lead can verify tasks' })
    }

    const task = project.tasks.id(req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const completion = task.completed_by.id(req.params.completionId)
    if (!completion) return res.status(404).json({ error: 'Completion not found' })
    if (completion.verification_status !== 'pending_review') {
      return res.status(400).json({ error: `Cannot verify — status is already "${completion.verification_status}"` })
    }

    completion.verification_status = 'verified'
    completion.verified_by = req.user.id
    completion.verified_at = new Date()

    await project.save()
    const newWorkload = await syncWorkload(project.team_id)

    // Notify employee
    const lead = await User.findById(req.user.id, 'first_name last_name').lean()
    await Notification.create({
      user_id: completion.user_id,
      title: '✅ Task Verified!',
      message: `${lead.first_name} ${lead.last_name} verified your completion of "${task.title}". It now counts toward your progress and team workload.`,
      type: 'success',
      link: '/tasks',
    })

    await AuditLog.create({ user_id: req.user.id, action: 'task.verified', details: `Verified task "${task.title}" in project "${project.name}"`, ip_address: req.ip })

    res.json({ message: 'Task verified', workload: newWorkload })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── PATCH /api/projects/:id/tasks/:taskId/completions/:completionId/send-back ─
// Team lead sends back with feedback — employee must resubmit
router.patch('/:id/tasks/:taskId/completions/:completionId/send-back', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), async (req, res) => {
  try {
    const { feedback } = req.body
    if (!feedback?.trim()) return res.status(400).json({ error: 'Feedback is required when sending back' })

    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const me = await User.findById(req.user.id).lean()
    const isLead = project.team_lead_id.toString() === req.user.id
    if (!isLead && !['manager', 'hr', 'admin'].includes(me.role)) {
      return res.status(403).json({ error: 'Only the team lead can send back tasks' })
    }

    const task = project.tasks.id(req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const completion = task.completed_by.id(req.params.completionId)
    if (!completion) return res.status(404).json({ error: 'Completion not found' })
    if (completion.verification_status !== 'pending_review') {
      return res.status(400).json({ error: `Cannot send back — status is "${completion.verification_status}"` })
    }

    completion.verification_status = 'sent_back'
    completion.feedback = feedback.trim()
    completion.verified_by = req.user.id
    completion.verified_at = new Date()

    await project.save()

    // Notify employee with feedback
    const lead = await User.findById(req.user.id, 'first_name last_name').lean()
    await Notification.create({
      user_id: completion.user_id,
      title: '↩️ Task Sent Back',
      message: `${lead.first_name} ${lead.last_name} sent back your completion of "${task.title}". Feedback: "${feedback.trim()}"`,
      type: 'warning',
      link: '/tasks',
    })

    res.json({ message: 'Sent back with feedback' })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── PATCH /api/projects/:id/tasks/:taskId/resubmit ────────────────────────────
// Employee resubmits after a send-back
router.patch('/:id/tasks/:taskId/resubmit', verifyToken, async (req, res) => {
  try {
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ error: 'Completion message required' })

    const wordCount = message.trim().split(/\s+/).length
    if (wordCount < 50) {
      return res.status(400).json({ error: `Message must be at least 50 words. You wrote ${wordCount}.`, word_count: wordCount })
    }

    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const task = project.tasks.id(req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    // Find the sent_back completion for this user
    const sentBack = task.completed_by.find(c =>
      c.user_id.toString() === req.user.id &&
      c.verification_status === 'sent_back'
    )
    if (!sentBack) return res.status(400).json({ error: 'No sent-back completion found to resubmit' })

    sentBack.message = message.trim()
    sentBack.verification_status = 'pending_review'
    sentBack.completed_at = new Date()
    sentBack.resubmit_count = (sentBack.resubmit_count || 0) + 1
    sentBack.feedback = null
    sentBack.verified_by = null
    sentBack.verified_at = null

    await project.save()

    // Notify team lead
    const employee = await User.findById(req.user.id, 'first_name last_name').lean()
    await Notification.create({
      user_id: project.team_lead_id,
      title: '🔄 Task Resubmitted',
      message: `${employee.first_name} ${employee.last_name} resubmitted their completion of "${task.title}" (attempt #${sentBack.resubmit_count + 1}).`,
      type: 'info',
      link: '/projects',
    })

    res.json({ message: 'Resubmitted for review' })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/projects ─────────────────────────────────────────────────────────
router.get('/', verifyToken, requireRole('team_lead', 'manager', 'hr', 'admin'), async (req, res) => {
  try {
    // Run auto-archive on every fetch
    await autoArchiveStale()

    const me = await User.findById(req.user.id).lean()
    const filter = ['manager', 'hr', 'admin'].includes(me.role) ? {} : { team_lead_id: me._id }

    const projects = await Project.find(filter)
      .populate('team_id', 'name workload_current')
      .populate('team_lead_id', 'first_name last_name')
      .populate('tasks.assigned_to', 'first_name last_name avatar role')
      .populate('tasks.completed_by.user_id', 'first_name last_name avatar')
      .populate('tasks.completed_by.verified_by', 'first_name last_name')
      .sort({ createdAt: -1 })
      .lean()

    res.json(projects.map(p => ({ ...p, id: p._id })))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/projects ────────────────────────────────────────────────────────
router.post('/', verifyToken, requireRole('team_lead'), async (req, res) => {
  try {
    const { name, description, tasks } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Project name required' })

    const me = await User.findById(req.user.id).lean()
    if (!me.team_id) return res.status(400).json({ error: 'You are not assigned to a team' })

    const members = await User.find({ team_id: me.team_id, role: 'employee' }, '_id').lean()
    const memberIds = members.map(m => m._id)

    const project = await Project.create({
      name: name.trim(), description: description || '',
      team_id: me.team_id, team_lead_id: me._id,
      tasks: (tasks || []).map(t => ({
        title: t.title, description: t.description || '',
        assigned_to: t.assigned_to?.length ? t.assigned_to : memberIds,
        due_date: t.due_date || null, priority: t.priority || 'medium',
      })),
    })

    await syncWorkload(me.team_id)
    const populated = await Project.findById(project._id).populate('tasks.assigned_to', 'first_name last_name avatar role').lean()
    res.json({ ...populated, id: populated._id })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/projects/:id/tasks ──────────────────────────────────────────────
router.post('/:id/tasks', verifyToken, requireRole('team_lead'), async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Task title required' })

    const me = await User.findById(req.user.id).lean()
    const members = await User.find({ team_id: me.team_id, role: 'employee' }, '_id').lean()
    const memberIds = members.map(m => m._id)

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, team_lead_id: req.user.id },
      { $push: { tasks: { title: title.trim(), description: description || '', assigned_to: assigned_to?.length ? assigned_to : memberIds, due_date: due_date || null, priority: priority || 'medium' } } },
      { new: true }
    ).populate('tasks.assigned_to', 'first_name last_name avatar role')
     .populate('tasks.completed_by.user_id', 'first_name last_name avatar')

    if (!project) return res.status(404).json({ error: 'Project not found' })
    await syncWorkload(project.team_id)
    res.json({ ...project.toObject(), id: project._id })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── PATCH /api/projects/:id/tasks/:taskId/complete ────────────────────────────
// Employee submits completion → goes to pending_review (NOT counted yet)
router.patch('/:id/tasks/:taskId/complete', verifyToken, async (req, res) => {
  try {
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ error: 'Completion message required' })

    const wordCount = message.trim().split(/\s+/).length
    if (wordCount < 50) {
      return res.status(400).json({ error: `Completion message must be at least 50 words. You wrote ${wordCount}.`, word_count: wordCount })
    }

    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const task = project.tasks.id(req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const isAssigned = task.assigned_to.some(uid => uid.toString() === req.user.id)
    if (!isAssigned) return res.status(403).json({ error: 'You are not assigned to this task' })

    // Check no active completion (pending or verified) — allow resubmit path separately
    const activeCompletion = task.completed_by.find(c =>
      c.user_id.toString() === req.user.id &&
      ['pending_review', 'verified', 'auto_archived'].includes(c.verification_status)
    )
    if (activeCompletion) {
      return res.status(400).json({ error: activeCompletion.verification_status === 'pending_review' ? 'Your completion is already awaiting review' : 'You already have a verified completion for this task' })
    }

    task.completed_by.push({
      user_id: req.user.id,
      message: message.trim(),
      completed_at: new Date(),
      verification_status: 'pending_review',
    })

    await project.save()
    // NOTE: workload does NOT change yet — only after verification

    // Notify team lead
    const employee = await User.findById(req.user.id, 'first_name last_name').lean()
    await Notification.create({
      user_id: project.team_lead_id,
      title: '📋 Task Awaiting Verification',
      message: `${employee.first_name} ${employee.last_name} completed "${task.title}" and needs your verification. Auto-archives in 48h.`,
      type: 'info',
      link: '/projects',
    })

    const populated = await Project.findById(project._id)
      .populate('tasks.assigned_to', 'first_name last_name avatar role')
      .populate('tasks.completed_by.user_id', 'first_name last_name avatar')
      .lean()

    res.json({ ...populated, id: populated._id, verification_note: 'Your completion is pending team lead verification. It will auto-archive in 48 hours if not reviewed.' })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }) }
})

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
router.delete('/:id', verifyToken, requireRole('team_lead'), async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, team_lead_id: req.user.id })
    if (!project) return res.status(404).json({ error: 'Not found' })
    await syncWorkload(project.team_id)
    res.json({ message: 'Deleted' })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router

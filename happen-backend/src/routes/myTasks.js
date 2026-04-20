import express from 'express'
import Project from '../db/models/Project.js'
import User from '../db/models/User.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).lean()
    if (!me.team_id) return res.json({ tasks: [], stats: { total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 } })

    const today = new Date().toISOString().split('T')[0]
    const projects = await Project.find({ team_id: me.team_id, status: 'active' })
      .populate('tasks.assigned_to', 'first_name last_name avatar')
      .populate('tasks.completed_by.user_id', 'first_name last_name')
      .populate('tasks.completed_by.verified_by', 'first_name last_name')
      .lean()

    const myTasks = []

    for (const project of projects) {
      for (const task of project.tasks) {
        const isAssigned = task.assigned_to.some(u => u._id.toString() === req.user.id)
        if (!isAssigned) continue

        // Find MY completion entry (any status)
        const myCompletion = task.completed_by.find(c =>
          c.user_id?._id?.toString() === req.user.id || c.user_id?.toString() === req.user.id
        )

        const verStatus = myCompletion?.verification_status || null
        // "done" for display = any completion submitted
        const isSubmitted = !!myCompletion
        // "verified" = actually counts toward workload
        const isVerified = verStatus === 'verified' || verStatus === 'auto_archived'
        const isSentBack = verStatus === 'sent_back'
        const isPendingReview = verStatus === 'pending_review'
        const isOverdue = !isSubmitted && task.due_date && task.due_date < today

        myTasks.push({
          task_id:      task._id,
          project_id:   project._id,
          project_name: project.name,
          title:        task.title,
          description:  task.description,
          priority:     task.priority,
          due_date:     task.due_date,
          // Submission state
          is_submitted:       isSubmitted,
          is_verified:        isVerified,
          is_sent_back:       isSentBack,
          is_pending_review:  isPendingReview,
          is_overdue:         isOverdue,
          // Completion details
          completion_id:      myCompletion?._id || null,
          completed_at:       myCompletion?.completed_at || null,
          completion_message: myCompletion?.message || null,
          verification_status:verStatus,
          feedback:           myCompletion?.feedback || null,
          verified_by:        myCompletion?.verified_by || null,
          verified_at:        myCompletion?.verified_at || null,
          resubmit_count:     myCompletion?.resubmit_count || 0,
          // Auto-archive countdown (hours remaining)
          auto_archive_in_hours: isPendingReview
            ? Math.max(0, 48 - Math.floor((Date.now() - new Date(myCompletion.completed_at)) / 3600000))
            : null,
          // Team progress (only verified completions)
          total_assigned:   task.assigned_to.length,
          team_verified:    task.completed_by.filter(c => ['verified','auto_archived'].includes(c.verification_status)).length,
          team_pending:     task.completed_by.filter(c => c.verification_status === 'pending_review').length,
          assigned_members: task.assigned_to.map(u => {
            const comp = task.completed_by.find(c => c.user_id?._id?.toString() === u._id.toString() || c.user_id?.toString() === u._id.toString())
            return {
              id: u._id, first_name: u.first_name, last_name: u.last_name, avatar: u.avatar,
              verification_status: comp?.verification_status || null,
            }
          }),
        })
      }
    }

    myTasks.sort((a, b) => {
      if (a.is_sent_back && !b.is_sent_back) return -1
      if (!a.is_sent_back && b.is_sent_back) return 1
      if (a.is_overdue && !b.is_overdue) return -1
      if (!a.is_overdue && b.is_overdue) return 1
      if (!a.is_submitted && b.is_submitted) return -1
      if (a.is_submitted && !b.is_submitted) return 1
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      return 0
    })

    const total      = myTasks.length
    const verified   = myTasks.filter(t => t.is_verified).length
    const pending    = myTasks.filter(t => !t.is_submitted).length
    const inReview   = myTasks.filter(t => t.is_pending_review).length
    const sentBack   = myTasks.filter(t => t.is_sent_back).length
    const overdue    = myTasks.filter(t => t.is_overdue).length
    const dueToday   = myTasks.filter(t => !t.is_submitted && t.due_date === today).length
    // Completion rate = verified / total (not just submitted)
    const completionRate = total === 0 ? 100 : Math.round((verified / total) * 100)

    res.json({
      tasks: myTasks,
      stats: { total, verified, pending, inReview, sentBack, overdue, dueToday, completionRate },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
